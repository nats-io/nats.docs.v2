# JetStream

JetStream is the persistence layer of NATS, providing message streaming, replay, and at-least-once delivery semantics.

## Components

### [API](./api/)
Programmatic interface for managing JetStream resources:
- [Account](./api/account/) - Account-level management
- [Stream](./api/stream/) - Stream operations and data management
- [Consumer](./api/consumer/) - Consumer configuration and control
- [Meta](./api/meta/) - Cluster metadata operations

### [Advisory](./advisory/)
System events for monitoring and observability:
- Stream lifecycle events (created, updated, deleted)
- Consumer state changes and leadership elections
- Cluster quorum and storage notifications
- API audit trails and rate limiting

### [Metrics](./metric/)
Performance and usage measurements:
- [Consumer Acknowledgement](./metric/consumer-ack) - Message acknowledgement latency

### [Errors](./errors)
Comprehensive error reference:
- Error codes and HTTP status mappings
- Detailed error descriptions
- Troubleshooting guidance

## Key Concepts

JetStream extends NATS with:
- Streams - Message storage and replay
- Consumers - Subscription state and delivery management
- Persistence - File or memory-based storage
- Replication - Multi-node redundancy
- Exactly-once - Message delivery guarantees
