# Consumer Pause

Consumer paused or resumed.

## Subscription Subject

`$JS.EVENT.ADVISORY.CONSUMER.PAUSE.{stream}.{consumer}`

Where:
- `{stream}` is the stream name
- `{consumer}` is the consumer name

import JSONSchema from '@site/src/components/JSONSchema';
import consumerPause from '@site/jsm.go/schemas/jetstream/advisory/v1/consumer_pause.json';

## Event Schema

<JSONSchema schema={consumerPause} />

