# Update Stream

Updates an existing stream configuration.

import JSONSchema from '@site/src/components/JSONSchema';
import streamUpdateRequest from '@site/src/schemas/vendor/v2.14/jsm/jetstream/api/v1/stream_update_request.json';
import streamUpdateResponse from '@site/src/schemas/vendor/v2.14/jsm/jetstream/api/v1/stream_update_response.json';

## Subject

`$JS.API.STREAM.UPDATE.{stream}`

Where `{stream}` is the name of the stream to update.

## Request

<JSONSchema schema={streamUpdateRequest} />

## Response

<JSONSchema schema={streamUpdateResponse} />
