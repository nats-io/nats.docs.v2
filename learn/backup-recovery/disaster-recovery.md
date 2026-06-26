---
id: disaster-recovery
title: Disaster recovery
sidebar_position: 4
description: A runbook that picks restore-from-snapshot or promote-the-mirror per failure class, then promotes ORDERS_DR cleanly
---

# Disaster recovery

You now have two tools. A **snapshot** of `ORDERS` sits off-site under
`./backups/orders/`, and a live **mirror**, `ORDERS_DR`, runs at `site2`.
Each protects against a different failure, and reaching for the
wrong one during an outage costs you either data or hours.

This page is the **runbook**: an ordered procedure that names the failure,
picks the right tool, and carries out the recovery against the real `ORDERS`
deployment. It also covers the one operation the earlier pages set up but never
performed: **promotion**, turning the read-only `ORDERS_DR` into a
writable primary.

## Match the failure to the tool

A runbook starts before the outage. The decision you don't want to make
under pressure during an outage is *which tool*. Decide it ahead of time, per failure class.

| What happened | Reach for | Why |
|---|---|---|
| The whole `east` cluster is gone | promote `ORDERS_DR` | The mirror already holds the data; promotion is minutes, a restore is hours. |
| Someone deleted or purged `ORDERS` by mistake | restore the snapshot | The mirror followed the delete, so it's gone there too. The snapshot is the only intact copy. |
| Messages on `ORDERS` are corrupt or wrong (a bad publisher) | restore a known-good snapshot, or purge the bad range | The bad data replicated to the mirror as well. The snapshot predates the corruption. |
| A consumer lost its position (`shipping` redelivering from zero) | restore a `--consumers` snapshot | Only the snapshot captured the consumer's saved delivery position. |

One principle runs through the whole table: **a mirror recovers a site, a
snapshot recovers a mistake.** A mirror is an exact live copy, so it
also copies your errors. That's why the chapter built both, and
why [R3 replication](/learn/clustering) is on neither row: replicating a
bad write three times doesn't undo it.

## Failover: promote the mirror

When the `east` cluster is gone, the goal is to make `ORDERS_DR` start accepting
writes so `order-svc` and the consumers can carry on at `site2`. That's
promotion, and it's a short, ordered sequence. The animation below
shows it end to end.

<div class="nats-flow" data-scenario="mirrorFailoverAnimated" data-width="600" data-height="350"></div>

### Step 1 — verify the lag is zero

A mirror trails its upstream by some **lag**: the count of messages it
hasn't copied yet. Promote it while lag is non-zero and you start publishing on
top of a stream that's still missing its tail. So the first runbook step is
always the same: read the lag.

<div class="nats-example" data-type="learn-backup-recovery-disaster-recovery-checkLag" data-languages="cli,js,go,python,java,rust,csharp"></div>

If the `east` site is fully unreachable, the mirror can't reach its upstream and the lag
stops at whatever it was when contact dropped. That stalled number is your
real recovery point: the messages written to `ORDERS` after the last
successful copy are lost. Note it, then proceed. Waiting for a lag that will
never move to zero only extends the outage.

### Step 2 — drop the mirror config

A mirror is **read-only** by design: it rejects direct publishes because its
only job is to follow its upstream. To make `ORDERS_DR` writable, you remove
the mirror relationship from its configuration.

```bash
# At site2: edit ORDERS_DR so it is no longer a mirror.
# Removing the mirror source makes the stream a standalone primary.
nats --server nats://site2:4222 stream edit ORDERS_DR --no-mirror
```

Once the mirror config is gone, the stream stops following `east`. It still
holds every message it had copied. Promotion doesn't touch the data, only
the relationship.

### Step 3 — add the subjects so it accepts writes

A mirror has no subjects of its own; it receives messages through the mirror
mechanism, not by listening on `orders.>`. A writable primary needs to *bind*
those subjects so publishers can reach it. Add them:

```bash
# Give the promoted stream the subjects ORDERS used to own.
nats --server nats://site2:4222 stream edit ORDERS_DR --subjects "orders.>"
```

`ORDERS_DR` now captures `orders.created`, `orders.shipped`,
`orders.cancelled` — the same subjects the lost primary held. It now functions
as a full primary.

### Step 4 — redirect publishers and consumers

The last step redirects traffic. Point `order-svc` and the consumers at `site2` and
they resume against the promoted stream:

```bash
# Publishers and consumers now connect to site2.
nats --server nats://site2:4222 pub orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
```

The order JSON is byte-for-byte what `order-svc` always sent; only the server
address changed. Failover is complete: the platform writes and reads at
`site2`, and the data loss is exactly the stalled lag you noted in step 1.

How the mirror replicated those messages in the first place (the config,
the filters, the start position) is the JetStream chapter's job, covered in
[Mirrors and sources](/learn/jetstream/mirrors-and-sources). The runbook only
reads the lag and changes the relationship.

## Recovery from a mistake: restore the snapshot

The other rows of the table roll back rather than fail over. When `ORDERS`
was deleted, purged, or filled with corrupt messages, the mirror is no help,
because it copied the bad data. The snapshot is the intact copy, taken before the bad
event.

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

## Pitfalls

The runbook fails most often on the order of the steps and the
assumptions around them rather than on the commands themselves. Four common mistakes happen mid-outage.

**Never promote a mirror before lag reaches zero.** Promotion makes the
mirror writable. If you do it while messages are still in flight from the
upstream, those tail messages are lost and new writes land on top of the
gap. Always run the lag check first, and only proceed at `Lag: 0` or with a
stalled lag you've consciously accepted as your recovery point. Read the lag
and don't skip step 1.

You can make that check a gate. Run the lag check from
[step 1 above](#step-1--verify-the-lag-is-zero), decide on the number, then
promote, never the reverse.

**R3 replication will not save you from a mistake.** A three-replica stream
survives a node loss, but an accidental delete or a bad publish replicates to
all three copies at once. R3 is availability, not a backup. Don't put it on
the mistake rows of the table; that's what snapshots are for.

**Stop publishers before purging corrupted messages.** Purging a bad
sequence range while `order-svc` is still writing lets new corrupt data arrive
behind you, so you keep purging against a tail that keeps growing. Stop the
publishers, purge or restore, then resume.

**An untested snapshot is unverified.** A healthy `nats stream info` on the live
stream tells you the live stream is healthy; it proves nothing about the
archive in `./backups/orders/`. Rehearse the restore on a schedule
(quarterly is a reasonable minimum) into a throwaway stream or server, so the first
time you run it isn't during the outage.

## Where you are

You can now name a NATS failure and reach for the right tool quickly.
A lost site means promote `ORDERS_DR`: verify lag, drop the mirror
config, add the subjects, redirect traffic. A mistake (delete, corruption,
or a lost consumer position) means restore the snapshot, because the mirror
copied the mistake. R3 is on neither path; it's availability, not recovery.

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
