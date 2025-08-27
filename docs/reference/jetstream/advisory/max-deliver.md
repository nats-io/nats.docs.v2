# Max Deliveries Exceeded

Message exceeded max delivery attempts.

## Subscription Subject

`$JS.EVENT.ADVISORY.CONSUMER.MAX_DELIVERIES.{stream}.{consumer}`

Where:
- `{stream}` is the stream name
- `{consumer}` is the consumer name

import JSONSchema from '@site/src/components/JSONSchema';
import maxDeliver from '@site/jsm.go/schemas/jetstream/advisory/v1/max_deliver.json';

## Event Schema

<JSONSchema schema={maxDeliver} />

