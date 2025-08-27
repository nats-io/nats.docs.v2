# Snapshot Started

Stream snapshot initiated.

## Subscription Subject

`$JS.EVENT.ADVISORY.STREAM.SNAPSHOT_CREATE.{stream}`

Where `{stream}` is the stream name.

import JSONSchema from '@site/src/components/JSONSchema';
import snapshotCreate from '@site/jsm.go/schemas/jetstream/advisory/v1/snapshot_create.json';

## Event Schema

<JSONSchema schema={snapshotCreate} />

