---
id: jetstream-in-a-cluster
title: "JetStream in a cluster"
sidebar_position: 4
description: What changes for JetStream once it runs on a cluster — the meta layer and replication
---

# JetStream in a cluster

The previous page left Acme with a three-server cluster called `east`:
`n1-east`, `n2-east`, and `n3-east`, joined by routes into a full mesh.
Clients connect to any of them and fail over to another when one dies.

Core publish and subscribe already work across that mesh. A message
published on `n1-east` reaches a subscriber on `n3-east` over a route,
and nothing on this page changes that.

What this page changes is what JetStream does on the cluster. JetStream is
already enabled on the `east` cluster, but no stream lives on it yet. This page
creates `ORDERS` replicated across the three servers, so it survives the loss of
any one of them.

This page introduces two ideas: the **meta layer** that the cluster runs
for JetStream, and what it means for a stream to be **replicated** across
the servers of that cluster.

## The meta layer

A single JetStream server answers stream and consumer requests on its
own. A cluster can't work that way: the three servers have to agree on
what streams exist and where each one lives, so a `create ORDERS` sent to
any of them makes one stream, not three. That agreement needs a single
decision-maker.

So a JetStream cluster runs a coordinator. The servers elect one
**meta leader**, and the meta leader owns every decision about *where*
streams and consumers live: which servers hold a new stream, which server
holds each copy, and what happens when a server disappears.

The set of servers participating in that coordination is the **meta
group**. Every JetStream-enabled server in the cluster belongs to it.
One of them is the meta leader, and the rest are followers.

Which server wins that election doesn't matter and isn't something you
choose. What matters is that exactly one server coordinates where streams
and consumers live, and the others can take over if it fails.

The meta leader decides where a stream lives, but it doesn't handle the
writes to it. Those go through replication, which the rest of this page
covers.

## A replicated stream needs an odd number of servers

The meta group reaches its decisions by majority vote. A majority of a
group needs more than half its members reachable, which is why a
JetStream cluster wants an odd number of servers.

Three servers form a clean majority of two. Lose one server and two
remain, still a majority, so the meta group keeps coordinating and your
streams keep serving. This is exactly why Acme runs three, not two.

Lose a second server, though, and the majority is gone. With one of three
left, no write can reach a majority, so the stream stops accepting new
messages until a server comes back. A write is never stored on a single
copy that a majority hasn't confirmed. Three servers is what lets any single
one fail while writes keep flowing.

An even count gives you no extra protection here. Two servers have no majority once
one is gone, and four tolerate the same single failure that three do while
costing an extra server. That's why production clusters run an odd
count, typically three or five — a stream keeps at most five copies, so
more servers add capacity, not more copies of one stream.

The wire-level detail of how that majority vote works (the Raft
protocol, election timing, and log replication) lives in the
[Clustering & Replication](/learn/clustering) deep dive. What matters here:
run an odd number of servers so a majority can always form, with one server
coordinating.

## Make ORDERS survive a server loss

The `ORDERS` stream lived on a single server through the [JetStream
chapter](/learn/jetstream).
Now that `east` is a cluster with JetStream on, you create the stream here —
and because there are three servers, you create it replicated, so it
survives one of them dying.

A stream picks how many copies of itself to keep: its **replica factor**.
One copy is `R1`, the default a stream takes unless you ask for more — the
single-server behavior you've run all along. Three copies is `R3`, the
production floor, and a three-server cluster is exactly enough to hold them.

If you stopped the cluster after the last page, start all three servers
again first:

```bash
nats-server -c n1-east.conf &
nats-server -c n2-east.conf &
nats-server -c n3-east.conf &
```

Create `ORDERS` on the cluster with three replicas:

```bash
nats stream add ORDERS --subjects "orders.>" --replicas=3 --defaults
```

Then ask what it did. The same `nats stream info` you ran on one server now
includes a Cluster Information section, because the stream lives on more
than one:

```bash
nats stream info ORDERS
```

```
Cluster Information:

                 Name: east
        Cluster Group: S-R3F-xK2p9aLm
               Leader: n1-east
              Replica: n3-east, current, seen 0.00s ago
              Replica: n2-east, current, seen 0.00s ago
```

Read this section top to bottom. `Name: east` is the cluster the stream lives in. Replication stays inside
one cluster; it's the unit a stream is replicated across.

