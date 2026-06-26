---
id: sizing-and-resources
title: "Sizing & resources"
sidebar_position: 2
description: The four resources a NATS node spends, the JetStream defaults, and how account limits count R3 replication
---

# Sizing & resources

Topologies decided the shape: a three-node cluster called `east`
(`n1-east`, `n2-east`, `n3-east`) carrying the R3 `ORDERS` stream. This
chapter runs that shape for real, and running it starts with the question
of how much of each resource this cluster needs.

A node spends a small, fixed set of resources, the JetStream defaults are
knowable numbers, and the account limits the server enforces are readable
with one command. This page turns those into a baseline for the ORDERS
workload.

You'll learn two things here: the four resources a node spends (and their
JetStream defaults), and how account limits count R3 replication
against the storage ceiling.

## The four resources a node spends

Every NATS node spends the same four resources. Once you size each one,
you've sized the node.

**CPU** handles moving messages. Core NATS routing is cheap; TLS
handshakes and JetStream replication are where cycles go. There's no hard
CPU limit to set, so the rule is headroom: overprovision CPU by 20–30%
above steady state so a node has cycles spare for a rebalance when a peer
leaves.

**Memory** holds connections, subscriptions, and (for memory-storage
streams) message data. The ORDERS stream uses file storage, so its
messages live on disk, not in RAM. The `order-svc` publisher and the
`warehouse`, `notifications`, and `analytics` subscribers are light
clients; a few hundred connections fit comfortably in a few hundred
megabytes. Budget `order-svc` at roughly 128 MiB.

**Disk** holds file-storage streams. This is the resource the ORDERS
stream actually spends, and the one most likely to run out. We'll size it
below.

**File descriptors (FDs)** are the per-process limit on open files and
sockets. Connections, routes, and streams each consume FDs. JetStream
spends roughly two FDs per stream. On a small cluster the
default per-process limit is plenty; on a large one it isn't, which is
why the hardened service unit on the [hardening](/learn/deployment/hardening)
page raises it to `LimitNOFILE=800000`.

### The JetStream defaults

When JetStream can't read the system's real limits, it falls back to two
defaults worth memorizing: **memory storage 256 MB** and **file storage
1 TB**. When it can read real system RAM, the server sizes memory
storage to a fraction of that instead, but the file-storage default stays
at 1 TB unless you set `max_file_store` lower.

That 1 TB default is a ceiling, not a reservation: the node only writes
what the streams actually store. But it causes a problem in a container.
The node will accept writes up to 1 TB even if the volume mounted under it
is 10 GiB, and the publish that crosses the real disk boundary fails. Set
`max_file_store` to match the volume:

```conf
# n1-east.conf — pin JetStream storage to the real volume size
jetstream {
  store_dir:      "/var/lib/nats/jetstream"
  max_memory_store: 256MB
  max_file_store:   10GB
}
```

The ORDERS stream is an R3 file stream. At R3 it keeps three copies, one
per node, so each node stores the full stream once. A 10 GiB
`max_file_store` per node leaves ample room for an ORDERS stream sized to
fit the default 10 GiB volume the Kubernetes chapter provisions.

The full set of JetStream limit keys is documented in
[Reference → Configuration](/reference/config/jetstream). We only cover
`max_memory_store` and `max_file_store` here.

## Account limits and how replication counts

The server config sizes the *node*, while **account limits** size the
*tenant*. The ORDERS account has its own ceilings (`MaxMemory`,
`MaxStore`, `MaxStreams`, `MaxConsumers`), and the server enforces them
no matter how much disk the node has. Read them live before you size:

<div class="nats-example" data-type="learn-deployment-sizing-and-resources-accountInfo" data-languages="cli,js,go,python,java,rust,csharp"></div>

One subtlety in that output decides your storage math: how replication
counts against `MaxStore`. There are two cases.

On an **un-tiered** account, an R3 stream counts as `replicas × bytes`.
A 10 GiB ORDERS stream at R3 spends 30 GiB of the account's
`MaxStore`, because the limit measures total bytes stored across all
replicas. Forget the multiplier and the third replica fails to place
when the account hits its ceiling.

