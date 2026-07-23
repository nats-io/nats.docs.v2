---
id: hardening
title: "Hardening"
sidebar_position: 6
description: Lock down the ORDERS cluster — TLS on every link, mounted credentials, and a sandboxed systemd unit
---

# Hardening

The cluster is sized, deployed, configurable, and upgradable. Right now
it's also unsecured. Routes between `n1-east`, `n2-east`, and `n3-east`
run in plaintext, the monitor port responds to any request, and the
`nats-server` process can read and write the whole filesystem.

This page closes those gaps. It puts TLS on every link the cluster
connects over, and it wraps the process in a hardened systemd unit that
removes everything it doesn't need. Both are operator-side controls. The
auth model that issues the credentials (the operator `ACME`, the
accounts, the users) is taught in [Security](/learn/security); here you
*mount* those credentials and *turn on* the transport security around
them.

## TLS on every link

A NATS server connects to more than one kind of peer, and each kind
has its own TLS block. There are three:

- **Client TLS**: the top-level `tls {}` block, securing client
  connections like `order-svc` publishing to `orders.created`.
- **Cluster TLS**: a separate `cluster { tls {} }` block, securing the
  routes between `n1-east`, `n2-east`, and `n3-east`.
- **Gateway TLS**: a `gateway { tls {} }` block, securing supercluster
  links.

These blocks are independent. Turning on TLS for clients leaves the
cluster routes plaintext until you configure the cluster block too.

This per-link split is a common hardening mistake. An operator secures
clients and sees the encrypted client connection, then ships a cluster
whose inter-node Raft traffic, including replicated `ORDERS` data, is
still unencrypted.

Here's a server config that secures both the client link and the cluster
link. Client TLS sits at the top level; cluster TLS sits inside the
`cluster {}` block:

```conf
# nats.conf on n1-east — TLS for clients AND for cluster routes
listen: "0.0.0.0:4222"

# Client-facing TLS
tls {
  cert_file: "/var/lib/nats/certs/server-cert.pem"
  key_file:  "/var/lib/nats/certs/server-key.pem"
  ca_file:   "/var/lib/nats/certs/ca.pem"
  verify:    true
}

cluster {
  name: "east"
  listen: "0.0.0.0:6222"
  routes: [
    "nats://n2-east:6222"
    "nats://n3-east:6222"
  ]
  # Cluster-route TLS — separate from the client block above
  tls {
    cert_file: "/var/lib/nats/certs/server-cert.pem"
    key_file:  "/var/lib/nats/certs/server-key.pem"
    ca_file:   "/var/lib/nats/certs/ca.pem"
    verify:    true
  }
}
```

In the top-level `tls {}` block, `verify: true` is what makes the client
link **mTLS** (mutual TLS): without it the server proves itself to the
client but never checks the client's certificate; with it every client
must present a certificate that chains to `ca_file`. Cluster and gateway
routes work differently — the server forces mutual verification on them
whether or not you set `verify`, because each end acts as both client and
server on the route. So the stray-node protection on `east` holds either
way: a node can't join just by knowing the route address; it must present
a certificate that chains to `ca_file`. Use `verify_and_map: true` on the
client block when you want the client certificate's subject to *be* the
NATS user; the certificate identity mechanism is covered in
[Security → Encryption & TLS](/learn/security/encryption).

The server re-reads `cert_file` and `key_file` when it reloads its
configuration, so rotating certificates is drop-in-new-files plus a
SIGHUP, not a restart. After the reload, new handshakes present the new
certificate while existing connections keep their session. Drop the new
files in place and send the SIGHUP you learned on the
[config management](/learn/deployment/config-management) page:

```bash
# After dropping new cert/key files at the same paths, reload in place.
# Existing connections keep their session; new handshakes pick up the new cert.
systemctl reload nats-server
```

The full set of TLS keys (cipher suites, curve preferences, and
`pinned_certs` for certificate pinning) is documented in
[Reference → TLS](/reference/config/tls). We use only `cert_file`,
`key_file`, `ca_file`, and `verify` here.

## Mount the credentials and verify the link

TLS encrypts the link, and credentials identify the user on it. The `ACME`
operator from the [Security deep dive](/learn/security/operator-mode)
issues a `.creds` file for the `order-svc` user. You don't create it
here; you mount it as a file the server and client can read. On
Kubernetes that file is a Secret; on a host it lives under a path only the
`nats` user can read.

