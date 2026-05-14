# JetStream API Headers

This document provides a comprehensive reference for all headers used in JetStream operations. These headers are used for message publishing, delivery, and various JetStream features.


## Message Publishing Headers

Headers used when publishing messages to JetStream streams.




### Message Identification and Deduplication

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Msg-Id` | Unique message ID | Unique message ID for deduplication. Messages with the same ID within the deduplication window will be rejected as duplicates. |
| `Nats-Expected-Last-Msg-Id` | Message ID | Message will only be stored if the last message ID matches this value |



### Expected State Headers

These headers enforce expected state conditions when publishing. If conditions are not met, the publish will fail.


| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Expected-Stream` | Stream name | Verifies the message is being published to the expected stream |
| `Nats-Expected-Last-Sequence` | Sequence number | Message will only be stored if the stream's last sequence matches this value |
| `Nats-Expected-Last-Subject-Sequence` | Sequence number | Message will only be stored if the last sequence for this subject matches this value |
| `Nats-Expected-Last-Subject-Sequence-Subject` | Subject | Specifies the subject for the expected last subject sequence check |



### Message Rollup

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Rollup` | `sub` or `all` | Indicates this message should replace previous messages. `sub` replaces all previous messages on the same subject, `all` replaces all messages in the stream |
| `Nats-Schedule-Rollup` | String |  |



### Message Size

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Msg-Size` | Size in bytes | Indicates the size of the message payload |



### Message TTL

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-TTL` | Duration string (e.g., `60s`, `5m`) | Time-to-live for the message. Message will be automatically removed after this duration |



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
| `Nats-Batch-Commit` | `1` | Marks the final message in a batch, triggering atomic commit |



### Scheduled Messages

Headers for scheduled message delivery:


| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Schedule` | Cron expression | Schedule pattern for message delivery |
| `Nats-Schedule-Time-Zone` | String |  |
| `Nats-Schedule-TTL` | Duration string (e.g., `60s`, `5m`) | Time-to-live for the schedule |
| `Nats-Schedule-Target` | Subject | Target subject for scheduled delivery |
| `Nats-Schedule-Source` | Subject | Source subject for scheduled message delivery |
| `Nats-Scheduler` | Scheduler ID | Identifier for the scheduler |
| `Nats-Schedule-Next` | RFC3339 timestamp or `purge` | Next scheduled time or purge indicator |





## Message Delivery Headers

Headers added by JetStream when delivering messages to consumers.




### Stream Information

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Last-Stream` | Sequence number | Stream's last sequence at delivery time |
| `Nats-Stream` | Stream name | Name of the stream the message came from |
| `Nats-Sequence` | Sequence number | Stream sequence number of the message |
| `Nats-Time-Stamp` | RFC3339 timestamp | Timestamp when the message was stored |
| `Nats-Subject` | Subject | Original subject the message was published to |
| `Nats-Last-Sequence` | Sequence number | Last sequence number in the stream when this message was delivered |
| `Nats-UpTo-Sequence` | Sequence number | Upper bound sequence for batch delivery |



### Consumer Information

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Last-Consumer` | Sequence number | Consumer's last delivered sequence |
| `Nats-Consumer-Stalled` | Reply subject | Indicates consumer is stalled with delivery count |



### Pull Request Headers

Headers used in pull request responses:


| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Num-Pending` | Count | Number of pending messages for the consumer |
| `Nats-Pending-Messages` | Count | Number of pending messages for the pull request |
| `Nats-Pending-Bytes` | Size in bytes | Number of pending bytes for the pull request |
| `Nats-Pin-Id` | NUID | Priority group pin identifier for the pull request |



### Source and Mirror Information

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Stream-Source` | Stream source info | Information about the source stream in format: stream-name > seq > subject |



### Response Type

| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Response-Type` | Response type string | Type of response being sent |





## API Headers

Headers used in JetStream API requests and responses.




| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Required-Api-Level` | API level number | Minimum API level required for the request |





## Marker Headers

Headers used to mark special message types in streams.




| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Marker-Reason` | `MaxAge`, `Purge`, or `Remove` | Reason for the marker: MaxAge, Purge, or Remove |





## Authentication and Authorization Headers

Headers used for authentication callout and authorization.




| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Request-Info` | JSON-encoded client info | Client authorization information for the request |
| `Nats-Server-Xkey` | X-Key string | Server X-Key for encrypted auth callout requests |





## Message Tracing Headers

Headers used for message tracing and diagnostics.




| Header | Value | Description |
|--------|-------|-------------|
| `Nats-Trace-Dest` | Subject | Destination subject for message tracing |
| `Nats-Trace-Hop` | Hop count | Number of hops in the trace |
| `Nats-Trace-Origin-Account` | Account name | Origin account for message tracing |
| `Nats-Trace-Only` | Boolean flag | Indicates trace-only mode (message is not delivered) |





## Key-Value Store Headers

Headers used by the NATS Key-Value store built on JetStream.




| Header | Value | Description |
|--------|-------|-------------|
| `KV-Operation` | `PUT`, `DEL`, or `PURGE` | Type of KV operation: PUT, DEL, or PURGE |






## Usage Examples

### Publishing with Deduplication
```text
Nats-Msg-Id: unique-message-123
```

### Publishing with Expected State
```text
Nats-Expected-Last-Sequence: 42
Nats-Expected-Stream: my-stream
```

### Batch Publishing
```text
Nats-Batch-Id: batch-456
Nats-Batch-Sequence: 1
```
For the last message in batch:
```text
Nats-Batch-Id: batch-456
Nats-Batch-Sequence: 10
Nats-Batch-Commit: 1
```

### Scheduled Message
```text
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

