# JetStream API Headers

This document provides a comprehensive reference for all headers used in JetStream operations. These headers are used for message publishing, delivery, and various JetStream features.


## Message Publishing Headers

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Msg-Id` | String | Unique message ID for deduplication. Messages with the same ID within the deduplication window will be rejected as duplicates. |
| `Nats-Expected-Stream` | Stream name | Verifies the message is being published to the expected stream |
| `Nats-Expected-Last-Sequence` | Sequence number | Message will only be stored if the stream's last sequence matches this value |
| `Nats-Expected-Last-Subject-Sequence` | Sequence number | Message will only be stored if the last sequence for this subject matches this value |
| `Nats-Expected-Last-Subject-Sequence-Subject` | Sequence number | Specifies the subject for the expected last subject sequence check |
| `Nats-Expected-Last-Msg-Id` | String | Message will only be stored if the last message ID matches this value |
| `Nats-Rollup` | String | Indicates this message should replace previous messages. `sub` replaces all previous messages on the same subject, `all` replaces all messages in the stream |
| `Nats-TTL` | Duration | Time-to-live for the message (e.g., "60s", "5m"). Message will be automatically removed after this duration |
| `Nats-Incr` | String | Increment value for counter operations |
| `Nats-Counter-Sources` | String | Sources for counter values in JSON format |
| `Nats-Batch-Id` | String | Unique identifier for the batch |
| `Nats-Batch-Sequence` | Sequence number | Sequence number within the batch |
| `Nats-Batch-Commit` | Number or ID | Marks the final message in a batch, triggering atomic commit |
| `Nats-Schedule` | Cron expression or timestamp | Schedule pattern for message delivery |
| `Nats-Schedule-TTL` | Duration | Time-to-live for the schedule |
| `Nats-Schedule-Target` | Cron expression or timestamp | Target subject for scheduled delivery |
| `Nats-Scheduler` | Cron expression or timestamp | Identifier for the scheduler |
| `Nats-Schedule-Next` | Cron expression or timestamp | Next scheduled time or purge indicator |


## Message Delivery Headers

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Stream-Source` | Stream name | Information about the source stream in format: "stream-name > seq > subject" |
| `Nats-Last-Consumer` | Sequence number | Consumer's last delivered sequence |
| `Nats-Last-Stream` | Sequence number | Stream's last sequence at delivery time |
| `Nats-Consumer-Stalled` | Consumer name | Indicates consumer is stalled with delivery count |
| `Nats-Stream` | Stream name | Name of the stream the message came from |
| `Nats-Sequence` | Sequence number | Stream sequence number of the message |
| `Nats-Time-Stamp` | String | Timestamp when the message was stored |
| `Nats-Last-Sequence` | Sequence number | Last sequence number in the stream when this message was delivered |
| `Nats-Num-Pending` | String | Number of pending messages for the consumer |
| `Nats-UpTo-Sequence` | Sequence number | Upper bound sequence for batch delivery |


## Marker Headers

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Marker-Reason` | String | Reason for the marker: `MaxAge`, `Purge`, or `Remove` |


## Other Headers

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Msg-Size` | Size in bytes | Indicates the size of the message payload |
| `Nats-Response-Type` | String | Type of response being sent |
| `Nats-Subject` | String | Original subject the message was published to |


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
