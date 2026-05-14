# Consumer Quorum Lost

Consumer lost quorum.

import JSONSchema from '@site/src/components/JSONSchema';
import consumerQuorumLost from '@site/src/schemas/vendor/v2.14/jsm/jetstream/advisory/v1/consumer_quorum_lost.json';

## Subscription Subject

`$JS.EVENT.ADVISORY.CONSUMER.QUORUM_LOST.{stream}.{consumer}`

Where:
- `{stream}` is the stream name
- `{consumer}` is the consumer name

## Event Schema

<JSONSchema schema={consumerQuorumLost} />