`Cluster Group` is the internal name for this stream's own coordination
group: its own Raft group, separate from the meta group. Each stream
gets one.

`Leader: n1-east` is where the stream's writes land. One of the three
copies takes every write to `ORDERS` first, then sends it to the other
replicas, and the write is acknowledged only once a majority hold it. The two
`Replica` lines are the copies that follow. `current` means a copy has
recently checked in and holds the same data; `seen` reports how long
since it last reported.

This stream's leader, `n1-east`, is whichever copy the cluster picked to
take its writes — not necessarily the server coordinating the meta group.
The two are chosen independently: the meta leader only places the stream,
and once placed the stream handles its own writes wherever it landed. You
configure neither; both fall out of the same majority rule, and the
[Clustering & Replication](/learn/clustering) deep dive covers how they're
chosen and how they move when a server dies.

## Consumers replicate too

A consumer has state worth protecting as well: how far a reader has gotten
and which messages are still waiting for an ack. The meta leader places
consumers just as it places streams, and each consumer gets its own Raft
group and leader — chosen independently of the stream's, so a consumer can
lead on `n1-east` while its stream leads on `n3-east`. `nats consumer info`
shows a Cluster Information section of its own.

By default a consumer takes its stream's replica count, so a consumer on
R3 `ORDERS` is replicated three ways too and keeps its place through a
server loss. You can set it lower, but an R1 consumer on an R3 stream is
its own single point of failure: its position lives on one server, so
losing that server loses the reader's place even though the stream
survives. The [Clustering & Replication](/learn/clustering) deep dive
covers consumer placement and the replica options in full.

## Pitfalls

A cluster does not make JetStream highly available on its own. Three habits
cause problems at the topology level.

**An R1 stream on a cluster still has no HA.** A stream created on a cluster
defaults to a single replica unless you ask for more. R1 puts one copy on one
server, so losing that server loses the stream; the cluster around it changes
nothing. Don't assume "it runs on the cluster" means "it survives a failure."
Audit replica counts and raise the streams that matter to R3.

This audit has a runnable form. First, list every stream stuck at one
replica — on a cluster, a single copy means no failover:

```bash
nats stream find --replicas=1
```

Raise anything that turns up with `nats stream edit <stream> --replicas=3`.
Then assert `ORDERS` itself holds the three replicas you expect. The check
exits non-zero when a stream is under-replicated, so it wires straight into a
health monitor:

```bash
nats server check stream --stream=ORDERS --peer-expect=3
```

```
OK ORDERS OK:3 peers OK:0 sources | sources=0
```

**An even server count gives you no extra protection.** A majority needs more than half the
group reachable, so four servers tolerate the same single loss that three do at
the cost of an extra server, and two have no majority left once one is gone.
Run an odd number of servers so a majority can always form, never an even
count like four or six.

**All three replicas in one failure domain defeat R3.** Three copies survive
one server loss only if the three servers can fail independently. Spread across
one rack or one availability zone, a single power or network event takes all
three at once. Steering which servers a stream lands on is placement, covered in
the [Clustering & Replication](/learn/clustering) deep dive. This page only
flags that R3 alone does not guarantee independent failures.

## Where you are

Acme's deployment now looks like this:

- The `east` cluster (`n1-east`, `n2-east`, `n3-east`) runs JetStream
  on every server, each with its own `store_dir`.
- The cluster elects a **meta leader** that coordinates where streams and
  consumers live.
- `ORDERS` is an R3 stream: three copies across the three servers,
  with one of them taking every write.
- The order service publishes exactly as it always has and gets a
  durability promise it didn't have on a single server.

## What's next

The next page leaves a single cluster behind. Acme stands up a second
cluster, `west`, and joins it to `east` with **gateways**, the connection
that turns two clusters into a
[super-cluster](/learn/topologies/super-clusters). The `ORDERS` stream's
replicas stay inside `east`, though — joining clusters doesn't stretch one
stream across them.

## See also

- [Operate → Clustering & Replication](/learn/clustering) — Raft, quorum,
  replication, and placement worked through on a real cluster.
- [Learn → Surviving node loss](/learn/jetstream/surviving-node-loss) —
  file-vs-memory storage durability and the in-flight-publish edge cases
  this page doesn't cover.
- [Reference → JetStream Meta API](/reference/jetstream/api/meta) — the
  meta-group endpoints the cluster uses to place streams and consumers.
