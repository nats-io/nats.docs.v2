---
id: jetstream-in-a-cluster
title: "3. JetStream in a cluster"
sidebar_position: 4
description: What changes for JetStream once it runs on a cluster — the meta layer, R3 streams, and where a stream's writes land
---

# 3. JetStream in a cluster

The previous page left Acme with a three-server cluster called `east`:
`n1-east`, `n2-east`, and `n3-east`, joined by routes into a full mesh.
Clients connect to any of them and fail over to another when one dies.

Core publish and subscribe already work across that mesh. A message
published on `n1-east` reaches a subscriber on `n3-east` over a route.
Nothing on this page changes that.

What this page changes is JetStream. The `ORDERS` stream has lived on a
single server through the whole JetStream chapter. Putting it on the
`east` cluster makes it survive the loss of a server — and it adds one
new moving part to the topology.

This page introduces two ideas: the **meta layer** that the cluster runs
for JetStream, and what it means for a stream to be **replicated** across
the servers of that cluster.

## Enable JetStream on every server

A cluster does not run JetStream until you turn it on. Each server needs
the `jetstream` block, and each needs a `store_dir` of its own so its
copy of the data has somewhere to live.

Here is `n1-east`, carrying the exact `cluster {}` block from the previous
page — the seed server with no `routes` of its own — and gaining a
`jetstream {}` block:

```conf
# n1-east.conf
server_name: n1-east
listen: 127.0.0.1:4222

jetstream {
  store_dir: "./js/n1-east"
}

cluster {
  name: east
  listen: 127.0.0.1:6222
}
```

The `server_name` matters more than ever now. JetStream uses it to name
the servers that hold each copy of a stream, and it must be unique within
the cluster. Acme already gave each server a distinct name, so there is
nothing to change.

`n2-east` and `n3-east` get the same treatment: a `jetstream {}` block
with their own `store_dir`, and their existing cluster block. Start all
three exactly as before:

```bash
nats-server -c n1-east.conf
nats-server -c n2-east.conf
nats-server -c n3-east.conf
```

Three servers, JetStream on each, routes already wiring them into a mesh.
That is everything the topology needs.

## The meta layer

A single JetStream server answers stream and consumer requests on its
own. A cluster cannot work that way. If you ask two servers to create a
stream named `ORDERS` independently, you get two different streams with
the same name and no agreement about which is real.

So a JetStream cluster runs a coordinator. The servers elect one
**meta leader**, and the meta leader owns every decision about *where*
streams and consumers live: which servers hold a new stream, which server
holds each copy, and what happens when a server disappears.

The set of servers participating in that coordination is the **meta
group**. Every JetStream-enabled server in the cluster belongs to it.
One of them is the meta leader; the rest follow.

Ask the cluster who that is:

```bash
nats server report jetstream
```

The report opens with a meta-group summary. The `Meta Cluster` line
names the cluster, and the leader column names the server currently
coordinating:

```
JetStream Summary

Cluster   Stream    Consumer   Messages   Bytes    Memory   File     API     API Err
n1-east   0         0          0          0 B      0 B      0 B      0       0
n2-east   0         0          0          0 B      0 B      0 B      0       0
n3-east   0         0          0          0 B      0 B      0 B      0       0

RAFT Meta Cluster Information

   Cluster: east
    Leader: n2-east
   Replica: n2-east, current, leader
   Replica: n1-east, current
   Replica: n3-east, current
```

`n2-east` is the meta leader here. Which server wins the election does
not matter and is not something you choose — the point is that exactly
one server coordinates, and the others stand ready to take over.

The meta leader is a topology fact, not a per-stream one. It decides
where streams land; it does not handle their writes. That is a detail of
replication, which the rest of the page turns to.

## A replicated stream needs an odd number of servers

The meta group reaches its decisions by majority vote. A majority of a
group needs more than half its members reachable, which is why a
JetStream cluster wants an **odd** number of servers.

Three servers form a clean majority of two. Lose one server and two
remain, still a majority, so the meta group keeps coordinating and your
streams keep serving. This is exactly why Acme runs three, not two.

An even count buys you nothing here. Two servers have no majority once
one is gone; four tolerate the same single failure that three do, while
costing an extra server. Production clusters run an odd count — typically
3 or 5 — for this reason; a stream replicates across at most five servers,
so five is the practical ceiling.

The wire-level detail of how that majority vote works — the Raft
protocol, election timing, and log replication — is documented in the
[Clustering & Replication](/learn/clustering) deep dive. We only need the
shape here: odd server count, majority rules, one coordinator.

## Make ORDERS survive a server loss

A stream on a cluster picks how many copies of itself to keep. That count
is its **replica factor**. One copy is `R1` — the default a stream takes
unless you ask for more, and the single-server behavior you have run all
along. Three copies is `R3`, the production floor, and a three-server
cluster is exactly enough to hold them.

Raise `ORDERS` to three replicas, then ask the cluster what it did:

<div class="nats-example"
     data-type="learn-topologies-jetstream-in-a-cluster-r3-stream"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

The same `nats stream info` you ran on one server now grows a **Cluster
Information** section, because the stream lives on more than one:

