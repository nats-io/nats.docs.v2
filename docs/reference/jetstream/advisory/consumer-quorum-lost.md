# Consumer Quorum Lost

Consumer lost quorum.

## Subscription Subject

`$JS.EVENT.ADVISORY.CONSUMER.QUORUM_LOST.{stream}.{consumer}`

Where:
- `{stream}` is the stream name
- `{consumer}` is the consumer name

import JSONSchema from '@site/src/components/JSONSchema';
import consumerQuorumLost from '@site/jsm.go/schemas/jetstream/advisory/v1/consumer_quorum_lost.json';

## Event Schema

<JSONSchema schema={consumerQuorumLost} />

