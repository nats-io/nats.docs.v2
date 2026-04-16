# Snapshot Started

Stream snapshot initiated.

import JSONSchema from '@site/src/components/JSONSchema';
import snapshotCreate from '@site/src/schemas/vendor/v2.12/jsm/jetstream/advisory/v1/snapshot_create.json';

## Subscription Subject

`$JS.EVENT.ADVISORY.STREAM.SNAPSHOT_CREATE.{stream}`

Where `{stream}` is the stream name.

## Event Schema

<JSONSchema schema={snapshotCreate} />
