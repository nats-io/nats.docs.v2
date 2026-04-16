# Stream Action

Stream lifecycle events.

import JSONSchema from '@site/src/components/JSONSchema';
import streamAction from '@site/src/schemas/vendor/v2.11/jsm/jetstream/advisory/v1/stream_action.json';

## Subscription Subject

```
$JS.EVENT.ADVISORY.STREAM.CREATED.{stream}
$JS.EVENT.ADVISORY.STREAM.DELETED.{stream}
$JS.EVENT.ADVISORY.STREAM.UPDATED.{stream}
```

Where `{stream}` is the stream name.

## Event Schema

<JSONSchema schema={streamAction} />