```
Cluster Information:

                 Name: east
        Cluster Group: S-R3F-xK2p9aLm
               Leader: n1-east
              Replica: n3-east, current, seen 0.00s ago
              Replica: n2-east, current, seen 0.00s ago
```

Read this top to bottom.

`Name: east` is the cluster the stream lives in. Replication stays inside
one cluster; it is the unit a stream is replicated across.

`Cluster Group` is the internal name for this stream's own coordination
group — its own Raft group, separate from the meta group. Each stream
gets one.

`Leader: n1-east` is where the stream's writes land. One of the three
copies takes every write to `ORDERS` first, then sends it to the other
replicas; the `PubAck` comes back once a majority hold the message. The two
`Replica` lines are the copies that follow. `current` means a copy has
recently checked in and holds the same data; `seen` reports how long
since it last reported. All three copies are in step.

Notice this write-handling copy is `n1-east` while the meta leader was
`n2-east`. That is normal. The meta leader only places the stream; once
placed, the stream handles its own writes wherever it landed. You do not
configure or pick this — it falls out of the same majority rule, and the
[Clustering & Replication](/learn/clustering) deep dive covers how it is
chosen and how it moves when a server dies.

## What the application does not notice

Acme's order service did not change. It still connects to a server in
`east` and publishes the same payload to the same subject:

```json
{
  "order_id": "ord_8w2k",
  "customer": "acme-co",
  "total_cents": 4200,
  "ts": "2026-05-22T10:14:22Z"
}
```

The publish lands wherever the client is connected, and the cluster
routes it to whichever copy handles writes behind the scenes. The client
never names `n1-east` or knows it holds the stream. It publishes; it gets
a `PubAck`; the topology does the rest.

That `PubAck` now means more than it did on one server. On `R3` it
returns only after a majority of replicas hold the message, so the
acknowledgement is a real durability promise: the order survives the
loss of any single server in `east`.

## What does not belong on this page

Replication does not cross a cluster boundary. When Acme adds the `west`
cluster in the next chapter, an `R3` stream in `east` is still replicated
only within `east` — gateways carry interest, not stream replicas.
Copying stream data between clusters uses
[mirrors and sources](/learn/jetstream/mirrors-and-sources), which the
next chapter reaches.

The mechanics underneath `R3` — how Raft elects a leader, how a majority
keeps the log consistent, how a new leader is chosen when one dies, and
how you steer which servers a stream lands on — all belong to the
[Clustering & Replication](/learn/clustering) deep dive. This page stops
at the topology view: a meta layer, an odd server count, and a stream
replicated across servers.

## Pitfalls

A cluster does not make JetStream highly available on its own. Three habits
trip people up at the topology level.

**An R1 stream on a cluster still has no HA.** A stream created on a cluster
defaults to a single replica unless you ask for more. R1 puts one copy on one
server, so losing that server loses the stream — the cluster around it changes
nothing. Do not assume "it runs on the cluster" means "it survives a failure";
audit replica counts and raise the streams that matter to R3.

This audit has a runnable form. List every stream with one replica, then assert
`ORDERS` carries the three you expect:

<div class="nats-example"
     data-type="learn-topologies-jetstream-in-a-cluster-audit-replicas"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

**An even server count buys nothing.** A majority needs more than half the
group reachable, so four servers tolerate the same single loss that three do at
the cost of an extra server, and two have no majority left once one is gone.
Run an odd count — 3 or 5, since a stream replicates across at most five
servers — never four or six.

**The meta leader and a stream's leader are not the same server.** The meta
leader only places streams; each stream then handles its own writes wherever it
landed, so `ORDERS` can have its writes on `n1-east` while `n2-east`
coordinates the meta group. Read the **Cluster Information** section of `nats
stream info` for a stream's own leader; do not infer it from the meta-group
summary.

**All three replicas in one failure domain defeat R3.** Three copies survive
one server loss only if the three servers can fail independently. Spread across
one rack or one availability zone, a single power or network event takes all
three at once. Steering which servers a stream lands on is placement, covered in
the [Clustering & Replication](/learn/clustering) deep dive — this page only
flags that R3 alone does not guarantee independent failures.

## Where you are

Acme's deployment now looks like this:

- The `east` cluster — `n1-east`, `n2-east`, `n3-east` — runs JetStream
  on every server, each with its own `store_dir`.
- The cluster elects a **meta leader** that coordinates where streams and
  consumers live.
- `ORDERS` is an **R3** stream: three copies across the three servers,
  with one of them taking every write.
- The order service publishes exactly as it always has and gets a
  durability promise it did not have on a single server.

## What is next

The next page leaves a single cluster behind. Acme stands up a second
cluster, `west`, and joins it to `east` with **gateways** — the
connection that turns two clusters into a
[super-cluster](/learn/topologies/super-clusters).

## See also

- [Operate → Clustering & Replication](/learn/clustering) — Raft, quorum,
  replication, and placement worked through on a real cluster.
- [Learn → Surviving node loss](/learn/jetstream/surviving-node-loss) —
  the durability story for `R3` from the JetStream side.
- [Reference → JetStream Meta API](/reference/jetstream/api/meta) — the
  meta-group endpoints the cluster uses to place streams and consumers.
