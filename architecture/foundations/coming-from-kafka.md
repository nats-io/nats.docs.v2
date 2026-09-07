---
id: coming-from-kafka
title: "Coming from Kafka"
description: "Map topics, partitions, consumer groups, and offsets onto subjects, streams, consumers, and sequences, and drop the habits that don't transfer"
tags: [migration, jetstream]
---

# Coming from Kafka

:::note[Draft]
Example page for the Architecture skeleton. The content is a first draft and hasn't been reviewed against the server source.
:::

## Summary

Most Kafka concepts have a NATS counterpart, but the mapping is not one to
one, and the mismatches are where designs go wrong. The habit that causes the
most damage is partition thinking: designing parallelism, ordering, and
scaling around a fixed number of partitions. NATS has no partitions;
parallelism comes from consumers, and ordering comes from subjects.

## Concept map

| Kafka | Nearest NATS concept | What's different |
| --- | --- | --- |
| Topic | A stream capturing a set of subjects | One stream usually holds many subjects. Subjects are hierarchical and exist by use; nothing is declared. |
| Partition | None | A stream has one sequence and one order. Parallelism comes from a shared pull consumer, per-key order from subject design. |
| Consumer group | A durable pull consumer shared by workers | The server tracks acknowledgment per message, not an offset per partition. Workers don't own partitions and adding one doesn't rebalance. |
| Offset | Stream sequence plus the consumer's ack state | Held by the server. Acknowledging is the commit. Clients don't manage positions. |
| Producer `acks=all` | The publish acknowledgment from a stream | One acknowledgment per message from the stream leader after the replica quorum has written it. |
| Broker | `nats-server` | The same binary does core messaging and persistence. A cluster is three servers. |
| Replication factor | Replicas per stream and per consumer | Set per stream, not per topic partition, and changeable on a live stream. |
| Retention by time or size | Limits retention with `MaxAge`, `MaxBytes`, `MaxMsgs` | NATS also has work-queue retention, which removes a message on acknowledgment, and interest retention, which removes it when every consumer has acknowledged it. |
| Compacted topic | Key-Value bucket | Latest value per key with history, watches, and compare-and-set. |
| Idempotent producer and transactions | `Nats-Msg-Id` deduplication plus double acknowledgment | Deduplication is per stream within a window. There are no transactions across streams. |
| ZooKeeper or KRaft | The JetStream meta layer | Built into the server. No external coordination service. |
| Kafka Connect | Connectors and bridges outside the server | See [Bridging external systems](/architecture/patterns/integration/external-bridges). |
| Schema registry | None built in | Version through subject tokens or headers. See [Evolving subjects and schemas](/architecture/practices/evolving-subjects-and-schemas). |

## Habits to drop

- **Choosing a partition count.** There isn't one. Decide the subject
  hierarchy instead, and add workers to a pull consumer when you need
  throughput.
- **One thread per partition.** Workers are stateless fetchers. Run as many
  as the work needs, on any server, and stop them without a rebalance.
- **Keying for partition affinity.** Publish each entity to its own subject.
  If you need parallel processing with per-key order, use subject mapping
  to spread keys over a fixed set of partition subjects and run a consumer
  per partition subject.
- **A topic per event type.** Use one stream per bounded context and a
  subject per event type inside it. Streams are counted in tens.
- **Committing offsets.** Acknowledge each message when its work is durable.
  There's nothing else to commit.
- **Stretching a cluster across regions.** Kafka clusters sometimes span
  zones; a NATS cluster spans one low-latency zone. Regions are joined by
  gateways.

## Habits to keep

- Thinking in append-only logs, replay, and idempotent consumers.
- Planning retention before data flows.
- Monitoring consumer lag; in NATS that's pending and redelivered counts.
- Deduplicating on the producer side with a stable message ID.

## Related

- [Misconceptions](/architecture/foundations/misconceptions): the partition
  and mirror entries come straight from Kafka.
- [Partition thinking](/architecture/anti-patterns/partition-thinking).
- [How many streams, and what goes in each?](/architecture/decisions/stream-layout).
- Learn: [JetStream](/learn/jetstream/).
