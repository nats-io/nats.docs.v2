---
id: consumers
title: "Consumer rules"
description: "Rules for consumer type, acknowledgment, redelivery, filtering, and sharing"
tags: [jetstream]
---

# Consumer rules

:::note[Draft]
Example page for the Architecture skeleton. The content is a first draft and hasn't been reviewed against the server source.
:::

## Summary

A consumer is the server's record of what a reader has seen and acknowledged.
These rules keep that record correct under load and failure. The principle
behind all of them: the server owns delivery state, so let it, and tell it
the truth about what you've processed.

### CONS-1 Use pull consumers unless you have a specific reason for push {#cons-1}

**Rule.** Create pull consumers. Treat push as the exception.

**Why.** A pull consumer delivers only what a worker asks for, so the worker
sets the pace and a slow one doesn't fill a buffer. Scaling out is another
process fetching from the same consumer. The current client libraries build
their JetStream API on pull.

**Exceptions.** Legacy code on the older push API, and delivery to a subject
that something else listens on.

**Verify.** `nats consumer info <stream> <consumer>` shows no delivery
subject.

### CONS-2 Acknowledge after the side effect is durable, never on receipt {#cons-2}

**Rule.** Call ack after the work is written somewhere that survives a crash.
Never before.

**Why.** At-least-once delivery only holds if an unacknowledged message is
redelivered. Acknowledging on receipt turns the consumer into at-most-once
with extra steps.

**Exceptions.** Reads where a lost message costs nothing, which should use
`AckNone` explicitly so the intent is visible.

**Verify.** Kill a worker between receive and ack. The message must be
redelivered after `AckWait`.

### CONS-3 Filter on the server, one consumer per reader role {#cons-3}

**Rule.** Give each consumer the narrowest filter subject that covers what
its readers need. Don't create one consumer on everything and filter in the
client.

**Why.** A server-side filter costs nothing per message. Client-side
filtering delivers, acknowledges, and counts every message the reader
doesn't want, and one shared consumer couples the progress of readers that
have nothing to do with each other.

**Exceptions.** A reader that needs every subject.

**Verify.** `nats consumer info` shows a filter subject matching the
reader's actual interest.

### CONS-4 Use an ordered consumer for a single-reader, in-order read {#cons-4}

**Rule.** When one process needs a stream in order and has nothing to
acknowledge, use an ordered consumer. It's safe in production.

**Why.** Its R1, in-memory state is a cursor the library recreates on any gap
or loss. The data is in the stream at the stream's replication. Nothing is
left behind when the read ends.

**Exceptions.** Work shared across processes, and processing where each
message must be handled once. Both need a durable pull consumer.

**Verify.** `nats consumer ls <stream>` shows the ordered consumer gone a
few minutes after the reader stops.

### CONS-5 Set AckWait above the slowest handler and cap MaxDeliver {#cons-5}

**Rule.** Set `AckWait` longer than the slowest successful handler with
headroom, and set `MaxDeliver` to a small number with a backoff.

**Why.** An `AckWait` shorter than the handler causes redelivery of work
that's still in progress, which doubles the load exactly when the system is
slow. An unbounded `MaxDeliver` lets one poison message loop forever.

**Exceptions.** Handlers with unpredictable duration should send in-progress
acknowledgments instead of a very long `AckWait`.

**Verify.** `nats consumer info` shows `Ack Wait` and `Max Deliveries`
set, and the max-deliveries advisory has a subscriber.
