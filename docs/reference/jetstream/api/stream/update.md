# Update Stream

Updates an existing stream configuration.

## Subject

`$JS.API.STREAM.UPDATE.{stream}`

Where `{stream}` is the name of the stream to update.

import JSONSchema from '@site/src/components/JSONSchema';
import streamUpdateRequest from '@site/jsm.go/schemas/jetstream/api/v1/stream_update_request.json';
import streamUpdateResponse from '@site/jsm.go/schemas/jetstream/api/v1/stream_update_response.json';

## Request

<JSONSchema schema={streamUpdateRequest} />

## Response

<JSONSchema schema={streamUpdateResponse} />