# Restore Stream

Restores a stream from a snapshot.

import JSONSchema from '@site/src/components/JSONSchema';
import streamRestoreRequest from '@site/src/schemas/vendor/v2.11/jsm/jetstream/api/v1/stream_restore_request.json';
import streamRestoreResponse from '@site/src/schemas/vendor/v2.11/jsm/jetstream/api/v1/stream_restore_response.json';

## Subject

`$JS.API.STREAM.RESTORE.{stream}`

Where `{stream}` is the name of the stream.

## Request

<JSONSchema schema={streamRestoreRequest} />

## Response

<JSONSchema schema={streamRestoreResponse} />
