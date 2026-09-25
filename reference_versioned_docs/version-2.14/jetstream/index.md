# JetStream

JetStream is the persistence layer of NATS, providing message streaming, replay, and at-least-once delivery semantics.

## Components

### [API](./api/index.md)
Programmatic interface for managing JetStream resources:
- [Account](./api/account/index.md) - Account-level management
- [Stream](./api/stream/index.md) - Stream operations and data management
- [Consumer](./api/consumer/index.md) - Consumer configuration and control
- [Meta](./api/meta/index.md) - Cluster metadata operations

### [Advisory](./advisory/index.md)
System events for monitoring and observability:
- Stream lifecycle events (created, updated, deleted)
- Consumer state changes and leadership elections
- Cluster quorum and storage notifications
- API audit trails and rate limiting

### [Metrics](./metric/index.md)
Performance and usage measurements:
- [Consumer Acknowledgement](./metric/consumer-ack.md) - Message acknowledgement latency

### [Errors](./errors.md)
Comprehensive error reference:
- Error codes and HTTP status mappings
- Detailed error descriptions
- Troubleshooting guidance

### [Cross-account subjects](./cross-account-subjects.md)
Subjects that cross an account or domain boundary:
- Exports and imports for sourcing and mirroring with ephemeral and durable consumers
- Acknowledgement and delivery subjects for consumers driven from another account
- Leafnode subject permissions in both directions
- The v1 and v2 formats of `$JS.ACK`, `$JS.FC`, and `$JSC.R`

## Key Concepts

JetStream extends NATS with:
- Streams - Message storage and replay
- Consumers - Subscription state and delivery management
- Persistence - File or memory-based storage
- Replication - Multi-node redundancy
- Exactly-once - Message delivery guarantees
