---
description: NATS Protocol and API reference documentation.
---

# Reference

Complete technical reference documentation for NATS protocols, APIs, and server components.

## [Configuration](./config/)

NATS Server configuration reference:
- Server configuration options and settings
- Security and authentication setup
- Clustering and routing configuration

## [JetStream](./jetstream/)

JetStream persistence layer reference:
- [API](./jetstream/api/) - Management and data operations
- [Advisory](./jetstream/advisory/) - System events and notifications
- [Metrics](./jetstream/metric/) - Performance and usage metrics
- [Errors](./jetstream/errors/) - Error codes and troubleshooting

## [System](./system/)

NATS system advisories and monitoring:
- [Advisory](./system/advisory/) - Connection and system events
- [Monitoring](./system/monitor/) - Health check and statistics endpoints
- [Metrics](./system/metric/) - Server telemetry data

## [Services](./services/)

NATS Services API for building microservices:
- [Info Response](./services/info-response/) - Service information
- [Ping Response](./services/ping-response/) - Health check responses
- [Stats Response](./services/stats-response/) - Service statistics

## [Protocols](./protocols/)

Low-level protocol specifications for NATS communication:
- [Client Protocol](./protocols/client/) - Communication between clients and servers
- [Route Protocol](./protocols/route/) - Inter-server communication for clustering
- [Leafnode Protocol](./protocols/leafnode/) - Edge server connections
- [Gateway Protocol](./protocols/gateway/) - Super-cluster connectivity