With the CA file and the creds file both available, one publish confirms
the whole hardened path works. The client trusts the CA (so the link
encrypts), presents the `order-svc` credentials (so the server
authenticates the user), and publishes one canonical order to
`orders.created`:

<div class="nats-example" data-type="learn-deployment-hardening-credsConnect" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

The payload is the same Acme order shape you've carried through every
chapter:

```json
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}
```

If the publish succeeds, encryption and authentication are both on. If it
fails at the handshake, TLS is misconfigured; if it fails with an
authorization error, the credentials are wrong or unmounted, and this one
command distinguishes the two cases.

## A hardened systemd unit

TLS protects the cluster from the network, while the systemd unit
protects the host from the cluster by running `nats-server` as an
unprivileged, sandboxed process that can access only what it needs. The
NATS distribution ships a hardened unit (`nats-server-hardened.service`),
which is the second and last concept of the page, and you adapt it rather
than write it from scratch.

The unit does three jobs: it raises the file descriptor limit so a busy
cluster doesn't run out of sockets, it sandboxes the filesystem and
kernel surface so a compromised process can't escape, and it drops every
Linux capability the server doesn't need:

```ini
# /etc/systemd/system/nats-server.service (hardened)
[Service]
ExecStart=/usr/local/bin/nats-server -c /var/lib/nats/nats.conf
ExecReload=/bin/kill -s HUP $MAINPID

# 1. File descriptors: 2 FDs per stream plus gossip and client sockets.
#    A large cluster exhausts the default 1024 quickly.
LimitNOFILE=800000

# 2. Filesystem and kernel sandbox.
ProtectSystem=strict
ReadWritePaths=/var/lib/nats
MemoryDenyWriteExecute=true
ProtectKernelTunables=true
ProtectProc=invisible
PrivateDevices=true

# 3. Drop all capabilities and filter syscalls down to a server profile.
CapabilityBoundingSet=
SystemCallFilter=@system-service ~@privileged ~@resources
```

Two flags matter most for an operator. `LimitNOFILE=800000`
lifts the file descriptor (FD) ceiling far above the default 1024. Each
stream costs roughly two FDs, and inter-node gossip plus client sockets
add many more, so a real `ORDERS` cluster needs the headroom.
`ProtectSystem=strict` mounts the entire filesystem read-only *except*
the paths in `ReadWritePaths`, which is why the TLS certificates and the
JetStream store both live under `/var/lib/nats`, a path the server is
explicitly allowed to write.

The full set of sandboxing directives (`PrivateUsers`,
`RestrictNamespaces`, `ProtectClock`, and the rest) ships in the
distribution's hardened unit; copy that file and adjust only
`ExecStart`, `ReadWritePaths`, and `LimitNOFILE` for your layout. The
server-configuration keys these flags wrap are documented in
[Reference → Configuration](/reference/config).

## Close the monitor port

The server listens on four ports: **4222** for clients, **6222** for
cluster routes, **7222** for gateways, and **8222** for the HTTP monitor.
The first three carry TLS once you configure it. The monitor port does
not: it serves `/varz`, `/healthz`, and the rest in plaintext, and
its `/varz` output leaks the server version, connected-client count, and
memory usage to anyone who can reach it.

On a host, bind it to localhost so only an on-host agent can read it, and
let a firewall handle the rest:

```conf
# nats.conf — monitor reachable only from the host itself
http: "127.0.0.1:8222"
```

Don't do this on the chapter's Kubernetes deployment. The kubelet's
startup, readiness, and liveness probes connect to the pod's IP, not its
loopback, so a `127.0.0.1` bind fails every probe and the pods never go
ready. There, keep the chart's default bind and restrict the port with a
NetworkPolicy instead.

```bash
# Firewall: clients in, cluster routes between nodes only, monitor never.
# Open 4222 to clients, 6222 to the other east nodes, deny 8222 outright.
ufw allow 4222/tcp
ufw allow from 10.0.0.0/24 to any port 6222 proto tcp
ufw deny 8222/tcp
```

What to actually scrape from `/varz` and `/healthz`, and how to read it,
is the monitoring discipline taught in
[Monitoring → Monitoring endpoints](/learn/monitoring/monitoring-endpoints).
At the hardening stage, you only need to make sure the port isn't open to
the world.

## Pitfalls

