# Message Terminated

Message terminated.

## Subscription Subject

`$JS.EVENT.ADVISORY.CONSUMER.MSG_TERMINATED.{stream}.{consumer}`

Where:
- `{stream}` is the stream name
- `{consumer}` is the consumer name

import JSONSchema from '@site/src/components/JSONSchema';
import terminated from '@site/jsm.go/schemas/jetstream/advisory/v1/terminated.json';

## Event Schema

<JSONSchema schema={terminated} />

