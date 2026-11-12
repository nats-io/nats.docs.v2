---
id: index
title: "Foundations"
description: "The NATS mental model, mapped from the systems people usually come from, and the misconceptions that produce bad designs"
---
# Foundations

Most bad NATS designs come from a correct model of a different system. Kafka partitions, RabbitMQ queues, a database used as a queue, or an HTTP service mesh each carry habits that don't transfer. This group states the NATS model plainly and shows where each imported habit breaks.

## Pages

| Page | What it is |
| --- | --- |
| [Think in NATS](/architecture/foundations/think-in-nats) | The mental model behind every NATS design: subjects and interest, accounts, streams over subjects, consumers as views, servers that compose |
| [Coming from Kafka](/architecture/foundations/coming-from-kafka) | Map topics, partitions, consumer groups, and offsets onto subjects, streams, consumers, and sequences, and drop the habits that don't transfer |
| [Coming from RabbitMQ](/architecture/foundations/coming-from-rabbitmq) | Map exchanges, queues, bindings, and acknowledgments onto subjects, streams, and consumers |
| [Coming from a database queue](/architecture/foundations/coming-from-a-database) | Replace a table used as a queue, an outbox, or Redis pub-sub and keys with streams, consumers, and Key-Value |
| [Coming from HTTP and gRPC](/architecture/foundations/coming-from-http) | Map REST and gRPC service calls, load balancers, and service discovery onto request-reply, queue groups, and the services framework |
| [Misconceptions](/architecture/foundations/misconceptions) | Claims about NATS that are commonly repeated and wrong, each with the correct model and what to do instead |

