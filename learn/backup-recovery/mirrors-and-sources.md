---
id: mirrors-and-sources
title: Mirrors as a DR tool
sidebar_position: 3
description: Stand up a cross-site mirror of ORDERS for disaster recovery, read its lag, and learn why a mirror is not a backup
---

# Mirrors as a DR tool

The last page gave you a **snapshot**, a point-in-time copy of `ORDERS`
you can restore from. A snapshot gets back the data as it stood at the
moment you took it. The data written *since* that moment is gone, and a
restore takes as long as it takes to stream the archive back in.

This page adds the second tool of the triad: a **mirror**. A mirror
is a read-only live copy of `ORDERS` running at a second site, kept current
by replication. A snapshot answers "what point can I return to", and a
mirror answers "what site can I promote to take over". You'll stand one up,
watch how far it trails the original, and learn the one statement that
keeps a mirror from being treated as more than it is.

This page applies a mirror to disaster recovery. It doesn't teach how
a mirror replicates internally (the start position, the subject
handling, the fan-in rules). That mechanism is taught in full at
[Mirrors & sources](/learn/jetstream/mirrors-and-sources), and this page
links to it rather than repeating it.

## A mirror is a live copy at a second site

So far the `ORDERS` stream lives on the `east` cluster
(`n1-east`/`n2-east`/`n3-east`). That cluster is one site. If the whole
site fails (a power loss, a network partition that strands the
region, a data-center failure), every replica of `ORDERS` fails with
it. The R3 replication that protects you from losing *one node* does
nothing when you lose the *whole cluster*.

A mirror lives somewhere else. Call the second site `site2`: a separate
cluster, reachable from the primary over a gateway or leaf-node link you
built in the Topologies chapter. On `site2` you create a stream named
`ORDERS_DR` whose only job is to copy `ORDERS`. It accepts no direct
writes from your services. It receives every message the upstream
stores and stores it too.

The stream `ORDERS_DR` copies from is its **upstream stream** (here,
`ORDERS` on `east`). The copy flows one way: upstream to mirror, never
back.

Create the mirror on `site2`, pointing it at the upstream:

```bash
# Run against a server in site2, where ORDERS_DR will live.
nats --server nats://site2:4222 stream add ORDERS_DR \
  --mirror ORDERS --defaults
```

The `--mirror ORDERS` flag is the whole DR setup from the data side;
`--defaults` just accepts the standard storage and retention answers
instead of prompting for them. The server on `site2` opens a replication
link to the upstream and
begins pulling messages. Every order that lands in `ORDERS` on `east`
shows up in `ORDERS_DR` on `site2` a short time later.

Decide the topology before you run that command, because a mirror's
configuration is fixed once the stream exists: you can't re-point a
running mirror at a different upstream or change what it copies in place.
Changing it means deleting `ORDERS_DR` and recreating it, after which the
messages re-replicate from the upstream. Plan the upstream, the site, and
the subjects you want once, upfront.

The full set of mirror configuration (start position, subject filtering,
sourcing from many streams) is covered at
[Mirrors & sources](/learn/jetstream/mirrors-and-sources). For disaster
recovery you only need the plain 1:1 copy above.

<div class="nats-flow" data-scenario="mirrorDRAnimated" data-width="600" data-height="350"></div>

The animation shows the steady state: `order-svc` writes the canonical
order to `ORDERS` on the `east` cluster, and each message replicates across to
`ORDERS_DR` on `site2`. Watch the `Lag` counter: it's the next concept,
and it's the number that determines the outcome of a failover.

## Lag is how far the mirror trails

Replication isn't instant or synchronous. The upstream stores
a message and acknowledges the publisher *before* the mirror has it. The
mirror catches up a moment later. That gap is called
**lag**: how many messages the mirror trails behind its upstream.

You read lag from the mirror's own stream info:

```bash
nats --server nats://site2:4222 stream info ORDERS_DR
```

The output carries a `Mirror` section the upstream stream doesn't have:

```
Mirror Information:

  Stream Name: ORDERS
          Lag: 0
    Last Seen: 1.20s
```

Three fields are relevant here: `Stream Name`, `Lag`, and `Last Seen`.

`Stream Name` confirms the upstream this mirror copies: `ORDERS`. If it
says anything else, the mirror points at the wrong source.

`Lag` is the count of messages the upstream has that the mirror doesn't
have yet. `Lag: 0` means the mirror holds every message the upstream holds.
Any number above zero is the data you'd lose if the primary vanished
this instant.

`Last Seen` is how long ago the mirror last heard from its upstream. A
small number, a second or two, means the link is healthy. A growing
`Last Seen` means the mirror is no longer keeping up, and the `Lag` you
read is already stale.

These two numbers are your **RPO**, the recovery point objective: how much
data you can afford to lose. A mirror at `Lag: 0` gives you an RPO of
zero messages; a mirror that trails by thousands gives you an RPO of
thousands. Read this number *before* you ever trust the mirror in a real
failover. The disaster-recovery page makes "is lag zero?" the first step
of promotion for exactly this reason.

A failover isn't the only time to look. A mirror that quietly stops
keeping up is worth catching long before the day you need it, so watch
`Lag` continuously rather than checking it once. The server surfaces the
same `Lag` and `Last Seen` fields through its monitoring endpoints for an
alert to scrape (in the JSON the last-seen field is named `active`).
Wiring that up is the [Monitoring](/learn/monitoring)
chapter's job.

## A mirror is not a backup

One statement captures the limit of a mirror:

> A mirror follows the upstream's live writes, so a corrupt write lands
> in the mirror too — and a mirror keeps no earlier state to rewind to.

