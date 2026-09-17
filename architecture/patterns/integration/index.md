---
id: index
title: "Integration patterns"
description: "Patterns for large payloads, versioning, sharing across accounts, and bridging to systems outside NATS"
---
# Integration patterns

These patterns sit at the edges of a NATS system: where payloads get big, where APIs change, and where other systems connect.

## Pages

| Pattern | Use it to |
| --- | --- |
| [Large payloads](/architecture/patterns/integration/large-payloads) | Move data above the payload limit through Object Store and pass a reference in the message |
| [Versioning with subject mapping](/architecture/patterns/integration/subject-mapping-and-versioning) | Evolve subjects and split traffic on the server without redeploying clients |
| [Sharing across accounts](/architecture/patterns/integration/cross-account-sharing) | Expose a service or a stream to another account with imports and exports |
| [Bridging external systems](/architecture/patterns/integration/external-bridges) | Connect HTTP, MQTT, Kafka, and databases to NATS with connectors, gateways, and the MQTT listener |

