---
id: rescue-meta-details
title: Rescue Meta details
sidebar_position: 5
description: Step by step, rescue a meta group that lost quorum, peer-remove the dead servers, let the streams recover, and verify every meta peer is online
---

# Rescue Meta details

The [Disaster recovery](./disaster-recovery.md) runbook ends with a last
resort: rescuing the meta group. This page walks that procedure step by
step, with every check you need before, during, and after it.

The situation is the one from the runbook. The `east` cluster ran five
servers, `n1-east` to `n5-east`. Three of them, `n3-east`, `n4-east` and
`n5-east`, are permanently gone with their disks. The two survivors can't
form a majority of five, so the **meta group**, the RAFT group that holds
all stream and consumer assignments, has no leader. Nothing can be created,
edited, moved, or restored, and `peer-remove` can't run either, because
removing a peer is itself a change the meta group has to agree on.

Rescue needs NATS 2.15 or later on the surviving servers.

## What rescue does

**Rescue** lowers the number of peers the meta group needs to elect a
leader, on every server that receives the request. With the lower quorum the
survivors elect a leader again, and you use that leader to remove the dead
peers properly.

The lowered quorum is temporary. It ends on its own in two ways:

- After 5 minutes, the server restores the normal quorum and logs
  `Unsafe quorum rescue expired`.
- Once you've removed enough peers that the normal quorum of the smaller
  group is equal to or below the rescued one, the server drops the rescue
  and logs `Unsafe quorum rescue stopped`.

In the example, the rescue lowers the quorum from 3 to 2. After you remove
two of the three dead peers the group has three members, whose normal
quorum is 2, so the rescue ends there and the third removal runs under the
normal quorum.

## Before you start

Lowering a quorum is unsafe by design. It makes a smaller set of servers
authoritative over the cluster's metadata. If a server you counted as dead
comes back while the quorum is lowered, two sides can each elect a leader
and accept conflicting changes. That's a split brain, and it's much harder
to recover from than the outage you started with.

Check all of the following before you run anything:

- **The meta group really has no leader.** Rescue refuses to run while any
  server knows of a leader. If the group has a leader, you don't need rescue:
  use `nats server cluster peer-remove` directly, as described on
  [Scaling and peers](../clustering/scaling-and-peers.md).
- **The lost servers are never coming back.** Stop them if they're still
  running anywhere. Disable any automatic restart, such as a systemd unit, a
  Kubernetes pod, or an autoscaling group, so they can't rejoin with their
  old state.
- **You know how many servers are reachable.** Rescue prints this before it
  changes anything. A network partition looks the same as dead servers from
  one side; rescue on one side of a partition is exactly how a split brain
  happens.
- **You have system account credentials.** Rescue and peer-remove are
  system-level requests.
- **You know the JetStream domain.** Each domain has its own meta group, and
  a rescue lowers the quorum of exactly one of them.

## Step 1 — confirm the meta group is stuck

Read the meta group from one of the survivors:

```bash
nats --context sys server report jetstream
```

The `RAFT Meta Group Information` table at the end lists every peer in the
meta group. In this situation no row is marked as leader, and the three lost
servers show as offline. Note their names; you remove them by name in step 4.

## Step 2 — run the rescue

Run the rescue against the surviving servers:

```bash
nats --context sys server cluster rescue
```

The command first asks every server for its view and prints what it found:

```
Current Cluster State

   Server   Cluster  Size  Peers               Quorum Requires  Rescuing
   n1-east  east     5     2 online / 5 peers  3                false
   n2-east  east     5     2 online / 5 peers  3                false
```

Check that the online count matches the servers you expect to survive. If it
doesn't, stop and find out why before you continue.

The command then asks how many peers to require, defaulting to the number
online. Keep the default unless you have a reason not to. It broadcasts the
change and reports back per server:

```
Server "n1-east" now requires 2 quorum size (was 3)
Server "n2-east" now requires 2 quorum size (was 3)
```

Each server that applies the rescue also publishes an advisory on
`$JS.EVENT.ADVISORY.SERVER.META_RESCUE`, so your monitoring has a record of
it.

On a topology with more than one domain, name the domain, or the command
stops with `multiple domains found, pick one from ...`:

```bash
nats --context sys server cluster rescue --js-domain hub
```

A server can refuse the rescue. The reasons are:

- It knows of a leader, so the group isn't stuck from its point of view.
- It isn't a voting member of the meta group.
- Its meta log is empty. A server with no data must never win an election
  over peers that hold the only copies of it, so run the rescue on servers
  that have their data. If every server is empty, the cluster needs a fresh
  bootstrap rather than a rescue.
- It's older than 2.15.0. The command skips such servers and names each one.

## Step 3 — confirm a leader is elected

Within a few seconds the survivors elect a leader. Check it:

```bash
nats --context sys server report jetstream
```

One row in the meta group table now shows as leader. From here the clock is
running: you have 5 minutes until the rescue expires.

## Step 4 — peer-remove the dead servers, one at a time

Remove each lost server from the meta group:

```bash
nats --context sys server cluster peer-remove n3-east
```

The meta group allows only one membership change at a time. Ask for a second
while the first is still in progress and it answers
`cluster member change is in progress`. Wait a moment and repeat:

```bash
nats --context sys server cluster peer-remove n4-east
nats --context sys server cluster peer-remove n5-east
```

