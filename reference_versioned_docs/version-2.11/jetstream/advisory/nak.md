# Message Negative Acknowledgement

Message negatively acknowledged.

import JSONSchema from '@site/src/components/JSONSchema';
import nak from '@site/src/schemas/vendor/v2.11/jsm/jetstream/advisory/v1/nak.json';

## Subscription Subject

`$JS.EVENT.ADVISORY.CONSUMER.MSG_NAK.{stream}.{consumer}`

Where:
- `{stream}` is the stream name
- `{consumer}` is the consumer name

## Event Schema

<JSONSchema schema={nak} />
