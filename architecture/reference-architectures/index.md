---
id: index
title: "Reference architectures"
description: "Complete designs for common systems, from requirements to operations"
---
# Reference architectures

Each page is one system designed end to end: the requirements with numbers, the topology, the accounts, the subjects, every stream and consumer, the sizing, and what happens when something fails. Start from the one closest to yours.

## Pages

| System | What it is |
| --- | --- |
| [Event-driven order processing](/architecture/reference-architectures/order-processing) | The Acme ORDERS platform from the Learn deep dives, designed for production: event log, work queues, exactly-once billing, replay |
| [Microservices backbone](/architecture/reference-architectures/microservices-backbone) | Request-reply services with queue groups, an event log for what happened, and accounts per team |
| [IoT telemetry fleet](/architecture/reference-architectures/iot-telemetry) | Devices over MQTT and leaf nodes at the edge, aggregated into regional streams, with per-device credentials |
| [Multi-region SaaS control plane](/architecture/reference-architectures/multi-region-saas) | A super-cluster serving tenants in three regions with local reads, global configuration, and disaster recovery |
| [Real-time web application](/architecture/reference-architectures/realtime-web-app) | Browsers over WebSocket with per-user permissions, live updates from Key-Value, and a private core |
| [High-rate fan-out](/architecture/reference-architectures/market-data-fanout) | Millions of updates per second to many subscribers with last-value caching and no persistence on the hot path |
| [Data pipeline ingest](/architecture/reference-architectures/data-pipeline-ingest) | High-volume ingestion into streams with batching, deduplication, and hand-off to analytics storage |
| [Job scheduling and workflows](/architecture/reference-architectures/job-scheduling) | Durable work queues with retries, priorities, long-running jobs, and workflow state in Key-Value |

