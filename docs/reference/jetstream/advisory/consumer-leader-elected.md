# Consumer Leader Elected

New consumer leader elected.

## Subscription Subject

`$JS.EVENT.ADVISORY.CONSUMER.LEADER_ELECTED.{stream}.{consumer}`

Where:
- `{stream}` is the stream name
- `{consumer}` is the consumer name

import JSONSchema from '@site/src/components/JSONSchema';
import consumerLeaderElected from '@site/jsm.go/schemas/jetstream/advisory/v1/consumer_leader_elected.json';

## Event Schema

<JSONSchema schema={consumerLeaderElected} />

