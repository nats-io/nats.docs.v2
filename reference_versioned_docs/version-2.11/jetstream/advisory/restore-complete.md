# Restore Complete

Stream restore completed.

import JSONSchema from '@site/src/components/JSONSchema';
import restoreComplete from '@site/src/schemas/vendor/v2.11/jsm/jetstream/advisory/v1/restore_complete.json';

## Subscription Subject

`$JS.EVENT.ADVISORY.STREAM.RESTORE_COMPLETE.{stream}`

Where `{stream}` is the stream name.

## Event Schema

<JSONSchema schema={restoreComplete} />
