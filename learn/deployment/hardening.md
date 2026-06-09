---
id: hardening
title: "6. Hardening"
sidebar_position: 6
description: Lock down the ORDERS cluster — TLS on every link, mounted credentials, and a sandboxed systemd unit
---

# 6. Hardening

The cluster is sized, deployed, configurable, and upgradable. It is also,
right now, wide open. Routes between `n1-east`, `n2-east`, and `n3-east`
run in plaintext, the monitor port answers anyone who asks, and the
`nats-server` process can read and write the whole filesystem.

This page closes those gaps. It does two things: it puts **TLS on every
link** the cluster speaks over, and it wraps the process in a **hardened
systemd unit** that strips away everything it does not need. Both are
operator-side controls. The auth model that issues the credentials — the
operator `ACME`, the accounts, the users — is taught in
[Security](/learn/security); here you *mount* those credentials and *turn
on* the transport security around them.

## TLS on every link

A NATS server speaks to more than one kind of peer, and **each kind
carries its own TLS block**. There are three:

- **Client TLS** — the top-level `tls {}` block, securing client
  connections like `order-svc` publishing to `orders.created`.
- **Cluster TLS** — a separate `cluster { tls {} }` block, securing the
  routes between `n1-east`, `n2-east`, and `n3-east`.
- **Gateway TLS** — a `gateway { tls {} }` block, securing supercluster
  links.

These blocks are independent. Turning on TLS for clients leaves the
cluster routes plaintext until you configure the cluster block too.

This per-link split is the single most common hardening mistake: an
operator secures clients, sees the encrypted client connection, and ships
a cluster whose inter-node Raft traffic — including replicated `ORDERS`
data — still travels in the clear.

Here is a server config that secures both the client link and the cluster
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

`verify: true` is what makes this **mTLS** — mutual TLS. Without it, the
server proves itself to the peer but never checks the peer's certificate.
With it, every cluster route must present a certificate that chains to
`ca_file`, so a stray node cannot join the `east` cluster just by knowing
the route address. Use `verify_and_map: true` instead when you want the
client certificate's subject to *be* the NATS user; the certificate
identity mechanism is covered in
[Security → Encryption & TLS](/learn/security/encryption).

Certificates are read fresh on each new handshake, so **rotating them
needs only a reload, not a restart**. Drop the new certificate files in
place and send the SIGHUP you learned on the
[config management](/learn/deployment/config-management) page:

```bash
# After dropping new cert/key files at the same paths, reload in place.
# Existing connections keep their session; new handshakes pick up the new cert.
systemctl reload nats-server
```

The full set of TLS keys — cipher suites, curve preferences, and
`pinned_certs` for certificate pinning — is documented in
[Reference → TLS](/reference/config/tls). We use only `cert_file`,
`key_file`, `ca_file`, and `verify` here.

## Mount the credentials, prove the link

TLS encrypts the link; credentials name the user on it. The `ACME`
operator from the [Security deep dive](/learn/security/operator-mode)
issues a `.creds` file for the `order-svc` user. You do not create it
here — you **mount** it as a file the server and client can read. On
Kubernetes that file is a Secret; on a host it lives under a path only the
`nats` user can read.

With the CA file and the creds file both in hand, one publish proves the
whole hardened path is live. The client trusts the CA (so the link
encrypts), presents the `order-svc` credentials (so the server
authenticates the user), and lands one canonical order on
`orders.created`:

<div class="nats-example" data-type="learn-deployment-hardening-credsConnect" data-languages="cli,js,go,python,java,rust,csharp"></div>

The payload is the same Acme order shape you have carried through every
chapter:

```json
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}
```

If the publish succeeds, encryption and authentication are both on. If it
fails at the handshake, TLS is misconfigured; if it fails with an
authorization error, the credentials are wrong or unmounted. The single
command distinguishes the two.

## A hardened systemd unit

TLS protects the cluster from the network. The **systemd unit** protects
the host from the cluster: it runs `nats-server` as an unprivileged,
sandboxed process that can touch only what it needs. The NATS distribution
ships a hardened unit (`nats-server-hardened.service`) — this is the
second and last concept of the page, and you adapt it rather than write it
from scratch.

The unit does three jobs. It **raises the file descriptor limit** so a
busy cluster never runs out of sockets. It **sandboxes the filesystem and
kernel surface** so a compromised process cannot escape. And it **drops
every Linux capability** the server does not need:

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

Two flags carry the most weight for an operator. `LimitNOFILE=800000`
lifts the file descriptor (FD) ceiling far above the default 1024 — each
stream costs roughly two FDs, and inter-node gossip plus client sockets
add many more, so a real `ORDERS` cluster needs the headroom.
`ProtectSystem=strict` mounts the entire filesystem read-only **except**
the paths in `ReadWritePaths`, which is why the TLS certificates and the
JetStream store both live under `/var/lib/nats` — a path the server is
explicitly allowed to write.

The full set of sandboxing directives — `PrivateUsers`,
`RestrictNamespaces`, `ProtectClock`, and the rest — ships in the
distribution's hardened unit; copy that file and adjust only
`ExecStart`, `ReadWritePaths`, and `LimitNOFILE` for your layout. The
server-configuration keys these flags wrap are documented in
[Reference → Configuration](/reference/config).

## Close the monitor port

