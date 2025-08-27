# Consumer Action

Consumer lifecycle events.

## Subscription Subject

```
$JS.EVENT.ADVISORY.CONSUMER.CREATED.{stream}.{consumer}
$JS.EVENT.ADVISORY.CONSUMER.DELETED.{stream}.{consumer}
```

Where:
- `{stream}` is the stream name
- `{consumer}` is the consumer name

import JSONSchema from '@site/src/components/JSONSchema';
import consumerAction from '@site/jsm.go/schemas/jetstream/advisory/v1/consumer_action.json';

## Event Schema

<JSONSchema schema={consumerAction} />

