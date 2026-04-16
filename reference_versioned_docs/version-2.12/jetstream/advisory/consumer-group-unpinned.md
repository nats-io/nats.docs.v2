# Consumer Group Unpinned

Consumer group unpinned from node.

import JSONSchema from '@site/src/components/JSONSchema';
import consumerGroupUnpinned from '@site/src/schemas/vendor/v2.12/jsm/jetstream/advisory/v1/consumer_group_unpinned.json';

## Subscription Subject

`$JS.EVENT.ADVISORY.CONSUMER.GROUP_UNPINNED.{stream}.{consumer}`

Where:
- `{stream}` is the stream name
- `{consumer}` is the consumer name

## Event Schema

<JSONSchema schema={consumerGroupUnpinned} />
