---
title: JetStream
description: NATS's built-in persistence and streaming layer
---

# JetStream

Core NATS delivers messages only to subscribers connected at the moment of
publication - at most once, never replayed. JetStream adds a persistence layer
on top, giving you at-least-once delivery - messages survive restarts and can
be replayed.

Core NATS already decouples publisher and subscriber from each other, where a
publisher does not need to know about the subscriber. JetStream extends that
decoupling to time - the two no longer need to be online at the same moment.

For a runnable, step-by-step treatment, see the [JetStream deep dive](/learn/jetstream).

<div class="nats-flow" data-scenario="jetStreamContrastAnimated" data-width="600" data-height="380"></div>

## How It Works

JetStream introduces three pieces working together:

- A **stream** is a server-side store of messages, bound to one or more
  subjects.
- A **consumer** is a server-side, stateful view of a stream - the server
  tracks how far a client has progressed, so applications don't have to.
- A **client** is an application that connects to a consumer to receive
  messages and acknowledge them. A consumer can be shared by multiple clients
  to divide the work; each acknowledgment advances the consumer's position in
  the stream.

## Streams

A stream is bound to one or more subject patterns. When a publisher sends a
message to a matching subject, the server appends it to the stream and
assigns it a sequence number. Streams are configurable for storage (memory
or disk), retention (whether limits or consumer acks remove messages),
replication, and more.

## Consumers

A consumer is a server-side, stateful view of a stream that tracks how far a
client has progressed. Multiple consumers can read the same stream
independently, each with its own position. The server maintains that
position so applications don't have to coordinate or remember it themselves.

<div class="nats-flow" data-scenario="jetStreamConsumersAnimated" data-width="600" data-height="350"></div>

The application that connects to a consumer - the **client** - receives
messages and acknowledges each one. An acknowledgment advances the
consumer's cursor - if a message isn't acknowledged in time, the server
redelivers it, which is what gives you at-least-once delivery.

A consumer can be configured to start reading from the beginning of the
stream, from the latest message, from a specific sequence number, or from a
specific time.

## Putting It Together

<div class="nats-example" data-type="jetstream-basic" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

## Beyond Streams and Consumers

JetStream also provides higher-level abstractions built on top of streams and
consumers:

- **Key Value Store**: A simple key-value store with built-in replication and
  durability.
- **Object Store**: Store objects larger than a single message, split into
  chunks, with per-object metadata.

## Related Concepts

- [Publish-Subscribe](./pub-sub-basics) - The fire-and-forget messaging model
  JetStream builds on
- [Subjects](./subjects) - How streams capture messages by subject patterns
- [Queue Groups](./queue-groups) - Load balancing across consumers, also
  available with JetStream consumers

## Next steps

- [JetStream deep dive](/learn/jetstream) — build a stream and consumer hands-on
- [Key-Value deep dive](/learn/key-value) — durable key-value store on JetStream
- [Object Store deep dive](/learn/object-store) — chunked object storage on JetStream
