# Cancel Move

Cancels an in-progress stream reconfiguration and rolls the stream back to the config and peers it had before the reconfiguration started. This covers any in-flight desired state, not only moves: a scale up or down and a retention change are rolled back the same way.

import JSONSchema from '@site/src/components/JSONSchema';
import streamCancelMoveResponse from '@site/src/schemas/vendor/v2.15/jsm/jetstream/api/v1/stream_cancel_move_response.json';

## Subject

- `$JS.API.STREAM.CANCEL_MOVE.{stream}`
- `$JS.API.ACCOUNT.STREAM.CANCEL_MOVE.{account}.{stream}`

Where `{stream}` is the name of the stream and `{account}` is the account that holds it.

The first subject is used from the account that owns the stream. The second cancels a move on behalf of another account and is only available from the system account.

## Response

<JSONSchema schema={streamCancelMoveResponse} />
