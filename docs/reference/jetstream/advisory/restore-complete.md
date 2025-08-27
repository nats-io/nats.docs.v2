# Restore Complete

Stream restore completed.

## Subscription Subject

`$JS.EVENT.ADVISORY.STREAM.RESTORE_COMPLETE.{stream}`

Where `{stream}` is the stream name.

import JSONSchema from '@site/src/components/JSONSchema';
import restoreComplete from '@site/jsm.go/schemas/jetstream/advisory/v1/restore_complete.json';

## Event Schema

<JSONSchema schema={restoreComplete} />

