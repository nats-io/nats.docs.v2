---
id: index
title: "Backup & Recovery Deep Dive"
sidebar_position: 1
description: Keep a built NATS platform alive across a node loss, a fat-fingered delete, or a lost laptop full of keys
---

# Backup & Recovery Deep Dive

The earlier chapters built things. JetStream gave you an `ORDERS` stream
full of order events. Security gave you the `ACME` operator and the
`ORDERS` and `ANALYTICS` accounts that decide who may touch it.
Topologies spread it across the `east` cluster. This chapter doesn't
build anything new. It keeps all of that alive when something goes
wrong.

Something will go wrong. A disk fills, a region drops off the network, a
script deletes the wrong stream, a laptop holding the operator key is
left in a taxi. Each of those is a different kind of loss, and each one
needs a different kind of copy made ahead of time. This chapter is about
making those copies and putting them back.

## The three things to protect

Protecting a NATS platform means protecting three things, and none of
them protects the others. Keep this in mind for the whole chapter:

- **A snapshot** is a point-in-time copy of a stream (its messages, its
  config, and optionally its consumer state) written off-site. It's
  the point you can return to after a delete or a corruption. It answers
  "how much data can I afford to lose," your **recovery point**.
- **A mirror** is a live, read-only copy of a stream running at a second
  site, kept current by replication. It's the failover destination when
  the first one dies. It answers "how long can recovery take," your
  **recovery time**.
- **Identity** is the set of files that *are* your security layer: the
  operator and account JWTs, the nkeys that sign them, the user creds,
  and the server config. Without these, a restored stream is data nobody
  is allowed to read. They're the keys that prove who you are.

A snapshot won't bring a dead site back quickly, a mirror won't save you
from bad data (a corrupt write replicates to the mirror, and a mirror
keeps no earlier state to rewind to), and neither one matters if you've
lost the keys. You need all three, and this chapter takes them one at a
time.

### Why R3 is not on the list

You might expect replication to be the fourth item. A stream with three
replicas (R3) survives a node dying without losing a message, so it's
tempting to call it a backup, but it isn't. R3 is high availability:
several copies of the same live stream, kept identical at all times.
Being kept identical is the problem. When a bad write lands (an
accidental delete, a logic error that corrupts a message), every replica
applies it. The mistake is replicated the same way the good data is.

R3 keeps the stream *available*; only a snapshot lets you go *back* to
before the mistake. We treat R3 as availability throughout this chapter
and never as a backup. The replication and leader-election mechanics
live in the [Clustering & Replication](/learn/clustering) deep dive.

## By the end you'll have

- A dated, off-site snapshot of the `ORDERS` stream under
  `./backups/orders/`, plus a verified restore procedure that rebuilds
  it with matching message counts.
- An `ORDERS_DR` mirror of `ORDERS` running at a second site, whose
  lag you can read before trusting it.
- A runbook that picks the right recovery for each class of failure
  (restore the snapshot or promote the mirror), walked against the
  real objects.
- An off-site, encrypted copy of the platform's identity (the
  `ACME` operator and the `ORDERS` and `ANALYTICS` accounts with every
  JWT and private seed, plus the server config), and a procedure that
  puts it all back in a clean-room rebuild and re-mints any lost creds
  files.

## Who this is for

You've worked through the [JetStream deep dive](/learn/jetstream), so
you know what a stream and a consumer are. You've worked through the
[Security deep dive](/learn/security), so you know what an operator, an
account, and a user are. Ideally you have the
[Topologies deep dive](/learn/topologies) behind you too, so the `east`
cluster and a second site are familiar shapes.

This chapter assumes you now run NATS for someone else. You're past
whether it works and into what happens when it stops in production. It
doesn't re-teach how a stream stores messages, how a mirror replicates
them, or how an account trust chain validates. Instead, it links to the
chapter that owns each of those and builds the operational layer on top.

## How to read it

Each page introduces at most two new concepts and carries the same Acme
ORDERS world forward. You keep the `east` cluster and the `ORDERS`
stream running, take a snapshot of them, stand up `ORDERS_DR` beside
them, and then walk the runbook against those exact objects, with no
fresh example per page.

Where a feature has a long list of knobs, error codes, or advisory
subjects, the page covers only what you need to run the procedure and
links to [Reference](/reference/) for the exhaustive detail.

Two boundaries are deliberate, because another chapter already owns
them. *How* a mirror replicates lives in
[JetStream → Mirrors and sources](/learn/jetstream/mirrors-and-sources);
here we only apply a mirror to disaster recovery and read its lag.
*What* an operator or account is lives in
[Security → Operator mode](/learn/security/operator-mode); here we only
copy those files off-site and put them back.

## Map

| Page | What you learn |
|---|---|
| [Stream backup and restore](/learn/backup-recovery/stream-backup-restore) | Take a point-in-time snapshot of `ORDERS`, restore it, and verify the counts match |
| [Mirrors as a DR tool](/learn/backup-recovery/mirrors-and-sources) | Stand up `ORDERS_DR` at a second site, read its lag, and see why a mirror is not a backup |
| [Disaster recovery](/learn/backup-recovery/disaster-recovery) | A runbook that picks restore or promotion per failure class, and how to promote a mirror |
| [Config and JWT backup](/learn/backup-recovery/config-and-jwt-backup) | Back up and restore the operator, accounts, keys, and server config off-site |
| [Where to go next](/learn/backup-recovery/where-next) | The whole game recapped, plus a single production checklist |

## Prerequisites

You'll need the world the earlier chapters built, running locally:

- A `nats-server` with **file** storage and JetStream enabled, holding
  the `ORDERS` stream. Memory streams can't be snapshotted, so file
  storage isn't optional here.
- The `nats` CLI installed and pointed at that server.
- The `nats auth` store from the Security chapter (the tree under
  `$XDG_DATA_HOME/nats`), holding the `ACME` operator and the `ORDERS`
  and `ANALYTICS` accounts.
- A second place to put copies: a second site for the mirror, and any
  off-site location (another disk, a bucket) for snapshots and identity.

Open a terminal, confirm `nats stream info ORDERS` returns your stream,
and turn to
[Stream backup and restore](/learn/backup-recovery/stream-backup-restore).

## See also

- [JetStream → Mirrors and sources](/learn/jetstream/mirrors-and-sources) — how a mirror actually replicates, which this chapter applies but doesn't re-teach.
- [Security → Operator mode](/learn/security/operator-mode) — what the operator, accounts, and users are, the identity this chapter backs up.
- [Clustering & Replication](/learn/clustering) — the R3 mechanics this chapter deliberately leaves out.
