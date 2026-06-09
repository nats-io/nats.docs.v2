---
id: config-management
title: "4. Config management"
sidebar_position: 4
description: Split the cluster config into includes and reload it live with a SIGHUP — no downtime, no client reconnect
---

# 4. Config management

The `ORDERS` cluster is running on Kubernetes as the three pods
`nats-0`, `nats-1`, `nats-2`. Now the inevitable happens: you need to
change something. Raise an account limit, rotate a TLS certificate, add a
user for a new service. The naive answer is to restart the process. The
production answer is to **reload** it — apply the new config to the
running server without dropping a single connection.

This page teaches the two mechanisms that make live config change safe.
First, an **include** splits one giant config file into small files you
can own per account and per region. Second, **live reload** applies a
changed file to the running server through a SIGHUP, after a dry-run
validates it. Together they let you change `order-svc`'s limits or the
cluster's certificates while `ORDERS` keeps flowing.

## Includes split the config

A single `nats.conf` for a production cluster grows large. Accounts,
users, per-region routing, TLS paths, JetStream limits — all of it in one
file becomes hard to review and hard to hand to different owners.

An **include** pulls another file into the config at the point of the
directive. The keyword is `include`, and the path is **relative to the
directory of the config file that contains it**, not to the directory you
launch the server from:

```conf
# /etc/nats/nats.conf — the main config for nats-0..2
listen: "0.0.0.0:4222"

cluster {
  name: "east"
  listen: "0.0.0.0:6222"
}

jetstream {
  store_dir: "/var/lib/nats/jetstream"
}

# Pull in the per-account and per-region files.
include "accounts/orders.conf"
include "accounts/analytics.conf"
include "regions/us.conf"
include "regions/eu.conf"
```

Each included file holds one concern. The `ORDERS` account, its
`order-svc` user, and its limits live in their own file:

```conf
# /etc/nats/accounts/orders.conf
# Owned by the orders team. Reloadable: edit and SIGHUP.
ORDERS: {
  jetstream: { max_memory: 256MB, max_file: 10GB }
  users: [
    { user: "order-svc", password: "$ORDER_SVC_PASS" }
  ]
}
```

The per-region files hold the subjects each region publishes — the
`orders.us.created` and `orders.eu.created` splits from the sizing page —
so a region's routing can be reviewed and changed on its own.

