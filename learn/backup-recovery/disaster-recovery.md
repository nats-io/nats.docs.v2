---
id: disaster-recovery
title: Disaster recovery
sidebar_position: 4
description: A runbook that picks restore-from-snapshot or promote-the-mirror per failure class, then promotes the mirror and fails back
---

# Disaster recovery

You now have two tools. A **snapshot** of `ORDERS` sits off-site under
`./backups/orders/`, and a live **mirror** of `ORDERS` runs on the `west` cluster.
Each protects against a different failure, and reaching for the
wrong one during an outage costs you either data or hours.

This page is the **runbook**: an ordered procedure that names the failure,
picks the right tool, and carries out the recovery against the real `ORDERS`
deployment. It also covers the one operation the earlier pages set up but never
performed: **promotion**, turning the read-only mirror into a
writable stream, and the way back to `east` afterwards.

## Match the failure to the tool

A runbook starts before the outage. The decision you don't want to make
under pressure during an outage is *which tool*. Decide it ahead of time, per failure class.

| What happened | Reach for | Why |
|---|---|---|
| The whole `east` cluster is gone | promote the mirror on `west` | The mirror already holds the data; promotion is minutes, a restore is hours. |
| Someone deleted or purged `ORDERS` by mistake | recover from the mirror on `west`, or restore the snapshot | The mirror survives an upstream delete: it keeps every message it had copied and just stops updating, so it's usually the freshest intact copy. The snapshot is the older fallback. |
| Messages on `ORDERS` are corrupt or wrong (a bad publisher) | restore a known-good snapshot, or purge the bad range | The bad data replicated to the mirror as well. The snapshot predates the corruption. |
| A consumer lost its position (`shipping` redelivering from zero) | restore a `--consumers` snapshot | Only the snapshot captured the consumer's saved delivery position. |
| The `east` data center is unusable, but the servers' disks survived | move each volume and its config to another site | Each volume carries its server's full state, including R1 streams that have no other copy. See [JetStream data recovery](./jetstream-data-recovery.md). |
| Enough `east` servers are permanently gone that the meta group has no leader | rescue the meta group, then remove the dead peers | Nothing can be created, moved, or restored while the metadata layer has no quorum. |

One principle runs through the whole table: a snapshot is the only copy
that predates a mistake. A mirror follows the upstream's live writes, so
a corrupt write replicates into it; it survives an upstream delete but
only as a copy frozen at the break, never an earlier point you chose.
That's why the chapter built both, and why
[R3 replication](/learn/clustering) is on neither row: replicating a bad
write three times doesn't undo it.

## Failover: promote the mirror

When the `east` cluster is gone, the goal is to make the `ORDERS` mirror on
`west` accept writes, so `order-svc` and the consumers can carry on there.
That's **promotion**. The animation below shows it end to end.

<div class="nats-flow" data-scenario="mirrorFailoverAnimated" data-width="600" data-height="350"></div>

While `east` is down, nothing listens on `orders.>`: the mirror has no
subjects, so a publish from any client gets `No responders`. That's the
visible sign that writes have stopped.

### Step 1 — read the mirror's state

Read how far the mirror got before contact dropped:

<div class="nats-example" data-type="learn-backup-recovery-disaster-recovery-checkLag" data-languages="cli"></div>

Look at `Last Seen` first. If `east` is unreachable, `Last Seen` grows and
`Lag` keeps the value it had when the last message arrived, often `0`.
That `0` doesn't mean the mirror has everything: whatever `east` stored
after `Last Seen` is lost, and the mirror can't tell you how much that is.
Note the last sequence and the time of `Last Seen`; that's your recovery
point.

If `east` is still reachable but degraded, wait until `Lag` reaches `0`
with a small `Last Seen` before you promote. Waiting for a lag to move
when `east` is gone only extends the outage.

### Step 2 — promote the mirror

Remove the mirror configuration and give the stream the subjects
`ORDERS` used on `east`, in one edit (NATS 2.12 and later):

