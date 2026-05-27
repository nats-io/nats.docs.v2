---
id: where-next
title: "18. Where to go next"
sidebar_position: 19
description: Recap the JetStream mental model and point to what comes after this chapter
---

# 18. Where to go next

You started this chapter with a publisher shouting into the void and no
one guaranteed to be listening. You end it with an `ORDERS` stream, a
handful of consumers reading it at their own pace, and a mirror keeping a
permanent copy. That is the whole arc.

This page does not teach anything new. It collects the model you built
into one place and points you at the chapters and Reference that take it
further.

## The whole game in three words

Every page in this chapter circled the same three ideas. If you remember
nothing else, remember these.

A **stream** is a server-side log of messages. You publish to a subject,
the server appends the message to any stream that captures that subject,
and it stays there — replayable — until a limit removes it. The stream
is what core NATS lacked: a place for a message to wait.

A **consumer** is a cursor over a stream. It tracks which messages a
reader has seen, independent of every other consumer. Two consumers on
the same stream read the same messages at different positions, and
neither one disturbs the other.

An **ack** is the reader's promise that a message is handled. Until the
consumer acks, the message stays in flight, and the server redelivers it
after a timeout. The ack is what turns "the message was stored" into
"the work is done."

Stream, consumer, ack. Everything else in this chapter — filtering,
worker pools, retention, mirrors — is a refinement of those three.

## Where the details live now

The chapter is unversioned and concept-first. The exact flags, defaults,
and ranges live in **Reference**, which is versioned and exhaustive. When
you need the precise type of a config field or the full list of consumer
options, that is where to look.

The [Reference root](/reference/) is the entry point. The handoff
phrases throughout this chapter — "the full set of options is documented
in Reference" — all point into it.

## Sibling deep dives

This was the first deep dive. The others build on the same foundation, so
the stream-consumer-ack model carries straight into them.

The [Key-Value deep dive](/learn/key-value) shows how a key-value bucket
is a stream underneath. The keys map to subjects, the history maps to
sequence numbers, and a watch is a consumer. Everything you learned about
retention and limits applies directly.

The [Object Store deep dive](/learn/object-store) does the same for large
blobs. An object is chunked across many messages in a stream, then
reassembled on read. The stream is still the storage layer.

The [Clustering & Replication deep dive](/learn/clustering) goes deeper
than this chapter's single page on surviving node loss. It covers how
`R=3` actually elects a leader, how placement works, and what happens
during a node failure.

The [Monitoring deep dive](/learn/monitoring) covers how to watch a
stream and its consumers in production — advisories, health endpoints,
and the metrics that tell you a consumer is falling behind.

The [Backup & Recovery deep dive](/learn/backup-recovery) covers the
operational side: snapshotting a stream, restoring it, and using the
mirrors you met on the previous page for disaster recovery.

## Where you are

This is the end of the chapter — the whole arc is complete, and no new
scenario state is introduced here. The `ORDERS` stream, its consumers,
and its mirror are still running in your session exactly as you left them
on the previous page. You can keep experimenting with them, or tear them
down with `nats stream rm ORDERS` when you are done.

You hold the core model: a stream stores messages, a consumer reads them
at its own pace, and an ack closes the loop. That model is the floor for
every other JetStream feature you will meet.

## See also

- [Reference](/reference/) — every config field, flag, default, and
  error code, versioned and exhaustive.
- [Key-Value deep dive](/learn/key-value) — the next chapter built on the
  same stream foundation.
- [Clustering & Replication deep dive](/learn/clustering) — the deeper
  story behind "surviving node loss."