A mirror gives you **availability**. Lose the whole `east` site and
`ORDERS_DR` on `site2` still holds your orders, ready to take over. That's
a matter of recovery *time*: your **RTO**, how long recovery takes. A
mirror's RTO is short, because the data is already there.

A mirror does not give you a **recovery point** you can rewind to. It
tracks the upstream's live tail: write a corrupt batch and the
corruption replicates into `ORDERS_DR` as faithfully as a good write. The
mirror holds only what the upstream has now, never an earlier state, and
its own retention limits can age messages out on their own schedule.

An upstream delete or purge behaves differently from what people expect.
Delete the upstream `ORDERS` and `ORDERS_DR` is *not* deleted with it: it
keeps every message it had already copied, stops receiving new ones, and
records the fault in the `Error` field of its Mirror Information. Purge a
range on the upstream and the messages the mirror already stored stay
put; the purge only caps what the mirror will still receive, because it
detects the sequence gap and skips the missing messages. So a mirror can
outlive a mistake on the upstream — but only as a stale copy frozen at
the break, never as a point in time you chose.

A snapshot differs here. It's fixed at the moment you took it, so a
delete or a corruption that happens *after* the snapshot can't affect it.
Because it's fixed, you can rewind to it.

So the two tools cover two different failures, and you need both:

- **Mirror** → the site failed. Promote the copy and redirect traffic to it.
  Short RTO, no data loss if lag was zero.
- **Snapshot** → the data is wrong (deleted, purged, corrupted). Restore
  the point in time before it went wrong. Bounded RPO, restore-length
  RTO.

Don't let a healthy mirror be your reason to stop taking snapshots. A
mirror doesn't protect against the failure snapshots exist for.

And don't reach for R3 replication here either. R3 keeps `ORDERS` available
across the loss of one node in the `east` cluster: availability inside
one site, not a backup and not a second site. A corrupt write replicates
across all three R3 replicas just as faithfully as it lands in a mirror.
Why R3 is availability and never a backup is taken up on the
[disaster-recovery](/learn/backup-recovery/disaster-recovery) page, and
leader election is covered at [Clustering](/learn/clustering).

## Pitfalls

A mirror is easy to create and easy to over-trust. Each trap below is
scoped to this page's two ideas: the mirror as a DR copy, and the
distinction between a mirror and a backup.

**A mirror is not a backup.** It's the main point of this page and the
most common mistake. Corrupt the upstream and the corruption replicates
into the mirror as faithfully as a good write; delete or purge the
upstream and the mirror survives only as a stale copy frozen where
replication stopped. Either way it gives you no earlier state to rewind
to. Don't run a mirror *instead of* snapshots. Pair them: the mirror for
site failure, the snapshot for bad data.

**Read `Lag` before you trust the copy.** Replication is eventually
consistent, not synchronous, so a mirror can trail its upstream by an
unknown amount at any moment. If you've never checked a mirror, you don't
know how far it trails. Read `Lag` and `Last Seen` from the mirror's
stream info and confirm the link is current before you depend on it:

```bash
# Confirm ORDERS_DR is caught up. Lag should read 0, and Last Seen
# should be a small, recent number. A growing Last Seen means the
# Lag you just read is already stale — the link is falling behind.
nats --server nats://site2:4222 stream info ORDERS_DR | grep -A4 "Mirror Information"
```

If `Lag` is non-zero or `Last Seen` keeps climbing, the mirror is behind.
Diagnose the link before a failover, never during one.

**A mirror's config is effectively locked after creation.** As the setup
section warned, you can't re-point a running mirror or change what it
copies in place. Don't treat `ORDERS_DR` as something you'll tune
later; settle the upstream, the site, and the subjects upfront. To
change any of them, delete the mirror and recreate it, and the messages
re-replicate from the upstream.

**Avoid a Work Queue upstream under a mirror.** A Work Queue stream is
built to hand each message to exactly one consumer. To replicate, a
mirror creates a hidden internal consumer on the upstream, and that
consumer is a *direct* consumer that bypasses the work queue's
subject-overlap check. So a regular worker and the mirror's consumer can
both receive the same message, which defeats precisely the single-consumer
guarantee the work queue exists to enforce. Use a `Limits` upstream
instead; the retention policies are covered at
[Mirrors & sources](/learn/jetstream/mirrors-and-sources).

## Where you are

You now have:

- An `ORDERS_DR` mirror running at `site2`, copying `ORDERS` from the
  `east` cluster one message at a time.
- A way to read its `Lag` and `Last Seen` fields, and the knowledge that
  `Lag: 0` is the condition that makes a failover safe.
- The distinction between the two DR tools: a mirror gives you a short RTO
  for a site failure; a snapshot gives you a recovery point for bad data.
  Neither replaces the other, and R3 replaces neither.

What you *don't* have yet is the procedure for actually using the mirror
when the primary fails: verifying lag, promoting the copy to a writable
primary, and redirecting your publishers and consumers to `site2`. That
procedure is the runbook.

## What's next

The next page is the disaster-recovery **runbook**: which tool to reach
for per failure class, and the exact steps to **promote** `ORDERS_DR`
into a writable `ORDERS` when the `east` site is gone.

Continue to
[Disaster recovery](/learn/backup-recovery/disaster-recovery).

## See also

- [Mirrors & sources](/learn/jetstream/mirrors-and-sources) — how a
  mirror replicates: start position, subject handling, and sourcing.
- [Cross-account export & import](/learn/security/cross-account) — what a
  cross-account mirror's export/import is, which you must back up too.
- [Super-clusters](/learn/topologies/super-clusters) — the gateway links
  that connect `east` to `site2`.