```bash
nats --context west stream edit ORDERS --no-mirror --subjects "orders.>"
```

The stream on `west` is now a normal R3 stream that captures
`orders.created`, `orders.shipped`, and `orders.canceled`. The edit goes
through the meta group of the `west` domain, which the outage didn't touch.

Promotion doesn't change the data. Sequence numbers continue where the
mirror stopped: if the mirror's last message was `seq 1042`, the next write
gets `seq 1043`, so a consumer position recorded as a sequence number on
`east` still points at the same message on `west`.

A promoted stream can't become a mirror again. Going back to `east` later
means deleting it and creating a new mirror, as described under
[Failback](#failback-move-back-to-east).

### Step 3 — redirect publishers and consumers

Point `order-svc` and the consumers at `west`. The stream has the same
name there, so publishers only change the server address.

Consumers are different: a mirror copies messages, not consumers. The
`shipping` consumer you had on `east` doesn't exist on `west`, so create
it there as part of the failover, and choose where it starts, for example
from the sequence after the last one it processed.

A publish now lands on `west`:

```bash
nats --context west req orders.created \
  '{"order_id":"ord_9a1c","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
```

```
{"stream":"ORDERS","domain":"west","seq":1043}
```

The acknowledgment now names the `west` domain. Failover is complete. The
recovery time is one command plus client reconnection, and the data lost
is whatever `east` stored after the mirror's `Last Seen`.

This sequence depends on `west` having its own meta group. If the mirror
shared a meta group with `east` and that group lost its majority with
`east`, the promotion edit would fail until the meta group recovers. A meta
group that spans sites is only safe with three nearby data centers, as
described on
[Resilient cross-region clusters](../topologies/resilient-cross-region-clusters.md).

## Failback: move back to `east`

When `east` is available again, you move the writes back. It's two parts:
first `east` catches up as a mirror of `west`, then you swap the roles.

### Delete the old stream on `east` first

After a real outage, `east` comes back with its old `ORDERS`, data
included, and it still listens on `orders.>`. As soon as it has elected a
leader, a few seconds after start, both streams store every write. Each
publisher sees the acknowledgment from its own side first, the old stream
on `east` is missing everything written on `west` during the outage, and
the two streams assign different sequence numbers to the same message.

Delete it before anything else, as soon as `east` is up:

```bash
nats --context east stream rm ORDERS --force
```

If you can, keep clients from connecting to `east` until you've done this,
for example by keeping `east` out of the clients' server list.

### Part 1 — make `east` a mirror of `west`

Create a durable consumer on `west` for the new mirror, then create
`ORDERS` on `east` as a mirror of the `west` domain. The mirror's config
is the one from
[Mirrors as a DR tool](./mirrors-and-sources.md#create-the-mirror), with
the directions swapped: `"external": { "api": "$JS.west.API" }` and a
consumer named `mirror-east` that delivers on `_mirror.ORDERS.east`.

```bash
nats --context west consumer add ORDERS mirror-east \
  --target _mirror.ORDERS.east \
  --ack flow_control --flow-control --heartbeat 1s \
  --deliver all --defaults

nats --context east stream add ORDERS --config orders-mirror-of-west.json
```

The new mirror copies everything from `west`, including what was written
there during the outage. Wait until it shows `Lag: 0` with a small
`Last Seen`. Clients still write to `west`.

### Part 2 — swap the roles

Stop or pause the publishers for this part. Between the first and the
second command both streams listen on `orders.>`, and a write could land in
both with different sequence numbers.

```bash
# east becomes the writable stream again
nats --context east stream edit ORDERS --no-mirror --subjects "orders.>"

# remove the promoted stream on west
nats --context west stream rm ORDERS --force

# west becomes a mirror of east again, through a new durable consumer
nats --context east consumer rm ORDERS mirror-west --force
nats --context east consumer add ORDERS mirror-west \
  --target _mirror.ORDERS.west \
  --ack flow_control --flow-control --heartbeat 1s \
  --deliver all --defaults
nats --context west stream add ORDERS --config orders-mirror-of-east.json
```

Resume the publishers and point them back at `east`. The setup is the one
you started with: writes are acknowledged by the `east` domain, and the
mirror on `west` follows.

The old `mirror-west` consumer is removed and created again so that the
new mirror starts at the beginning of `east`'s stream, not where the old
mirror stopped.

How the mirror replicates (the start position, filters, and subject
handling) is covered in
[Mirrors and sources](/learn/jetstream/mirrors-and-sources). The runbook
only reads the mirror's state and changes the relationship.

## Recovery from a mistake: restore the snapshot

The other rows of the table roll back rather than fail over. When
corrupt messages were written to `ORDERS`, the mirror is no help, because
it copied the bad writes; the snapshot is the intact copy, taken before
the bad event. An accidental delete or purge is the exception: the mirror
keeps everything it had already replicated, so it's often the freshest
surviving copy — recover from it when it holds more than the last
snapshot, and fall back to the snapshot otherwise.

<div class="nats-example" data-type="learn-backup-recovery-disaster-recovery-restoreStream" data-languages="cli,js,go,python,java,rust,csharp"></div>

For an accidental delete, restore straight from the snapshot. Don't
recreate an empty `ORDERS` first, because restore creates the stream itself
and an existing stream of the same name makes it fail. For logical
corruption, stop the publishers first so no new bad data races in, then
either purge the corrupt sequence range or restore a known-good snapshot
that predates it. For a lost consumer position, a snapshot taken with
`--consumers` brings the durable consumer config and its delivery position
back together.

The mechanics of the snapshot itself (chunking, the `backup.json`, the
restore name rule) live one page back on
[Stream backup and restore](/learn/backup-recovery/stream-backup-restore).
Here it's one step in a larger procedure.

## Last resort: rescue the meta group

Every recovery above assumes the metadata layer still works. Streams are
created, restored, and moved by the meta group, and it needs a majority of
its peers to agree. Lose enough servers permanently — three of five gone
with their disks — and the survivors can't form that majority. There's no
leader, so `peer-remove` can't run, because removing a peer is itself a
change the meta group has to agree on.

From NATS 2.15 there's a supported way out. **Rescue** temporarily lowers
the number of peers the meta group needs, so the survivors can agree again
and you can remove the dead ones:

```bash
nats server cluster rescue
```

The command asks every server for its view first and prints what it found,
so you can see how many are actually reachable before changing anything:

```
Current Cluster State

   Server   Cluster  Size  Peers               Quorum Requires  Rescuing
   n1-east  east     5     2 online / 5 peers  3                false
   n2-east  east     5     2 online / 5 peers  3                false
```

Two servers online where quorum needs three is the situation rescue exists
for. It then asks how many peers to require, defaulting to the number still
online, broadcasts the change, and reports back per server:

```
Server "n1-east" now requires 2 quorum size (was 3)
Server "n2-east" now requires 2 quorum size (was 3)
```

The meta group elects a leader again, and you finish the job by removing
the servers that aren't coming back:

```bash
nats server cluster peer-remove n3-east
```

Only ever peer-remove a server that is stopped. In this example, these servers
are already gone, which is why you're rescuing at all, but the rule holds
everywhere: a running server that gets peer-removed disables JetStream on
itself. If one of the "dead" servers turns out to be reachable, shut it down
before removing its peer.

Once only live servers remain in the meta group, normal operation resumes
and the recoveries earlier on this page become possible again.

The full procedure, with the checks before and after each step and what
happens to the streams, is on
[Rescue Meta details](./rescue-meta-details.md).

Where more than one JetStream domain is present, you must specify the domain
in the rescue command. Each domain runs its own meta group, with its own peers
and its own quorum. A rescue lowers the quorum of exactly one of them, so on a
topology with several domains — a hub and its leaf domains, say — the command
has to be told which meta group it is rescuing. Left to guess, it stops with
`multiple domains found, pick one from ...` and lists what answered. Name the domain:

```bash
nats server cluster rescue --js-domain hub
```

This command only works when the system is unable to elect a leader, printing
`Cluster is healthy with a leader, no rescue needed`. In this case, revisit
the earlier sections of this guide to restore stream or consumer operations.
It also skips servers older than 2.15.0, naming each one, so a half-upgraded
cluster tells you which nodes it ignored.

## Pitfalls

The runbook fails most often on the order of the steps and the
assumptions around them rather than on the commands themselves.

**`Lag: 0` doesn't mean the mirror is complete.** When `east` stops
answering, `Lag` keeps its last value while `Last Seen` grows. Read both in
[step 1](#step-1--read-the-mirrors-state). With `east` gone, the data loss
is whatever it stored after `Last Seen`; with `east` reachable, wait for
`Lag: 0` before you promote.

**Delete the old stream when `east` comes back.** The returning `east`
still has its `ORDERS` listening on `orders.>`. Once it elects a leader,
writes land in both streams with different sequence numbers. Remove it
before you start the failback.

**Pause publishers during the role swap.** Between promoting `east` and
removing the stream on `west`, both listen on `orders.>`.

**R3 replication will not save you from a mistake.** A three-replica stream
survives a node loss, but an accidental delete or a bad publish replicates to
all three copies at once. R3 is availability, not a backup. Don't put it on
the mistake rows of the table; that's what snapshots are for.

**Stop publishers before purging corrupted messages.** Purging a bad
sequence range while `order-svc` is still writing lets new corrupt data arrive
behind you, so you keep purging against a tail that keeps growing. Stop the
publishers, purge or restore, then resume.

**Rescue is not peer management.** Lowering the quorum makes a smaller set
of servers authoritative over the cluster's metadata which, if not used carefully,
can cause a split-brain condition. Therefore, it is important that the servers
are genuinely never going to return. Retiring a node in the normal course is
`nats server cluster evacuate` and `nats server cluster peer-remove` while the
meta group still has a leader — never rescue.

**An untested snapshot is unverified.** A healthy `nats stream info` on the live
stream tells you the live stream is healthy; it proves nothing about the
archive in `./backups/orders/`. Rehearse the restore on a schedule
(quarterly is a reasonable minimum) into a throwaway stream or server, so the first
time you run it isn't during the outage.

## Where you are

You can now name a NATS failure and reach for the right tool quickly.
A lost site means promote the mirror on `west`: read its `Last Seen` and
`Lag`, promote it with one edit, redirect traffic. Moving back means
deleting the old stream on `east`, mirroring `west` into `east`, and
swapping the roles with publishers paused. A mistake (delete, corruption,
or a lost consumer position) means restore the snapshot, the copy that
predates the mistake — a mirror copies a corrupt write and only freezes
at an upstream delete. R3 is on neither path; it's availability, not
recovery.

The data plane is now fully covered: a snapshot you can restore to, and a site
where you can promote the mirror.

## What's next

One layer is still unprotected. If a laptop full of keys is lost, or the
servers are rebuilt clean, the data is recoverable but no one can prove who
they are: the operator JWT, the account JWTs, the nkeys, and the creds are
gone. The next page backs up the **identity** plane.

Continue to
[Config and JWT backup](/learn/backup-recovery/config-and-jwt-backup).

## See also

- [Mirrors and sources](/learn/jetstream/mirrors-and-sources) — how a mirror
  replicates, the mechanism the runbook only reads the lag of.
- [Stream backup and restore](/learn/backup-recovery/stream-backup-restore)
  — the snapshot internals the restore step depends on.
- [Clustering](/learn/clustering) — R3 leader election, the availability
  story that is not a recovery story.
- [Rescue Meta details](./rescue-meta-details.md) — the meta rescue and
  peer-remove procedure step by step.
- [JetStream data recovery](./jetstream-data-recovery.md) — recover servers
  at another site from their moved volumes.
- [Clustering → Desired state and evacuation](/learn/clustering/desired-state)
  — the ordinary way to take a server out, and what to do instead of a
  rescue while the meta group still has a leader.