A few traps affect teams the first time they harden a NATS cluster. Each
one comes from this page's work: the sandboxed systemd unit, and locking
down the ports that TLS now protects.

**`ProtectSystem=strict` blocks writes outside `ReadWritePaths`, not
reads.** The sandbox mounts the filesystem read-only, so reading rotated
certificates from `/etc/nats-certs` on a SIGHUP works fine: an external
process writes the new files, and the server only reads them. What
genuinely fails under `strict` is the server *writing* to a path not
listed — the JetStream `store_dir` (and the pid and ports-file
directories) must sit inside `ReadWritePaths`, or the server can't come
up. Keep `ReadWritePaths` covering the JetStream store; certificates need
only read access, which `strict` already allows.

**A memory cap set below the working set gets the process OOM-killed under
load.** The hardened unit can cap the process with `MemoryMax=` (systemd)
or `GOMEMLIMIT` (the Go runtime). Neither reserves memory at startup:
`max_memory_store` is an accounting limit checked as messages arrive, and
`GOMEMLIMIT` is a soft target that only makes GC more aggressive. The
failure shows up at runtime — set `MemoryMax` below what the node actually
uses (memory-store data plus connection and route buffers plus GC
headroom) and the cgroup OOM-kills the process once usage grows, which
systemd logs as `Main process killed (oom-kill)`. Set `MemoryMax` above
expected use, and `GOMEMLIMIT` somewhat below `MemoryMax` so GC reins
memory in before the hard cap.

```ini
# Cap the process above what it uses at peak, not at the config number.
# With jetstream { max_memory_store: 4Gi }, size for the store plus buffers.
MemoryMax=6G
Environment=GOMEMLIMIT=5500MiB
```

**The monitor port exposed to the internet leaks operational detail.**
A reachable `:8222/varz` hands out the server version, the client count,
and the memory footprint, which is useful information for an attacker
performing reconnaissance. Don't leave `http:`
bound to `0.0.0.0`. Bind it to `127.0.0.1` and let the firewall deny 8222
from everywhere else.

**A firewall blocking cluster port 6222 leaves nodes unable to form
quorum.** Hardening locks ports down, and it's easy to deny 6222 to the
world while forgetting to allow it *between* the east nodes. When that
happens the route handshakes never complete: `n1-east`, `n2-east`, and
`n3-east` each come up alone, can't reach each other, and show as orphans
that never join the `east` cluster. Don't deny 6222 globally. Allow it
explicitly from the cluster subnet, and only then deny it elsewhere:

```bash
# Allow cluster routes between the east nodes; deny 6222 from anywhere else.
ufw allow from 10.0.0.0/24 to any port 6222 proto tcp
ufw deny 6222/tcp
```

Once the ports are open and TLS is on every link, the same authenticated
publish from [Mount the credentials and verify the link](#mount-the-credentials-and-verify-the-link)
confirms the whole hardened path end to end. A successful publish confirms
the client link encrypts and the credentials authenticate. Run that check
from a node on the cluster network to confirm the routes came up. If a
node still shows as an orphan after you allow 6222, its route handshake is
failing on the firewall or on a missing or mismatched cluster certificate.

## Where you are

The `ORDERS` cluster now runs locked down. TLS protects every link: the
client connection for `order-svc` and the cluster routes that replicate
the stream between `n1-east`, `n2-east`, and `n3-east`. The `ACME`
credentials are mounted as files, and one publish confirms auth and
encryption are both on. The process runs under a hardened systemd unit
that raises the FD limit and sandboxes the filesystem, and the monitor
port responds only from localhost.

That completes the runbook. The cluster is sized, deployed on Kubernetes,
configurable without downtime, upgradable in place, and hardened.

## What's next

The last page recaps the whole runbook (size, deploy, configure, upgrade,
harden) and collects every page's pitfalls into a single production
checklist you can run down before you call the cluster ready.

Continue to [Where to go next](/learn/deployment/where-next).

## See also

- [Security → Encryption & TLS](/learn/security/encryption) — the
  certificate-as-identity model behind `verify_and_map`.
- [Security → Operator mode](/learn/security/operator-mode) — how the
  `ACME` operator issues the credentials this page mounts.
- [Monitoring → Monitoring endpoints](/learn/monitoring/monitoring-endpoints)
  — what to scrape from the monitor port once it's locked to localhost.
