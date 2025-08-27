# Stream Action

Stream lifecycle events.

## Subscription Subject

```
$JS.EVENT.ADVISORY.STREAM.CREATED.{stream}
$JS.EVENT.ADVISORY.STREAM.DELETED.{stream}
$JS.EVENT.ADVISORY.STREAM.UPDATED.{stream}
```

Where `{stream}` is the stream name.

import JSONSchema from '@site/src/components/JSONSchema';
import streamAction from '@site/jsm.go/schemas/jetstream/advisory/v1/stream_action.json';

## Event Schema

<JSONSchema schema={streamAction} />

