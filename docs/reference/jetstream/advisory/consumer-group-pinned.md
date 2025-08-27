# Consumer Group Pinned

Consumer group pinned to node.

## Subscription Subject

`$JS.EVENT.ADVISORY.CONSUMER.GROUP_PINNED.{stream}.{consumer}`

Where:
- `{stream}` is the stream name
- `{consumer}` is the consumer name

import JSONSchema from '@site/src/components/JSONSchema';
import consumerGroupPinned from '@site/jsm.go/schemas/jetstream/advisory/v1/consumer_group_pinned.json';

## Event Schema

<JSONSchema schema={consumerGroupPinned} />

