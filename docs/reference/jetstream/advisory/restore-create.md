# Restore Started

Stream restore initiated.

## Subscription Subject

`$JS.EVENT.ADVISORY.STREAM.RESTORE_CREATE.{stream}`

Where `{stream}` is the stream name.

import JSONSchema from '@site/src/components/JSONSchema';
import restoreCreate from '@site/jsm.go/schemas/jetstream/advisory/v1/restore_create.json';

## Event Schema

<JSONSchema schema={restoreCreate} />

