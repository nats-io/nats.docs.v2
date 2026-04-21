# Max Deliveries Exceeded

Message exceeded max delivery attempts.

import JSONSchema from '@site/src/components/JSONSchema';
import maxDeliver from '@site/src/schemas/vendor/v2.12/jsm/jetstream/advisory/v1/max_deliver.json';

## Subscription Subject

`$JS.EVENT.ADVISORY.CONSUMER.MAX_DELIVERIES.{stream}.{consumer}`

Where:
- `{stream}` is the stream name
- `{consumer}` is the consumer name

## Event Schema

<JSONSchema schema={maxDeliver} />
