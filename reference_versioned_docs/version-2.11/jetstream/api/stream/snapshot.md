# Snapshot Stream

Creates a snapshot of a stream.

import JSONSchema from '@site/src/components/JSONSchema';
import streamSnapshotRequest from '@site/src/schemas/vendor/v2.11/jsm/jetstream/api/v1/stream_snapshot_request.json';
import streamSnapshotResponse from '@site/src/schemas/vendor/v2.11/jsm/jetstream/api/v1/stream_snapshot_response.json';

## Subject

`$JS.API.STREAM.SNAPSHOT.{stream}`

Where `{stream}` is the name of the stream.

## Request

<JSONSchema schema={streamSnapshotRequest} />

## Response

<JSONSchema schema={streamSnapshotResponse} />
