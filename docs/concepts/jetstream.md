---
title: JetStream
description: NATS's built-in persistence and streaming layer
---

# JetStream

Core NATS delivers messages only to subscribers actively connected when the
message is published. While this covers many use cases, some applications
require more robust messaging guarantees, such as:

- **Message replay**: Consumers can retrieve past messages, not just new ones
- **Acknowledgments**: Consumers confirm receipt so the server knows what's been processed.
- **Durable storage**: Messages are stored on disk and survive server restarts
- **Fault tolerance**: Messages are replicated across multiple servers for high
  availability

This is where JetStream comes in - NATS's built-in persistence and streaming
layer, so you can build applications that need guaranteed delivery and message
history.

<div class="nats-flow" data-scenario="jetStreamContrastAnimated" data-width="600" data-height="380"></div>

## How It Works

JetStream introduces the concept of **streams** and **consumers**:

- **Streams**: Named message stores that persist messages in memory or on disk.
  This is where you can configure retention policies, replication, and storage
  limits. Streams are bound to subjects, so messages published to those subjects
  are stored in the stream.
- **Consumers**: Stateful subscribers that can consume messages from a stream,
  with support for acknowledgments, message replay, and durable state. Consumers
  can be push-based (messages are pushed to them from the server) or pull-based
  (they request messages when ready).

The server persists messages published to stream subjects. Consumers retrieve
them at their own pace and acknowledge receipt to manage flow.

## Streams

A stream is a server-side log of messages, bound to one or more subjects. When
you publish a message to a subject that matches the stream's subjects, it is
appended to the stream along with a sequence number. Streams support different
storage backends, retention policies, replication, and discard policies. Here,
we'll only cover two of the most common configuration options.

### Storage

There are two storage options for streams:

- **File storage**: Messages are persisted to disk, providing durability across
  server restarts. This is the most common choice for production workloads.

- **Memory storage**: Messages are stored in memory, providing lower latency but
  no durability (messages are lost on server restart). This can be useful for
  transient data or testing.

### Retention Policies

Retention policies determine how long messages are kept in a stream. The three
main policies are:

- **Limits**: Messages are retained until the stream reaches configured limits
  (e.g., max messages, max bytes, max age). Once a limit is hit, older messages
  are discarded to make room for new ones.
- **Interest**: Messages are retained as long as there is at least one active
  consumer interested in them. Once all interested consumers have acknowledged a
  message, it is removed from the stream. If no consumer is interested, the
  server discards it immediately.
- **Work Queue**: Messages are retained until a consumer acknowledges them. This
  is ideal for load balancing work across multiple consumers, as each message is
  processed by only one consumer. When using this policy, consumers must not
  have overlapping interests on subjects.

Both Interest and Work Queue policies are additive to any configured limits. For
example, if you have a stream with a max age of 24 hours and an Interest policy,
messages will be retained for up to 24 hours or until all interested consumers
have acknowledged them, whichever comes first.

## Consumers

A consumer is a cursor that reads messages from a stream. Multiple consumers can
read from the same stream independently, each with its own position and state.
Consumers can be configured as push-based (messages are pushed to them by the
server) or pull-based (they request messages when ready). Pull-based consumers
are typically the better fit for new applications because they let the consumer
control its own flow. Consumers also support acknowledgments, allowing them to
confirm receipt of messages and control the flow of messages from the stream.

<div class="nats-flow" data-scenario="jetStreamConsumersAnimated" data-width="600" data-height="350"></div>

### Acknowledgments and Redelivery

When a consumer receives a message, it can acknowledge it to confirm receipt. If
a message is not acknowledged within a configured timeout, the server treats it
as unacknowledged and redelivers it. Consumers can also configure a maximum
number of redelivery attempts before the server marks a message as failed.

### Starting Position

When a consumer is created, it can specify where to start consuming messages
from the stream. The options include:

- **All**: Start consuming from the beginning of the stream, including all past
  messages.
- **Last** and **Last Per Subject**: Start consuming from the most recent
  message in the stream (or the most recent message for each subject).
- **New**: Start consuming only new messages published after the consumer is
  created.
- **From Sequence**: Start consuming from a specific sequence number in the
  stream.
- **From Time**: Start consuming from a specific timestamp in the stream.

## Putting It Together

<div class="nats-example" data-type="jetstream-basic" data-languages="cli,go"></div>

## Beyond Streams and Consumers

JetStream also provides higher-level abstractions built on top of streams and
consumers:

- **Key Value Store**: A simple key-value store with built-in replication and
  durability.
- **Object Store**: A scalable object storage system with support for versioning
  and metadata.

## Related Concepts

- [Publish-Subscribe](./pub-sub-basics) - The fire-and-forget messaging model
  JetStream builds on
- [Subjects](./subjects) - How streams capture messages by subject patterns
- [Queue Groups](./queue-groups) - Load balancing across consumers, also
  available with JetStream consumers