The server listens on four ports: **4222** for clients, **6222** for
cluster routes, **7222** for gateways, and **8222** for the HTTP monitor.
The first three carry TLS once you configure it. The monitor port is
different: it serves `/varz`, `/healthz`, and the rest in plaintext, and
its `/varz` output leaks the server version, connected-client count, and
memory usage to anyone who can reach it.

Bind it to localhost so only an on-host agent — the same probe the
[Kubernetes](/learn/deployment/kubernetes) liveness check uses — can read
it, and let a firewall handle the rest:

```conf
# nats.conf — monitor reachable only from the host itself
http: "127.0.0.1:8222"
```

```bash
# Firewall: clients in, cluster/gateway between nodes only, monitor never.
# Open 4222 to clients, 6222/7222 to the other east nodes, deny 8222 outright.
ufw allow 4222/tcp
ufw allow from 10.0.0.0/24 to any port 6222 proto tcp
ufw deny 8222/tcp
```

What to actually scrape from `/varz` and `/healthz`, and how to read it,
is the monitoring discipline taught in
[Monitoring → Monitoring endpoints](/learn/monitoring/monitoring-endpoints).
Hardening's job is only to make sure the port is not open to the world.

## Pitfalls

A few traps hit teams the first time they harden a NATS cluster. Each one
is scoped to this page's work: the sandboxed systemd unit, and locking down
the ports that TLS now protects.

**`ProtectSystem=strict` blocks cert reload if certs live outside
`ReadWritePaths`.** The sandbox mounts the filesystem read-only, so a
SIGHUP that tries to re-read rotated certificates from, say,
`/etc/nats-certs` silently fails — the server keeps the old certificate
and the rotation never takes effect. Do not scatter certificates across
the filesystem. Put them under `/var/lib/nats` (already in
`ReadWritePaths`) or add an explicit `ReadWritePaths=/etc/nats-certs` line.

**`MemoryMax` or `GOMEMLIMIT` set below the JetStream max store crashes
startup silently.** The hardened unit can cap the process with `MemoryMax=`
(systemd) or `GOMEMLIMIT` (the Go runtime). Set either one below what the
`jetstream { max_memory_store }` config asks for and the server cannot
reserve its own configured memory — it fails to come up, often with nothing
useful in the journal. Do not pin the memory cap by guesswork. Set it
**`≥` the JetStream config**: read `max_memory_store` (and leave headroom
for the FD and gossip overhead that drove `LimitNOFILE=800000`), then size
`MemoryMax`/`GOMEMLIMIT` above it.

```ini
# Cap the process, but never below what JetStream is configured to use.
# If jetstream { max_memory_store: 4Gi }, keep MemoryMax above 4Gi.
MemoryMax=6G
Environment=GOMEMLIMIT=5500MiB
```

**The monitor port exposed to the internet leaks operational detail.**
A reachable `:8222/varz` hands out the server version, the client count,
and the memory footprint — a reconnaissance gift. Do not leave `http:`
bound to `0.0.0.0`. Bind it to `127.0.0.1` and let the firewall deny 8222
from everywhere else.

**A firewall blocking cluster port 6222 leaves nodes unable to form
quorum.** Hardening locks ports down, and it is easy to deny 6222 to the
world while forgetting to allow it *between* the east nodes. When that
happens the route handshakes never complete: `n1-east`, `n2-east`, and
`n3-east` each come up alone, cannot reach each other, and show as orphans
that never join the `east` cluster. Do not deny 6222 globally. Allow it
explicitly from the cluster subnet, and only then deny it elsewhere:

```bash
# Allow cluster routes between the east nodes; deny 6222 from anywhere else.
ufw allow from 10.0.0.0/24 to any port 6222 proto tcp
ufw deny 6222/tcp
```

Once the ports are open and TLS is on every link, the same authenticated
publish from [Mount the credentials, prove the link](#mount-the-credentials-prove-the-link)
proves the whole hardened path end to end. A successful publish confirms
the client link encrypts and the credentials authenticate. Run that check
from a node on the cluster network to confirm the routes came up — if a
node still shows as an orphan after you allow 6222, its route handshake is
failing on the firewall or on a missing or mismatched cluster certificate.

## Where you are

The `ORDERS` cluster now runs locked down. TLS protects every link — the
client connection for `order-svc` and the cluster routes that replicate
the stream between `n1-east`, `n2-east`, and `n3-east`. The `ACME`
credentials are mounted as files, and one publish proves auth and
encryption are both live. The process runs under a hardened systemd unit
that raises the FD limit and sandboxes the filesystem, and the monitor
port answers only from localhost.

That completes the runbook. The cluster is sized, deployed on Kubernetes,
configurable without downtime, upgradable in place, and hardened.

## What is next

The last page recaps the whole runbook — size, deploy, configure, upgrade,
harden — and collects every page's pitfalls into a single **production
checklist** you can run down before you call the cluster ready.

Continue to [Where to go next](/learn/deployment/where-next).

## See also

- [Security → Encryption & TLS](/learn/security/encryption) — the
  certificate-as-identity model behind `verify_and_map`.
- [Security → Operator mode](/learn/security/operator-mode) — how the
  `ACME` operator issues the credentials this page mounts.
- [Monitoring → Monitoring endpoints](/learn/monitoring/monitoring-endpoints)
  — what to scrape from the monitor port once it is locked to localhost.
