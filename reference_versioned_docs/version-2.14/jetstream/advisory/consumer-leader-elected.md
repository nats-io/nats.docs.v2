# Consumer Leader Elected

New consumer leader elected.

import JSONSchema from '@site/src/components/JSONSchema';
import consumerLeaderElected from '@site/src/schemas/vendor/v2.14/jsm/jetstream/advisory/v1/consumer_leader_elected.json';

## Subscription Subject

`$JS.EVENT.ADVISORY.CONSUMER.LEADER_ELECTED.{stream}.{consumer}`

Where:
- `{stream}` is the stream name
- `{consumer}` is the consumer name

## Event Schema

<JSONSchema schema={consumerLeaderElected} />
