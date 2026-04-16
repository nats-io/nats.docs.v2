# Consumer Group Pinned

Consumer group pinned to node.

import JSONSchema from '@site/src/components/JSONSchema';
import consumerGroupPinned from '@site/src/schemas/vendor/v2.12/jsm/jetstream/advisory/v1/consumer_group_pinned.json';

## Subscription Subject

`$JS.EVENT.ADVISORY.CONSUMER.GROUP_PINNED.{stream}.{consumer}`

Where:
- `{stream}` is the stream name
- `{consumer}` is the consumer name

## Event Schema

<JSONSchema schema={consumerGroupPinned} />
