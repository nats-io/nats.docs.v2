---
id: where-next
title: "Where to go next"
sidebar_position: 6
description: Recap the backup-and-recovery triad and point to what comes after this chapter
---

# Where to go next

You started this chapter with a built but unprotected platform: an
`ORDERS` stream full of real orders, the `ACME` operator and its
accounts deciding who may touch them, all spread across the `east`
cluster, with no backup or recovery in place. You end
it with a dated snapshot under `./backups/orders/`, an `ORDERS_DR` mirror
running at a second site, and an encrypted off-site copy of every key
that proves who you are. That covers the full progression.

This page doesn't teach anything new. It collects the model you built
into one place and points you at the chapters and Reference that take it
further.

## The three copies

Every page in this chapter covered the same three ideas. They protect
against different failures, and they don't protect each other. These are
the key points to retain.

A **snapshot** is the point you can return to. It's a point-in-time
copy of a stream (its messages, its config, and optionally its consumer
state) written off-site. When a delete or a corruption occurs, the
snapshot is the only thing that lets you go *back* to before the
mistake. It answers how much data you can afford to lose: your
**recovery point**.

A **mirror** is the site you can fail over to. It's a live, read-only
copy of `ORDERS` running at a second site, kept current by replication
and tracked by its `Lag`. It doesn't give you a point in the past; it
gives you a place to keep running when the first site fails. It answers
how long recovery may take: your **recovery time**.

**Identity** is the proof of who you are. It's the set of files that
*are* your security layer: the operator and account JWTs, the nkeys
that sign them, the user creds, and the server config. A restored stream
that nobody is allowed to read is not a recovery. Without these files the
data plane comes back but the platform stays unusable.

The three are snapshot, mirror, and identity. The item that is *not* on
the list: **R3 is availability, not a backup.** Three replicas keep a
stream alive through a node loss, but a bad write replicates to all three
just as a good one does. R3 keeps the stream up; only a snapshot lets you
undo a mistake.

## Where the details live

The chapter is unversioned and concept-first. The exact flags, defaults,
and ranges live in **Reference**, which is versioned and exhaustive. When
you need the precise chunk-size clamp on a snapshot request, the full
restore schema, or the advisory subjects to alert on, that's where to
look.

The [Reference root](/reference/) is the entry point. The handoff
phrases throughout this chapter ("the full set of options is documented
in Reference") all point into it. The snapshot and restore request
schemas live at
[Snapshot Stream](/reference/jetstream/api/stream/snapshot) and
[Restore Stream](/reference/jetstream/api/stream/restore); the resolver
knobs behind identity restore live at
[resolver config](/reference/config/resolver).

## Sibling deep dives

This chapter sits in the Operate half of Learn, downstream of the
chapters that *built* the platform. The others around it go deeper than
any single page here could.

The [JetStream deep dive](/learn/jetstream) is where the data this
chapter protects comes from, and where the mirror mechanism is
taught in full. When you want to know *how* a mirror replicates (start
position, filters, fan-in), read
[JetStream → Mirrors and sources](/learn/jetstream/mirrors-and-sources).
This chapter only applies a mirror to disaster recovery and reads its
lag.

The [Security deep dive](/learn/security) is where the identity this
chapter backs up comes from. When you want to know *what* an operator,
account, or signing key is, and how a trust chain validates, read
[Security → Operator mode](/learn/security/operator-mode). This chapter
only copies those files off-site and puts them back.

The [Clustering & Replication deep dive](/learn/clustering) owns the R3
story this chapter deliberately set aside: how a stream elects a leader,
how placement works, and why replication is availability rather than a
recovery point.

The [Monitoring deep dive](/learn/monitoring) covers the other half of
running this safely: watching the snapshot advisories fire, alerting on
a mirror whose lag stops trending to zero, and proving a restore worked
before you need it.

The [Deployment deep dive](/learn/deployment) covers sizing the disks
and store directories that a restored stream lands on, the capacity
question this chapter assumes you've already answered.

## Where you are

This is the end of the chapter: the triad is complete, and this page
introduces no new scenario state. The `east` cluster, the `ORDERS`
stream, the `ORDERS_DR` mirror at the second site, and the off-site
identity backup are all exactly as you left them on the previous page.
You can rehearse a failover against them, schedule a test restore, or
tear the practice copies down when you're done.

You have the operational model: a snapshot for the point you can return
to, a mirror for the site you can fail over to, identity backup for the
keys that prove who you are — and R3 as availability, never as any of
those three.

## Production checklist

Every content page in this chapter closed with a Pitfalls section. This
page collects the action items from all of them in one place: a last pass
before you trust this platform with real orders and a real outage. Each
group links back to the page that explains the why.

### Stream backup and restore — see [Pitfalls](/learn/backup-recovery/stream-backup-restore#pitfalls)

- [ ] Use file storage for any stream you must snapshot; a memory stream cannot be backed up and the attempt fails outright.
- [ ] Restore to the original stream name; the name may not change during restore, so mirror or source afterward if you need a copy under a new name.
- [ ] Reduce `--chunk-size` and `--window-size` on a slow disk or a high-latency link before the flow-control timeout fires and aborts the snapshot.
- [ ] Keep consumer state in the snapshot; it is included by default, and passing `--no-consumers` silently drops durable consumer config and delivery position.

### Mirrors as a DR tool — see [Pitfalls](/learn/backup-recovery/mirrors-and-sources#pitfalls)

- [ ] Pair every mirror with snapshots; a mirror is not a backup — a corrupt write replicates to the copy, and a mirror keeps no earlier state to rewind to.
- [ ] Plan the mirror topology upfront; a mirror's config is effectively locked after creation, so changing it means delete and recreate.
- [ ] Read the `Lag` field before trusting a mirror; replication is eventually consistent, not synchronous.
- [ ] Avoid Work Queue retention on a mirrored upstream; the mirror's internal consumer bypasses the work queue's subject-overlap check and breaks the single-consumer guarantee, so use Limits.

### Disaster recovery — see [Pitfalls](/learn/backup-recovery/disaster-recovery#pitfalls)

- [ ] Verify lag has reached 0 before promoting a mirror; promote early and you publish on top of a stream still missing its tail.
- [ ] Reach for a snapshot, not R3, against an accidental delete or a logical error; the bad write replicates, so availability cannot undo it.
- [ ] Test restore on a schedule, quarterly at least; a green `nats stream info` on the live stream proves nothing about the archive.
- [ ] Stop publishers before purging corrupted messages; purging under live writes races new bad data in.

### Config and JWT backup — see [Pitfalls](/learn/backup-recovery/config-and-jwt-backup#pitfalls)

- [ ] Seal every `nats auth operator backup` with `--key` and store the curve seed apart from the backups; the file carries every private seed, and losing store plus key together is losing the identity.
- [ ] Re-push each account after an identity restore if the server lost its resolver directory; the restore rebuilds only your store, and the push needs the `server.conf` whose `SYSTEM` preload lets it in — so back that file up too.
- [ ] Tag each identity backup with the operator version or timestamp; an unrecorded operator rotation leaves the backup pointing at a dead operator.

## See also

- [Reference](/reference/) — every config field, flag, default, and error code behind this chapter, versioned and exhaustive.
- [JetStream → Mirrors and sources](/learn/jetstream/mirrors-and-sources) — how a mirror actually replicates, the mechanism this chapter applies but never re-teaches.
- [Clustering & Replication deep dive](/learn/clustering) — the R3 story this chapter deliberately set aside.
