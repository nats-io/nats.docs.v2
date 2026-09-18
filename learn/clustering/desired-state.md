---
id: desired-state
title: "Desired state and evacuation"
sidebar_position: 7
description: Read the desired state a reconfiguration records on ORDERS, evacuate a server's assets in bulk, and roll a move back that you started by mistake
---

# Desired state and evacuation

The [previous page](/learn/clustering/scaling-and-peers) changed the
`ORDERS` group one peer at a time and waited for each change to land. From
2.15 the server does that waiting for you. A scale, a move, a placement
change, or a retention change is recorded as **desired state**: the peer set
the stream should end up with. The servers then converge on it on their own,
and you can read how far along they are.

This page reads that recorded state, uses it to move every asset off a
server in one command, and rolls a reconfiguration back when you started the
wrong one.

## What the server records

Before 2.15 a reconfiguration left no record of what it was trying to do.
The meta leader chose the new peers and added them to the group, and from
then on the only sign that anything was in progress was that the group held
a different number of peers than the stream's replica count. The stream's
own leader watched for the new peers to catch up and then proposed dropping
the old ones. It worked, but the intent was inferred from the peer count
rather than written down, so there was nothing to ask about where the stream
was heading and nothing recorded to put it back to.

Now the meta leader writes the end state onto the assignment — the cluster
to finish in, the peer set to finish on, and the configuration the stream
had before — and every server converges on it. That record is what the rest
of this page is built on: it's why you can read a reconfiguration while it
runs, and why you can cancel one.

That record shows up in `nats stream info` as its own section, under the
`Cluster Information` you already read on the previous pages. Start a move
of `ORDERS` from `east` to `west` and look:

```bash
nats --server nats://127.0.0.1:4222 stream info ORDERS
```

```
Cluster Information:

                Name: east
              Leader: n1-east
             Replica: n2-east, current, seen 0.10s ago
             Replica: n3-east, current, seen 0.14s ago
             Replica: n1-west, outdated, seen 0.11s ago, (pending), 9,102 operations behind

   Cluster Migration Status:

              Status: moving stream to cluster west
             Created: 2026-09-18 09:41:22 (1m18s)

             Cluster: east -> west
       Desired Peers: n1-west, n2-west, n3-west
```

Three things are worth naming, because the rest of the page uses them.

**Desired peers** is the peer set the stream is heading for. The `Replica`
lines above it are the peers it has right now, so the two lists differ while
a reconfiguration is in flight and match when it's done.

**`(pending)`** on a replica means that peer is in the assignment but isn't
a full RAFT group member yet — it's either still joining or on its way out.
A pending peer doesn't count toward quorum, which is why a move doesn't put
the stream at risk: the group keeps committing on the peers it already had.

**Origin** is the configuration the stream had before the reconfiguration
started, and it's what the rollback below restores. You don't see it under
its own name — the CLI renders it as the `from -> to` rows, like the
`Cluster: east -> west` line. A scale would show `Replicas: 3 -> 5`, a
retention change `Retention Policy: Limits -> Interest`.

When the section is absent, nothing is in flight.

## Move everything off a server

Retiring `n4-east` used to mean finding every stream and consumer with a
replica on it and moving each one off by hand. Now you name the server once:

```bash
nats --server nats://127.0.0.1:4222 server cluster evacuate n4-east
```

The meta leader records desired state for every stream and consumer assigned
to `n4-east`, each keeping its current replica count, and picks replacement
peers that qualify under each asset's placement. Run it without the peer
name and the CLI lists the meta group's peers and asks you to pick one.

Replacement here is **best effort**, and that's the one thing to understand
before running it. The job is to clear the server, so an asset the meta
leader can't place elsewhere — nothing satisfies its placement, or the
cluster is simply too small once `n4-east` is out — still moves off
`n4-east` and carries on **under-replicated** until a qualifying server
appears. An `R=3` stream can end up running on two peers. The server logs
`could not replace peer for stream` when this happens, and `nats stream
info` shows the shortfall, so check the assets you care about afterward
rather than assuming a clean drain. The evacuated server is kept out of
those assets' placement while they're short, so it isn't handed the replica
straight back before you've taken it away.

This is a system-account command, like the rest of `nats server cluster`.

Narrower versions exist for when you don't want the whole server drained,
and they make the opposite trade: they refuse rather than under-replicate.
To move one stream and its consumers off a peer:

```bash
nats --server nats://127.0.0.1:4222 stream cluster evacuate ORDERS n4-east
```

And to move a single consumer:

```bash
nats --server nats://127.0.0.1:4222 consumer cluster evacuate ORDERS NEW n4-east
```

