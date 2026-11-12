---
id: think-in-nats
title: "Think in NATS"
description: "The mental model behind every NATS design: subjects and interest, accounts, streams over subjects, consumers as views, servers that compose"
tags: [core-nats, jetstream, topology]
---

# Think in NATS

:::note[Draft]
Example page for the Architecture skeleton. The content is a first draft and hasn't been reviewed against the server source.
:::

## Summary

NATS routes messages by subject to whoever has expressed interest, with
nothing declared ahead of time. Persistence, when you need it, is a stream
that captures a set of subjects and is read through server-side consumers.
Isolation is an account. Scale is more servers composed into bigger shapes,
with the application unchanged. Every design decision in this section follows
from those four statements.

## The NATS model

**Subjects are the address space.** A publisher sends to a subject such as
`orders.created`. Nothing is created ahead of time: no topic, no queue, no
exchange. The subject hierarchy is yours to design, and it does three jobs at
once: routing, filtering, and authorization.

**Interest decides where messages go.** A subscription is a statement of
interest. Servers propagate interest to each other over routes, gateways, and
leaf links, and a message travels only to where interest exists. If nobody is
listening, the first server drops the message.

**Core NATS is at-most-once, on purpose.** A message goes to the subscribers
connected right now. That's what makes core NATS fast and stateless, and it's
the right guarantee for most traffic: requests, live updates, and telemetry
where the next reading supersedes the last.

**A stream captures subjects.** When a missed message has consequences, you
add a stream. A stream is a replicated log that stores every message
published to a set of subjects. Publishers don't change; the stream listens
alongside the subscribers. One stream usually holds many subjects, and the
subject hierarchy gives it structure.

**A stream is one log, not partitions.** Messages in a stream have one
sequence and one order. Parallelism comes from consumers and workers, not
from splitting the stream. Per-key ordering, when you need it, comes from
subject design.

**A consumer is a server-side view.** A consumer is a filter, a cursor, and
acknowledgment state, kept by the server. Many worker processes can share one
consumer to split work. Each reader that needs its own position gets its own
consumer. There are no offsets for clients to manage.

**Replication is per stream and per consumer.** Each stream and consumer has
its own replica count. A cluster of three servers can hold an R3 stream for
orders next to an R1 stream for metrics.

**An account is the isolation boundary.** Each account has its own subject
namespace, its own JetStream, and its own users. Nothing crosses between
accounts unless one exports it and the other imports it.

**Servers compose.** One server becomes a cluster with routes, clusters
become a super-cluster with gateways, and leaf nodes extend it to the edge or
across a network boundary. The client code and the subjects stay the same.

**The server is the platform.** Routing, load balancing, service discovery,
persistence, key-value, object storage, and multi-tenancy are all in
`nats-server`. A NATS design doesn't add a broker, a registry, a load
balancer, or a coordination service next to it.

## What changes in your design

- You design the subject hierarchy first. It's the schema of the system.
- You decide per subject whether loss is acceptable. Most subjects stay on
  core NATS; the ones that can't are captured by a stream.
- You count streams in tens, not thousands. Structure goes in subjects, and
  tenants go in accounts.
- You get parallelism by adding workers to a pull consumer, not by
  partitioning.
- You size a cluster as three servers and add clusters for regions, rather
  than growing one cluster across a WAN.
- You put a boundary where an account or a leaf node goes, not where a
  separate broker would have gone.

## Related

- [Misconceptions](/architecture/foundations/misconceptions): the claims that
  contradict this page.
- [Coming from Kafka](/architecture/foundations/coming-from-kafka) and
  [Coming from RabbitMQ](/architecture/foundations/coming-from-rabbitmq).
- [Rules at a glance](/architecture/rules/).
- Learn: [Core NATS](/learn/core-nats/), [JetStream](/learn/jetstream/),
  [Topologies](/learn/topologies/), [Security](/learn/security/).
