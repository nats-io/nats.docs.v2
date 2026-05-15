# Consumer Pause

Consumer paused or resumed.

import JSONSchema from '@site/src/components/JSONSchema';
import consumerPause from '@site/src/schemas/vendor/v2.14/jsm/jetstream/advisory/v1/consumer_pause.json';

## Subscription Subject

`$JS.EVENT.ADVISORY.CONSUMER.PAUSE.{stream}.{consumer}`

Where:
- `{stream}` is the stream name
- `{consumer}` is the consumer name

## Event Schema

<JSONSchema schema={consumerPause} />
