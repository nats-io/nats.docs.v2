# Consumer Group Unpinned

Consumer group unpinned from node.

## Subscription Subject

`$JS.EVENT.ADVISORY.CONSUMER.GROUP_UNPINNED.{stream}.{consumer}`

Where:
- `{stream}` is the stream name
- `{consumer}` is the consumer name

import JSONSchema from '@site/src/components/JSONSchema';
import consumerGroupUnpinned from '@site/jsm.go/schemas/jetstream/advisory/v1/consumer_group_unpinned.json';

## Event Schema

<JSONSchema schema={consumerGroupUnpinned} />

