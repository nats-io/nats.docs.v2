# Restore Started

Stream restore initiated.

import JSONSchema from '@site/src/components/JSONSchema';
import restoreCreate from '@site/src/schemas/vendor/v2.11/jsm/jetstream/advisory/v1/restore_create.json';

## Subscription Subject

`$JS.EVENT.ADVISORY.STREAM.RESTORE_CREATE.{stream}`

Where `{stream}` is the stream name.

## Event Schema

<JSONSchema schema={restoreCreate} />
