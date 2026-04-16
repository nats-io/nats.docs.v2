# Snapshot Complete

Stream snapshot completed.

import JSONSchema from '@site/src/components/JSONSchema';
import snapshotComplete from '@site/src/schemas/vendor/v2.11/jsm/jetstream/advisory/v1/snapshot_complete.json';

## Subscription Subject

`$JS.EVENT.ADVISORY.STREAM.SNAPSHOT_COMPLETE.{stream}`

Where `{stream}` is the stream name.

## Event Schema

<JSONSchema schema={snapshotComplete} />
