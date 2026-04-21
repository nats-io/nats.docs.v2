# Message Terminated

Message terminated.

import JSONSchema from '@site/src/components/JSONSchema';
import terminated from '@site/src/schemas/vendor/v2.12/jsm/jetstream/advisory/v1/terminated.json';

## Subscription Subject

`$JS.EVENT.ADVISORY.CONSUMER.MSG_TERMINATED.{stream}.{consumer}`

Where:
- `{stream}` is the stream name
- `{consumer}` is the consumer name

## Event Schema

<JSONSchema schema={terminated} />
