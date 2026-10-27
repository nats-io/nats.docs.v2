---
id: index
title: "Anti-patterns"
description: "Designs that look reasonable, usually because they're right somewhere else, and fail on NATS"
---
# Anti-patterns

Each page names a design people build, explains why it fails on NATS, and points at the pattern or decision to use instead. Most of these are habits from other systems.

## Pages

| Anti-pattern | What it is |
| --- | --- |
| [Core NATS for durable delivery](/architecture/anti-patterns/core-nats-for-durable-delivery) | Expecting plain publish-subscribe to deliver to a subscriber that isn't connected |
| [Partition thinking](/architecture/anti-patterns/partition-thinking) | Sharding a stream by hand into numbered subjects to get parallelism, the way Kafka partitions do |
| [A stream per tenant or entity](/architecture/anti-patterns/stream-per-entity) | Creating a stream (or consumer) for every customer, device, or order |
| [R1 for data that matters](/architecture/anti-patterns/r1-in-production) | Running production streams with one replica because R3 looked expensive |
| [Push consumers by default](/architecture/anti-patterns/push-consumers-by-default) | Reaching for push delivery because it looks simpler than a fetch loop |
| [One consumer for everything](/architecture/anti-patterns/wildcard-firehose-consumers) | A single consumer on `>` that every service reads and filters client-side |
| [Request-reply through JetStream](/architecture/anti-patterns/request-reply-through-jetstream) | Routing synchronous calls through a stream to make them reliable |
| [Polling Key-Value](/architecture/anti-patterns/polling-kv) | Reading a key on a timer instead of watching it |
| [Acknowledging before the side effect](/architecture/anti-patterns/ack-before-side-effect) | Acking a message when it's received instead of when its work is durable |
| [Unbounded streams](/architecture/anti-patterns/unbounded-streams) | Streams with no age, size, or message limit |
| [A cluster stretched across regions](/architecture/anti-patterns/stretched-cluster) | Joining servers in different regions with routes instead of gateways |
| [One account for everything](/architecture/anti-patterns/one-account-for-everything) | Running every team, tenant, and environment in the default account |

