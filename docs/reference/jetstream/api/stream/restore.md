# Restore Stream

Restores a stream from a snapshot.

## Subject

`$JS.API.STREAM.RESTORE.{stream}`

Where `{stream}` is the name of the stream.

import JSONSchema from '@site/src/components/JSONSchema';
import streamRestoreRequest from '@site/jsm.go/schemas/jetstream/api/v1/stream_restore_request.json';
import streamRestoreResponse from '@site/jsm.go/schemas/jetstream/api/v1/stream_restore_response.json';

## Request

<JSONSchema schema={streamRestoreRequest} />

## Response

<JSONSchema schema={streamRestoreResponse} />