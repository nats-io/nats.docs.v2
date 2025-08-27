# JetStream API Headers

This document provides a comprehensive reference for all headers used in JetStream operations. These headers are used for message publishing, delivery, and various JetStream features.

## Message Publishing Headers

Headers used when publishing messages to JetStream streams:

### Message Identification and Deduplication

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Msg-Id` | String | Unique message ID for deduplication. Messages with the same ID within the deduplication window will be rejected as duplicates. |

### Expected State Headers

These headers enforce expected state conditions when publishing. If conditions are not met, the publish will fail.

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Expected-Stream` | Stream name | Verifies the message is being published to the expected stream |
| `Nats-Expected-Last-Sequence` | Sequence number | Message will only be stored if the stream's last sequence matches this value |
| `Nats-Expected-Last-Subject-Sequence` | Sequence number | Message will only be stored if the last sequence for this subject matches this value |
| `Nats-Expected-Last-Subject-Sequence-Subject` | Subject string | Specifies the subject for the expected last subject sequence check |
| `Nats-Expected-Last-Msg-Id` | Message ID | Message will only be stored if the last message ID matches this value |

### Message Rollup

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Rollup` | `sub` or `all` | Indicates this message should replace previous messages. `sub` replaces all previous messages on the same subject, `all` replaces all messages in the stream |

### Message Size

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Msg-Size` | Size in bytes | Indicates the size of the message payload |

### Message TTL

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-TTL` | Duration string | Time-to-live for the message (e.g., "60s", "5m"). Message will be automatically removed after this duration |

### Counter Operations

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Incr` | Number | Increment value for counter operations |
| `Nats-Counter-Sources` | JSON | Sources for counter values in JSON format |

### Batch Operations

Headers for atomic batch publishing:

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Batch-Id` | Batch ID | Unique identifier for the batch |
| `Nats-Batch-Sequence` | Sequence number | Sequence number within the batch |
| `Nats-Batch-Commit` | "1" | Marks the final message in a batch, triggering atomic commit |

### Scheduled Messages

Headers for scheduled message delivery:

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Schedule` | Cron expression | Schedule pattern for message delivery |
| `Nats-Schedule-TTL` | Duration | Time-to-live for the schedule |
| `Nats-Schedule-Target` | Subject | Target subject for scheduled delivery |
| `Nats-Schedule-Next` | Timestamp or "purge" | Next scheduled time or purge indicator |
| `Nats-Scheduler` | Scheduler ID | Identifier for the scheduler |

## Message Delivery Headers

Headers added by JetStream when delivering messages to consumers:

### Stream Information

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Stream` | Stream name | Name of the stream the message came from |
| `Nats-Subject` | Original subject | Original subject the message was published to |
| `Nats-Sequence` | Sequence number | Stream sequence number of the message |
| `Nats-Time-Stamp` | RFC3339 timestamp | Timestamp when the message was stored |
| `Nats-Last-Sequence` | Sequence number | Last sequence number in the stream when this message was delivered |

### Consumer Information

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Last-Consumer` | Sequence number | Consumer's last delivered sequence |
| `Nats-Last-Stream` | Sequence number | Stream's last sequence at delivery time |
| `Nats-Consumer-Stalled` | Delivery count | Indicates consumer is stalled with delivery count |
| `Nats-Num-Pending` | Count | Number of pending messages for the consumer |
| `Nats-UpTo-Sequence` | Sequence number | Upper bound sequence for batch delivery |

### Pull Request Headers

Headers used in pull request responses:

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Pending-Messages` | Count | Number of pending messages available |
| `Nats-Pending-Bytes` | Size in bytes | Total size of pending messages |
| `Nats-Pin-Id` | NUID | Priority group pin identifier |

### Source and Mirror Information

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Stream-Source` | Source info | Information about the source stream in format: "stream-name > seq > subject" |

### Response Type

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Response-Type` | Response type | Type of response being sent |

## API Headers

Headers used in JetStream API requests:

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Required-Api-Level` | API level | Minimum API level required for the request |

## Marker Headers

Headers for stream markers and lifecycle events:

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Marker-Reason` | Reason | Reason for the marker: `MaxAge`, `Purge`, or `Remove` |

## Authentication and Authorization Headers

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Server-Xkey` | XKey | Server's extended key for authentication callbacks |
| `Nats-Request-Info` | Client info | Information about the requesting client |

## Message Tracing Headers

Headers used for distributed message tracing:

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Trace-Dest` | Destination | Trace destination subject |
| `Nats-Trace-Hop` | Hop count | Number of hops in the trace |
| `Nats-Trace-Origin-Account` | Account | Origin account for the trace |
| `Nats-Trace-Only` | Flag | Indicates trace-only mode |

## Key-Value Store Headers

Headers specific to Key-Value store operations:

| Header | Value | Description |
|--------|-------|-------------|
| `KV-Operation` | Operation type | Type of KV operation (e.g., "PURGE") |

## Usage Examples

### Publishing with Deduplication
```
Nats-Msg-Id: unique-message-123
```

### Publishing with Expected State
```
Nats-Expected-Last-Sequence: 42
Nats-Expected-Stream: my-stream
```

### Batch Publishing
```
Nats-Batch-Id: batch-456
Nats-Batch-Sequence: 1
```
For the last message in batch:
```
Nats-Batch-Id: batch-456
Nats-Batch-Sequence: 10
Nats-Batch-Commit: 1
```

### Scheduled Message
```
Nats-Schedule: 0 */5 * * * *
Nats-Schedule-TTL: 24h
Nats-Schedule-Target: notifications.email
```

## Notes

- Headers are case-sensitive
- Some headers are set automatically by the server and should not be manually set by clients
- Headers prefixed with `Nats-Expected-` are used for optimistic concurrency control
- The `Nats-Rollup` header is used in conjunction with the stream's `MaxMsgsPerSubject` setting
- Batch operations require all messages in a batch to succeed or the entire batch is rejected
- Counter operations are atomic and support distributed counters across clustered streams