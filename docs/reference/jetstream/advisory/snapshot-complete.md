# Snapshot Complete

Stream snapshot completed.

## Subscription Subject

`$JS.EVENT.ADVISORY.STREAM.SNAPSHOT_COMPLETE.{stream}`

Where `{stream}` is the stream name.

import JSONSchema from '@site/src/components/JSONSchema';
import snapshotComplete from '@site/jsm.go/schemas/jetstream/advisory/v1/snapshot_complete.json';

## Event Schema

<JSONSchema schema={snapshotComplete} />

