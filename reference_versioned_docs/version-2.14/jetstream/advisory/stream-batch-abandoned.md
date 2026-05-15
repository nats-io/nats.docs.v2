# Stream Batch Abandoned

An advisory sent when a stream abandons a batch.

import JSONSchema from '@site/src/components/JSONSchema';
import streamBatchAbandoned from '@site/src/schemas/vendor/v2.14/jsm/jetstream/advisory/v1/stream_batch_abandoned.json';

## Subscription Subject

`$JS.EVENT.ADVISORY.STREAM.BATCH_ABANDONED.{stream}`

Where `{stream}` is the stream name.

## Event Schema

<JSONSchema schema={streamBatchAbandoned} />
