# Snapshot Stream

Creates a snapshot of a stream.

## Subject

`$JS.API.STREAM.SNAPSHOT.{stream}`

Where `{stream}` is the name of the stream.

import JSONSchema from '@site/src/components/JSONSchema';
import streamSnapshotRequest from '@site/jsm.go/schemas/jetstream/api/v1/stream_snapshot_request.json';
import streamSnapshotResponse from '@site/jsm.go/schemas/jetstream/api/v1/stream_snapshot_response.json';

## Request

<JSONSchema schema={streamSnapshotRequest} />

## Response

<JSONSchema schema={streamSnapshotResponse} />