On a **tiered** account, replication is baked into the tier. The bytes
the limit reports are the usable bytes: the R3 multiplier is already
accounted for, so a 10 GiB tier holds a 10 GiB R3 stream.

The durability R3 buys (surviving the loss of a node) is the
JetStream chapter's subject, covered on
[Surviving node loss](/learn/jetstream/surviving-node-loss). Here you only
need the cost: on an un-tiered account, three copies cost three times the
bytes.

## Connection, subscription, and payload limits

Three more limits round out the node, and one command reads them all:

<div class="nats-example" data-type="learn-deployment-sizing-and-resources-serverInfo" data-languages="cli,js,go,python,java,rust,csharp"></div>

`max_connections` caps how many clients a node accepts (default
unlimited; it's reloadable, and overflow disconnects immediately).
`max_subscriptions` caps subscriptions per connection (default
unlimited). `max_payload` caps a single message at 1 MB by default,
and it must stay `≤ max_pending`. The ORDERS payload is well under a
kilobyte, so the defaults have room to spare:

```json
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}
```

The full set of connection and payload keys is documented in
[Reference → Configuration](/reference/config/max_payload). We only name
the ones a sizing baseline needs here.

## Pitfalls

A few sizing mistakes only surface in production under load, where
they're expensive to fix. Each is scoped to this page's two concepts: the
node's resources and the account's limits.

**Setting `max_file_store` beyond the real disk.** The 1 TB default (or
any value larger than the mounted volume) lets the node accept writes it
can't store. The failure is a publish error mid-stream, not a startup
warning. Set `max_file_store` to the volume size, test small with a
`10GB` value, and watch the real disk with `df -h`. Don't trust the
config number over what the device reports.

**`max_payload` larger than `max_pending`.** If `max_payload` exceeds
`max_pending`, the server refuses to start. Keep `max_pending` at
`≥ 10× peak message size` so a burst of large messages can't stall a
connection. Don't raise `max_payload` in isolation.

**File-descriptor exhaustion on a big cluster.** Each stream costs about
two FDs, and routes and gossip add more. On a large cluster the default
per-process FD limit runs out, and the symptom is connection refusals
that look like a network fault. Raise the limit (`ulimit -n 800000`)
before the process starts; the hardened unit on the
[hardening](/learn/deployment/hardening) page does exactly this.

**JWT account limits on operator-mode clusters.** Operator-mode accounts
enforce their limits through the account JWT; pre-v2.10 servers didn't
validate those limits at runtime. Upgrade an operator-mode cluster
atomically (all nodes together to v2.10+, never a rolling upgrade) so
one node never enforces a limit that another still ignores. Read the
active tier with `nats account info` before you size, so you plan against
the limits the upgraded cluster will actually apply.

The runnable fix for all four is the same first step: read the live
limits before you size, so the numbers you plan against are the numbers
the server enforces.

<div class="nats-example" data-type="learn-deployment-sizing-and-resources-accountInfo" data-languages="cli,js,go,python,java,rust,csharp"></div>

## Where you are

You now have a sizing baseline for the ORDERS cluster:

- The four resources a node spends: CPU (20–30% headroom), memory
  (`order-svc` ~128 MiB), disk (`max_file_store` pinned to the volume),
  and FDs (two per stream).
- The JetStream defaults named (memory 256 MB, file storage 1 TB) and
  `max_file_store` set to the real 10 GiB volume.
- The account limits read live with `nats account info`, and the rule
  that an un-tiered R3 stream costs `replicas × bytes`.

The ORDERS R3 file stream fits the default 10 GiB volume, and `order-svc`
fits in ~128 MiB. That baseline is what the next page deploys.

## What's next

With the resources sized, the next page stands the cluster up: the NATS
Helm chart, the StatefulSet that maps `nats-0..2` to `n1-east..n3-east`,
and the NACK controller that declares the `ORDERS` stream as a CRD.

Continue to [Kubernetes](/learn/deployment/kubernetes).

## See also

- [Reference → Configuration](/reference/config/jetstream) — every
  JetStream limit key and its default.
- [Reference → max_payload](/reference/config/max_payload) — the payload
  and pending limits in full.
- [Surviving node loss](/learn/jetstream/surviving-node-loss) — what R3
  durability buys for the bytes it costs.
