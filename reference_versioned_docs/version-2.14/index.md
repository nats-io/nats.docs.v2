---
description: NATS Protocol and API reference documentation.
---

# Reference

Complete technical reference documentation for NATS protocols, APIs, and server components.

## [Configuration](./config/index.md)

NATS Server configuration reference:
- Server configuration options and settings
- Security and authentication setup
- Clustering and routing configuration

## [JetStream](./jetstream/index.md)

JetStream persistence layer reference:
- [API](./jetstream/api/index.md) - Management and data operations
- [Advisory](./jetstream/advisory/index.md) - System events and notifications
- [Metrics](./jetstream/metric/index.md) - Performance and usage metrics
- [Errors](./jetstream/errors.md) - Error codes and troubleshooting

## [System](./system/index.md)

NATS system advisories and monitoring:
- [Advisory](./system/advisory/index.md) - Connection and system events
- [Monitoring](./system/monitor/index.md) - Health check and statistics endpoints
- [Metrics](./system/metric/index.md) - Server telemetry data

## [Services](./services/index.md)

NATS Services API for building microservices:
- [Info Response](./services/info-response.md) - Service information
- [Ping Response](./services/ping-response.md) - Health check responses
- [Stats Response](./services/stats-response.md) - Service statistics

## [Protocols](./protocols/index.md)

Low-level protocol specifications for NATS communication:
- [Client Protocol](./protocols/client.md) - Communication between clients and servers
- [Route Protocol](./protocols/route.md) - Inter-server communication for clustering
- [Leafnode Protocol](./protocols/leafnode.md) - Edge server connections
- [Gateway Protocol](./protocols/gateway.md) - Super-cluster connectivity