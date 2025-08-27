# Message Negative Acknowledgement

Message negatively acknowledged.

## Subscription Subject

`$JS.EVENT.ADVISORY.CONSUMER.MSG_NAK.{stream}.{consumer}`

Where:
- `{stream}` is the stream name
- `{consumer}` is the consumer name

import JSONSchema from '@site/src/components/JSONSchema';
import nak from '@site/jsm.go/schemas/jetstream/advisory/v1/nak.json';

## Event Schema

<JSONSchema schema={nak} />

