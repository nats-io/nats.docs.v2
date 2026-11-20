# Reset Consumer

Resets a consumer to its ack floor, or to a given stream sequence.

import JSONSchema from '@site/src/components/JSONSchema';
import consumerResetRequest from '@site/src/schemas/vendor/v2.15/jsm/jetstream/api/v1/consumer_reset_request.json';
import consumerResetResponse from '@site/src/schemas/vendor/v2.15/jsm/jetstream/api/v1/consumer_reset_response.json';

## Subject

`$JS.API.CONSUMER.RESET.{stream}.{consumer}`

Where `{stream}` is the stream name and `{consumer}` is the consumer name.

## Constraints

The `seq` field in the request sets the stream sequence the consumer delivers next. If you leave it out or set it to `0`, the consumer goes back to its ack floor: it next delivers the first message that isn't acknowledged yet, and delivers all pending messages again. This works for every deliver policy.

An explicit `seq` can't move the consumer to before the point where its configuration says it starts. The allowed values depend on the consumer's `deliver_policy`:

| `deliver_policy` | Allowed `seq` | Error if not allowed |
| --- | --- | --- |
| `all` | Any sequence | – |
| `by_start_sequence` | `opt_start_seq` or later | `invalid reset: below start seq` |
| `by_start_time` | The first stream sequence at or after `opt_start_time`, or later | `invalid reset: below start time` |
| `last`, `last_per_subject`, `new` | None. Only the reset to the ack floor works. | `invalid reset: not allowed` |

These errors use error code `10204`.

There's no upper limit. `seq` can be higher than the stream's last sequence.

## Skipping messages

Set `seq` higher than the consumer's current position to skip messages. The consumer then acts as if it had acknowledged every message before `seq`:

- It doesn't deliver messages before `seq`. This includes messages it already delivered that aren't acknowledged yet.
- The ack floor moves to `seq - 1`.
- The consumer sequence starts again at 1.

If `seq` is past the end of the stream, the consumer waits and delivers the first new message at or after `seq`.

On a stream with interest retention, the skipped messages count as acknowledged by this consumer. The server removes them once no other consumer needs them.

To undo a skip, reset to an earlier sequence. This only works if the deliver policy allows that sequence and the messages are still in the stream.

## Request

<JSONSchema schema={consumerResetRequest} />

## Response

<JSONSchema schema={consumerResetResponse} />