Both of these refuse the move outright when no server qualifies, answering
`peer remap failed` and changing nothing. Losing a replica on one stream is
a worse outcome than a command that didn't run, so the per-asset commands
protect the replica count and make you fix the placement. Only the
server-wide `nats server cluster evacuate` above will proceed anyway,
because there the point is to empty the server.

All three keep the replica count where they can and let the server choose
the replacements. That's the difference from `nats stream edit --replicas`,
which changes how many replicas there are. Evacuation changes only where
they live.

Peer *removal* is a different operation and worth keeping separate in your
head. Removing a peer drops it from a group without migrating anything onto
a replacement first. That is what you want for a server that is gone and
isn't coming back, which is the
[disaster recovery](/learn/backup-recovery/disaster-recovery) case. To move
an asset off a server that's still running, evacuate.

The server has to be stopped before you remove its peer, which is the other
half of the same distinction: peer removal is bookkeeping for a node that
has already gone. Peer-remove one that's still running, and it responds by
disabling JetStream on itself.

## Roll a reconfiguration back

Start the wrong move, and you don't have to wait it out. Cancel it:

```bash
nats --server nats://127.0.0.1:4222 stream cluster cancel-move ORDERS
```

The stream goes back to the config and peers recorded in `origin` — the
replica count, placement, and retention it had before you changed anything.

Despite the name, this isn't limited to moves. Any in-flight desired state
rolls back the same way, so a scale from `R=3` to `R=5` and a retention
change both cancel with this command. Read it as "cancel the
reconfiguration".

Two checks run before anything happens, and both are worth knowing because
they're how you find out whether there was anything to cancel:

- If the stream isn't clustered at all, it answers `stream is not clustered`.
- If no reconfiguration is in flight — no `Cluster Migration Status` section
  in `stream info` — it answers `stream is not busy moving`.

Then it asks you to confirm. `--force` skips the checks and the prompt
together, which is why the pitfalls below say not to reach for it first.

## Pitfalls

**Don't cancel a move that's nearly done.** A rollback is itself a
reconfiguration: the stream converges back on its original peers, which
means another round of catchup on the peers that had already been passed
over. Cancelling a move that's seconds from finishing costs more work than
letting it land and moving the stream back afterward. Read `Desired Peers`
against the `Replica` lines first — if they almost match, let it finish.

**`--force` on `cancel-move` skips the check that tells you there's nothing
to cancel.** Without it, you get `stream is not busy moving` and learn the
move already completed. With it, the command runs against a stream that has
no desired state to roll back to. Run it unforced first, and only reach for
`--force` when you know what's in flight, and the prompt is the only thing in
your way.

**A server-wide evacuation can leave assets under-replicated.** The
per-asset commands refuse when they can't place a replica; `nats server
cluster evacuate` does not, because its job is to clear the node. On a
cluster with no spare capacity, or with placement that pins streams to a
subset of servers, draining a node quietly costs those streams a replica.
Check `nats stream info` on the streams you care about after the drain, and
size the cluster so one node can leave without stranding an asset.

**Mixed 2.14 and 2.15 servers won't finish a reconfiguration.** A 2.14
server persists the desired state but doesn't run it to completion, so a
scale or move started mid-upgrade stalls until every node is on 2.15.
Servers from 2.14.7 on carry the compatibility code for this, which is why
the [upgrade guide](/release-notes/upgrade-to-2.15) asks you to come from at
least 2.14.7.

## Where you are

You can now read and steer a reconfiguration instead of waiting it out:

- You found the `Cluster Migration Status` section in `nats stream info`,
  and you can tell the desired peers from the current ones and spot a
  `(pending)` peer that doesn't count toward quorum.
- You moved every asset off `n4-east` with one
  `nats server cluster evacuate`, and you know the per-stream and
  per-consumer versions for narrower jobs.
- You know which of them will leave a group under-replicated to get the job
  done, and which refuse with `peer remap failed` instead.
- You rolled a reconfiguration back with
  `nats stream cluster cancel-move`, and you know it covers scales and
  retention changes, not just moves.

## What's next

That's the whole mechanism: routes form the mesh, RAFT groups agree, a
quorum commits each write, placement decides where replicas live, peer
management grows the set, and desired state carries a reconfiguration
through to the end. The last page collects the recap and gathers every
page's Pitfalls into one production checklist.

Continue to [Where to go next](/learn/clustering/where-next).

## See also

- [Scaling and peer management](/learn/clustering/scaling-and-peers) — the
  one-change-at-a-time mechanics this page builds on.
- [Rolling upgrades](/learn/deployment/rolling-upgrades) — where
  `server cluster evacuate` fits when you're taking a node out for good.
- [Disaster recovery](/learn/backup-recovery/disaster-recovery) — what to do
  when the servers you're trying to evacuate are already gone.
- [Reference → stream API](/reference/jetstream/api/stream) — the evacuate
  and cancel-move endpoints, and the `desired` block in stream info.
