---
id: stream-backup-restore
title: "Stream backup and restore"
sidebar_position: 2
description: Take a point-in-time snapshot of the ORDERS stream, restore it byte-identical, and verify the counts match
---

# Stream backup and restore

The `ORDERS` stream holds every order Acme has ever taken. Replication
keeps it available when a node dies, but it doesn't protect you from a
mistake: an accidental `nats stream purge`, a bad migration, or a logic bug
that deletes the wrong messages. To recover from those you need a copy
the cluster can't touch — a point in time you can return to.

This page makes that copy and proves it works. It introduces two
operations and nothing else: taking a snapshot of `ORDERS`, and restoring the
stream from one.

## A snapshot is a point-in-time copy

A **snapshot** is a complete copy of a stream as it exists at one
instant: every message, the stream's configuration, and, if you ask for
it, the state of its consumers. The server takes the snapshot and
streams it to you in chunks; the CLI writes those chunks to a directory.

That directory holds two things. A `backup.json` file records the
stream's configuration and state: its subjects, retention, limits, and
sequence range. Alongside it, `stream.tar.s2` is the messages
themselves, packed into a tarball and compressed with S2. Together
they're everything you need to recreate the stream from scratch.

Take a snapshot of `ORDERS` into a dated, off-site directory:

<div class="nats-example" data-type="learn-backup-recovery-stream-backup-restore-backup" data-languages="cli,js,go,python,java,rust,csharp"></div>

The directory name carries the date on purpose. A snapshot is a point in
time, and naming it `2026-06-04` makes that explicit. Tomorrow's snapshot
goes in `2026-06-05`, and you keep the dated snapshots under
`./backups/orders/`. We make that automatic later; here it's one
command.

Consumer state matters more than it looks. By default the snapshot
records each durable consumer's config and delivery position: the
**consumer state**. Restore that snapshot and the `shipping` and
`analytics` consumers come back exactly where they left off, not at the
start of the stream. Pass `--no-consumers` and the snapshot carries the
messages but forgets the consumers reading them, so keep the default when
you back up a production stream.

## How the snapshot streams off the server

A snapshot doesn't arrive as one big download. The server cuts the
tarball into chunks and pushes them to an inbox subject, keeping up to a
window's worth of unacknowledged chunks in flight at once — 8 MiB by
default, which is 64 of the default 128 KiB chunks. Each client ack frees
a slot for the next chunk, and if no ack arrives for about five seconds
the backup aborts. That windowed backpressure keeps a large stream from
overwhelming a slow disk or a high-latency link.

<div class="nats-flow" data-scenario="streamSnapshotAnimated" data-width="600" data-height="350"></div>

