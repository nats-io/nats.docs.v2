# JetStream API Headers

This document provides a comprehensive reference for all headers used in JetStream operations. These headers are used for message publishing, delivery, and various JetStream features.


## Message Publishing Headers



### Message Identification and Deduplication

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Msg-Id` | String | Unique message ID for deduplication. Messages with the same ID within the deduplication window will be rejected as duplicates. |
| `Nats-Expected-Last-Msg-Id` | String | Message will only be stored if the last message ID matches this value |



### Expected State Headers

These headers enforce expected state conditions when publishing. If conditions are not met, the publish will fail.


| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Expected-Stream` | Stream name | Verifies the message is being published to the expected stream |
| `Nats-Expected-Last-Sequence` | Sequence number | Message will only be stored if the stream's last sequence matches this value |
| `Nats-Expected-Last-Subject-Sequence` | Sequence number | Message will only be stored if the last sequence for this subject matches this value |
| `Nats-Expected-Last-Subject-Sequence-Subject` | Sequence number | Specifies the subject for the expected last subject sequence check |



### Message Rollup

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Rollup` | String | Indicates this message should replace previous messages. sub replaces all previous messages on the same subject, all replaces all messages in the stream |



### Message Size

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Msg-Size` | Size in bytes | Indicates the size of the message payload |



### Message TTL

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-TTL` | Duration | Time-to-live for the message. Message will be automatically removed after this duration |



### Counter Operations

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Incr` | Number | Increment value for counter operations |
| `Nats-Counter-Sources` | String | Sources for counter values in JSON format |



### Batch Operations

Headers for atomic batch publishing:


| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Batch-Id` | String | Unique identifier for the batch |
| `Nats-Batch-Sequence` | Sequence number | Sequence number within the batch |
| `Nats-Batch-Commit` | Number or ID | Marks the final message in a batch, triggering atomic commit |



### Scheduled Messages

Headers for scheduled message delivery:


| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Schedule` | Cron expression or timestamp | Schedule pattern for message delivery |
| `Nats-Schedule-TTL` | Duration | Time-to-live for the schedule |
| `Nats-Schedule-Target` | Cron expression or timestamp | Target subject for scheduled delivery |
| `Nats-Scheduler` | Cron expression or timestamp | Identifier for the scheduler |
| `Nats-Schedule-Next` | Cron expression or timestamp | Next scheduled time or purge indicator |





## Message Delivery Headers



### Stream Information

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Last-Stream` | Sequence number | Stream's last sequence at delivery time |
| `Nats-Stream` | Stream name | Name of the stream the message came from |
| `Nats-Sequence` | Sequence number | Stream sequence number of the message |
| `Nats-Time-Stamp` | String | Timestamp when the message was stored |
| `Nats-Subject` | String | Original subject the message was published to |
| `Nats-Last-Sequence` | Sequence number | The sequence number of the precedent message either republished or in a batch of responses. 0 in the first message. |
| `Nats-UpTo-Sequence` | Sequence number | Upper bound sequence for batch delivery |



### Consumer Information

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Last-Consumer` | Sequence number | Consumer's last delivered sequence |
| `Nats-Consumer-Stalled` | Consumer name | Indicates consumer is stalled with delivery count |



### Pull Request Headers

Headers used in pull request responses:


| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Num-Pending` | String | Number of messages pending in the multi/batched get response |
| `Nats-Pending-Messages` | String | Number of pending messages for the pull request |
| `Nats-Pending-Bytes` | String | Number of pending bytes for the pull request |
| `Nats-Pin-Id` | String | Pin ID for the pull request |



### Source and Mirror Information

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Stream-Source` | String | Information about the source stream in format: stream-name > seq > subject |



### Response Type

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Response-Type` | String | Type of response being sent |





## API Headers



| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Required-Api-Level` | String | JSRequiredApiLevel requires the API level of the responding server to have the specified minimum value. |





## Marker Headers



| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Marker-Reason` | String | Reason for the marker: MaxAge, Purge, or Remove |





## Authentication and Authorization Headers



| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Request-Info` | String | Client authorization information for the request |
| `Nats-Server-Xkey` | String | Server X-Key for encrypted auth callout requests |





## Message Tracing Headers



| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Trace-Dest` | String | Destination subject for message tracing |
| `Nats-Trace-Hop` | String | Trace hop information |
| `Nats-Trace-Origin-Account` | String | Origin account for message tracing |
| `Nats-Trace-Only` | String | Indicates trace-only mode (message is not delivered) |





## Key-Value Store Headers



| Header | Value | Description |
|--------|-------|-------------|
| `KV-Operation` | String |  |






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