Only ever peer-remove a server that is stopped. A running server that gets
peer-removed turns JetStream off on itself and publishes a
`server removed` advisory. If one of the "dead" servers turns out to be
reachable, shut it down before you remove it.

If the 5 minutes run out before you're done, the quorum returns to normal
and the group may lose its leader again. Run the rescue again from step 2
and continue with the remaining servers.

## Step 5 — let the streams and consumers recover

Every peer-remove also cleans up the streams and consumers that had a
replica on the removed server. You don't need to touch them. The meta leader
handles each one:

- **A replacement server is available.** If another server in the cluster
  meets the stream's placement, the leader assigns the replica there, and the
  new replica catches up from the surviving ones.
- **No replacement is available.** The group scales down to its surviving
  replicas. The stream keeps its configured replica count, so it grows back
  automatically once enough servers are available (step 6).
- **The group lost its own quorum.** An R3 stream that had two of its three
  replicas on removed servers can't elect a leader either. Once those peers
  are peer-removed, the surviving replica drops them from its group, elects
  itself, and the stream serves reads and writes again.

Consumers follow their stream's new peer set the same way. An ephemeral
consumer that had all of its replicas on removed servers is deleted.

This recovery has limits you need to account for:

- **A surviving replica may be behind.** A write commits once a quorum holds
  it. If the quorum that held the last writes is gone, the surviving replica
  may not have them, and those acknowledged writes are lost. Compare the
  stream's last sequence with what your publishers last saw.
- **A stream with no surviving replica has no data to recover.** That's every
  R1 stream on a lost server, and any stream whose replicas were all on lost
  servers. Recover those from a snapshot or by promoting a mirror, as in
  [Disaster recovery](./disaster-recovery.md).

## Step 6 — restore capacity

The cluster now runs on fewer servers than before, and streams that couldn't
place a replacement run with fewer replicas than configured. Add replacement
servers to bring them back:

- Give each new server a configuration that joins the cluster, and an empty
  `store_dir`.
- Don't reuse a removed server with its old data. If you bring back a
  removed host, start it with an empty `store_dir` so it joins as a new peer.

When a new server joins the meta group, the meta leader checks every stream
for missing replicas and places them on the new server where placement
allows. The new replicas catch up from the existing ones.

You can also change streams yourself, now that the meta group has a leader
again:

- Change the replica count with
  `nats stream edit ORDERS --replicas 3`, for example to scale a stream down
  on purpose while the cluster is small, or back up afterwards.
- Change the placement to move a stream to particular servers, for example
  `nats stream edit ORDERS --tag region:us-east`. The cluster moves the
  replicas and the stream stays available during the move. Placement is
  covered on [Placement](../clustering/placement.md), and moves on
  [Scaling and peers](../clustering/scaling-and-peers.md).

## Step 7 — verify

Read the meta group once more:

```bash
nats --context sys server report jetstream
```

Check that:

- Exactly one peer is marked as leader.
- The table lists only servers you know, and every one of them is online
  and current. A removed server must not appear; a server that's listed but
  offline is a server you either still need to bring up or still need to
  remove.
- The number of peers matches the number of JetStream servers you run.

Then check the streams:

```bash
nats stream report
```

Every replicated stream should show a leader and its configured number of
replicas, all current. A stream that's still short of replicas is waiting
for a server it can be placed on. For a single stream, `nats stream info
ORDERS` shows each replica and how far behind it is.

## Caveats

**Rescue is not peer management.** Retiring a server in the normal course is
`nats server cluster evacuate` followed by `nats server cluster peer-remove`
while the meta group still has a leader. Never use rescue for that.

**A returning server can cause a split brain.** Lowering the quorum is only
safe if the lost servers never come back with their old state. Stop them,
disable their restart, and rebuild any returning host with an empty
`store_dir`.

**Rescue lasts 5 minutes.** Have the list of servers to remove ready before
you start. If it expires, run it again.

**One membership change at a time.** Wait for each peer-remove to finish
before the next.

**Rescue only fixes the meta group.** Streams and consumers recover through
the peer-removes in step 4, not through the rescue itself.

**Recovery can lose the last writes.** A surviving replica that was behind
becomes the stream's history. Streams with no surviving replica need a
snapshot or a mirror.

**Each domain is separate.** Name the domain with `--js-domain` when there's
more than one; a rescue lowers the quorum of exactly one meta group.

**Mixed versions.** The rescue skips servers older than 2.15.0 and names
them. In a half-upgraded cluster, check that the servers it skipped don't
leave the rest short of a quorum.

## See also

- [Disaster recovery](./disaster-recovery.md) — the runbook that decides when
  to rescue, and the snapshot and mirror recoveries for streams that had no
  surviving replica.
- [JetStream data recovery](./jetstream-data-recovery.md) — bring servers
  back from their moved volumes, before or instead of a rescue.
- [Scaling and peers](../clustering/scaling-and-peers.md) — evacuate and
  peer-remove while the meta group has a leader.
- [Desired state and evacuation](../clustering/desired-state.md) — how the
  cluster converges a stream on its target peers.
- [Reference → Meta API](/reference/jetstream/api/meta) — the rescue and
  peer-remove requests.
- [ADR-61](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-61.md)
  — the design of the meta rescue.