The request lands on the snapshot API, the server answers with the
config and state, and then the message chunks flow to the inbox with an
ack per chunk until the tarball and `backup.json` are written to the
backup store. The two settings that govern this, chunk size and window
size, have sensible defaults, and you only change them when the
defaults time out. We cover them in the [Pitfalls](#pitfalls).

The full set of snapshot request options is documented in
[Reference → Snapshot Stream](/reference/jetstream/api/stream/snapshot).
We only need the behavior here.

## Restore rebuilds the stream

A snapshot becomes useful when you turn it back into a stream.
**Restore** reads a snapshot directory and recreates the stream from it:
same messages, same sequence numbers, same configuration. If the snapshot
included consumer state, restore brings the consumers back too.

Restore the directory you just wrote:

<div class="nats-example" data-type="learn-backup-recovery-stream-backup-restore-restore" data-languages="cli,js,go,python,java,rust,csharp"></div>

One rule shapes how you use restore: **the stream name cannot change on
restore.** The name lives in `backup.json`, and the server rejects a
restore that would land under a different name. A snapshot of `ORDERS`
restores as `ORDERS`, never as `ORDERS_COPY`. That keeps a restore
unambiguous: it rebuilds one stream under its own name rather than forking it
into a new one. If you
do need a second copy under a new name, restore to `ORDERS` first and
then mirror or source it, which
[Mirrors and sources](/learn/backup-recovery/mirrors-and-sources) covers.

Restore also expects the stream not to already exist. It recreates the
stream; it doesn't merge a snapshot into a live one. So a real recovery
is: confirm the broken stream is gone (or remove it), then restore.

## Verify the counts

A restore you didn't check is unverified. The last step is always to read
the rebuilt stream's state back and confirm it matches the source.

<div class="nats-example" data-type="learn-backup-recovery-stream-backup-restore-verify-counts" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

Look at the `State` block. `Messages` and `Last Sequence` must match the
stream you snapshotted, and `Active Consumers` shows `shipping` and
`analytics` back if you used `--consumers`. Matching counts are what prove
the archive is real; the backup command exiting zero does not prove it on
its own.

## Pitfalls

Four common pitfalls, each scoped to this page's two operations: snapshot
and restore.

**Memory streams cannot be snapshotted.** A snapshot reads a stream's
on-disk files, so a stream with `Storage: Memory` has nothing to read.
The backup fails with `memory streams do not support snapshots`. Any stream
you want to back up needs file storage: set `Storage: File` when you
create it. Check the storage type before you rely on a snapshot, rather than
finding out during an incident:

<div class="nats-example" data-type="learn-backup-recovery-stream-backup-restore-backup" data-languages="cli,js,go,python,java,rust,csharp"></div>

If that command errors on a memory stream, recreate the stream with file
storage before it holds anything you can't lose.

**The stream name cannot change on restore.** As above, the server
rejects a restore that would rename the stream with `stream name may not
be changed during restore`. Restore to the original name. If you need a
copy under a different name, restore first and then mirror or source it;
[Mirrors and sources](/learn/backup-recovery/mirrors-and-sources) covers
that.

**Flow control can time out on slow disks or distant links.** The server
waits a few seconds for the client to acknowledge each chunk. On a slow
disk or a high-latency link the acknowledgment can arrive late, and the
backup aborts with a flow-control timeout (`408 No Flow Response`). The
fix is to send smaller chunks and a smaller window so each round trip is
cheaper:

```bash
# Smaller chunks and a smaller window survive a slow or distant link.
nats stream backup ORDERS ./backups/orders/2026-06-04 \
  --consumers --chunk-size 64k --window-size 1m
```

**`--no-consumers` silently drops consumer state.** Consumer state is
included by default; pass `--no-consumers` and the snapshot carries
messages only. The restore rebuilds the stream with no consumers, and
nothing warns you until `shipping` is missing in production. Keep the
default unless you plan to recreate every consumer by hand.

## Where you are

You now have:

- A dated, off-site snapshot of `ORDERS` under `./backups/orders/`:
  `backup.json` plus a compressed `stream.tar.s2`.
- A restore procedure that rebuilds the stream byte-identical, under its
  original name, with its consumers intact.
- A verification step that proves the restore by matching message counts.

This is your recovery point: the instant you can return to after an
accidental delete or a logic error. On its own, though, it won't protect
you from losing the whole site. For that you need a live copy somewhere
else.

## What's next

The next page stands up that live copy. A **mirror** of `ORDERS` at a
second site keeps a continuously updated copy you can fail over to, and
it distinguishes a snapshot (your recovery point) from a
mirror (your recovery time).

Continue to
[Mirrors and sources](/learn/backup-recovery/mirrors-and-sources).

## See also

- [Reference → Snapshot Stream](/reference/jetstream/api/stream/snapshot)
  — every snapshot request option and its valid range.
- [Reference → Restore Stream](/reference/jetstream/api/stream/restore)
  — the restore request schema.
- [Reference → Snapshot Create Advisory](/reference/jetstream/advisory/snapshot-create)
  — the event the server emits when a snapshot starts, for backup alerting.
