# Consumer Action

Consumer lifecycle events.

import JSONSchema from '@site/src/components/JSONSchema';
import consumerAction from '@site/src/schemas/vendor/v2.12/jsm/jetstream/advisory/v1/consumer_action.json';

## Subscription Subject

```
$JS.EVENT.ADVISORY.CONSUMER.CREATED.{stream}.{consumer}
$JS.EVENT.ADVISORY.CONSUMER.DELETED.{stream}.{consumer}
```

Where:
- `{stream}` is the stream name
- `{consumer}` is the consumer name

## Event Schema

<JSONSchema schema={consumerAction} />