Because the path is relative to the config file's directory, the includes
above resolve to `/etc/nats/accounts/orders.conf` and so on. Launch the
server from `/root` or from `/`, and they still resolve the same way. The
[Pitfalls](#pitfalls) section shows the trap when this is forgotten.

## Reloadable versus non-reloadable keys

Not every key can change on a running server. The split is sharp, and
knowing it is the difference between a zero-downtime reload and a
surprise restart.

**Reloadable** keys take effect on a reload, in place, with no
reconnect:

- Account, user, and permission definitions — add `analytics-reader`,
  tighten `order-svc`'s subjects.
- The connection and message limits — `max_connections`,
  `max_subscriptions`, `max_payload`, `max_control_line`.
- Most JetStream account limits.
- TLS certificate and key paths — the file the server re-reads on the
  next handshake.
- Cluster and gateway routes, and logging settings.

**Non-reloadable** keys need a process restart, because they define what
the server fundamentally *is*:

- `port` / `listen` — the address the server binds.
- The `jetstream` enable flag — turning JetStream on or off.
- The cluster `name`.

The rule of thumb: a reload can change *policy* — who connects, what they
may do, how much they may store. It cannot change *identity* — the ports
the server listens on or the cluster it belongs to. Change one of those,
and you are doing a [rolling upgrade](/learn/deployment/rolling-upgrades),
not a reload.

The full set of reloadable keys is documented in
[Reference → Configuration](/reference/config). We cover only the keys
this deployment reloads here.

## Validate, then reload

A reload that fails is dangerous only if it leaves the server in a broken
state. NATS avoids that: it **validates the new config first**, and on a
parse or validation failure the **old config stays active**. The reload
is atomic — either the new config applies cleanly, or nothing changes.

You still validate before you signal, because catching a typo at your
terminal beats catching it in the server log. The dry-run parses a config
file and exits without starting a server:

```bash
nats-server -c /etc/nats/nats.conf -t
```

A clean config prints `nats-server: configuration file ... is valid` and
exits zero. A broken one prints the parse error and the offending line,
and exits non-zero — so you can gate the reload on it in a script.

With the config validated, trigger the reload. The mechanism is a
**SIGHUP** to the `nats-server` process. The systemd unit wires
`systemctl reload` to send exactly that signal:

```bash
# Validate the edited config, then reload only if it is valid.
nats-server -c /etc/nats/nats.conf -t && systemctl reload nats-server
```

The server re-reads its config, applies the reloadable changes in place,
and logs `Reloaded server configuration`. Open connections — including
`order-svc`'s — stay up the whole time. No client reconnects. That is the
payoff of reload over restart.

## The reloader sidecar turns a ConfigMap edit into a SIGHUP

On Kubernetes there is no shell to run `systemctl reload` in. The config
arrives as a ConfigMap mounted into the pod, and editing the ConfigMap
updates the file on disk — but nothing tells `nats-server` to re-read it.

That is the job of **the config reloader sidecar**. It runs alongside
`nats-server` in each of the `nats-0..2` pods, watches the mounted config
file with inotify, and on any change reads the server PID from
`/var/run/nats/nats.pid` and sends it a SIGHUP. The NATS Helm chart
includes the reloader by default, so a ConfigMap edit becomes a live
reload across all three pods automatically:

```yaml
# values.yaml — the reloader ships enabled in the Helm chart
reloader:
  enabled: true
  # Falls back to polling when inotify is unavailable on the node.
  # extraFlags: ["--force-poll"]
```

The animation below traces the whole path: a config file change, the
reloader detecting it and sending the SIGHUP, the server reloading in
place, and the `order-svc` connection staying open while the peers pick
up the new server info.

<div class="nats-flow" data-scenario="configReloadAnimated" data-width="600" data-height="350"></div>

The reloader retries if the server is briefly unreachable — it defaults
to 30 retries, four seconds apart — so a reload issued during a momentary
blip still lands.

## Secrets are files, not config keys

Credentials and TLS material never belong inline in the config. They are
mounted as **files**: a Kubernetes Secret projected into the pod, or a
creds file on disk for a systemd deployment. The config references the
path; the secret lives outside the ConfigMap.

```conf
# A TLS path the config points at — the file itself is a mounted secret.
tls {
  cert_file: "/etc/nats-certs/server-cert.pem"
  key_file:  "/etc/nats-certs/server-key.pem"
  ca_file:   "/etc/nats-certs/ca.pem"
}
```

This split matters for reload. Rotating a certificate means replacing the
file behind `cert_file` and `key_file`, then reloading — the server
re-reads the certificate on the next TLS handshake. The config text never
changes; only the file it points at does. The auth model behind these
credentials — operators, accounts, JWTs — is taught in
[Security](/learn/security); here you only mount and reference them.

## Pitfalls

A few traps turn a routine reload into an outage. Each is scoped to this
page's two ideas: includes, and live reload.

**Include paths are relative to the config file, not your shell.** The
`include "accounts/orders.conf"` directive resolves against the directory
of the file that contains it, so a server launched from `/root` and one
launched from `/etc/nats` both find `/etc/nats/accounts/orders.conf`. The
trap is assuming the path is relative to your current directory, moving
the main config, and watching the includes fail to resolve. Use absolute
paths when in doubt, and validate before you trust it.

**A reload during a rebalance can interrupt a leadership transfer.** If
you SIGHUP a node while JetStream is moving `ORDERS` replicas or handing
off Raft leadership, the reload competes with that work. Do not reload
mid-rebalance. Wait for the cluster to settle, then apply the change —
the same graceful window the [rolling
upgrades](/learn/deployment/rolling-upgrades) page builds its procedure
around.

**Lowering a store limit on reload does not evict data already stored.**
Drop the `ORDERS` account's `max_file` below what the stream already
holds, reload, and the existing messages stay — but new writes fail until
an admin trims the stream back under the limit. The reload changes the
*ceiling*, not the *contents*. Raise limits freely; lower them only after
checking what the stream currently stores.

**Rotating a TLS certificate without watching its expiry hangs old
connections on a dead cert.** The server re-reads `cert_file` and
`key_file` on the *next* TLS handshake, so a reload swaps the certificate
for new connections cleanly — but connections already open keep the cert
they negotiated with. If you let the old certificate expire before those
clients reconnect, they hang on a cert the server no longer presents.

Do: rotate well before expiry, and track the certificate's expiry date so
the swap is never a fire drill. Don't: wait for the alert that the cert
already expired. The auth model behind these certificates lives in
[Security](/learn/security); here the rule is operational — replace the
file, reload, and rotate with margin to spare.

The do-this for all four is the same: never SIGHUP an unvalidated config.
The dry-run parses the file and exits without touching the running server,
so a typo never reaches it. Gate the reload on it:

```bash
# Validate first; only signal the running server if the config is valid.
if nats-server -c /etc/nats/nats.conf -t; then
  systemctl reload nats-server
  echo "reload sent"
else
  echo "config invalid — running server left untouched" >&2
  exit 1
fi
```

Because the server also validates internally and keeps the old config on
failure, even a reload that slips through the dry-run cannot leave the
cluster broken — the worst case is no change, never a half-applied one.

## Where you are

The `ORDERS` config is now split into per-account and per-region
includes, each ownable on its own. You can change a limit, add a user, or
rotate a certificate, validate it with a dry-run, and apply it to the
running cluster with a SIGHUP — no downtime, no client reconnect. On
Kubernetes the reloader sidecar does the signalling for you whenever the
ConfigMap changes.

What a reload cannot do is change the server's identity — its ports, its
JetStream enablement, or its cluster name. Those need a process restart,
rolled through the cluster one node at a time.

## What is next

That controlled restart is the next mechanism: a **rolling upgrade**.
Lame-duck mode drains a node gracefully, transfers its Raft leadership,
and lets the next version take its place — all while the R3 `ORDERS`
stream stays available and clients stay connected.

Continue to [5. Rolling upgrades](/learn/deployment/rolling-upgrades).

## See also

- [Reference → Configuration](/reference/config) — the full set of
  reloadable and non-reloadable keys.
- [Rolling upgrades](/learn/deployment/rolling-upgrades) — the procedure
  for the non-reloadable changes a SIGHUP cannot apply.
- [Security](/learn/security) — the auth model behind the credentials
  this page mounts as files.
