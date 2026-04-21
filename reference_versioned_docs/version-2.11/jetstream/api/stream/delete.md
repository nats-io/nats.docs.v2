# Delete Stream

Deletes an existing stream.

import JSONSchema from '@site/src/components/JSONSchema';
import streamDeleteResponse from '@site/src/schemas/vendor/v2.11/jsm/jetstream/api/v1/stream_delete_response.json';

## Subject

`$JS.API.STREAM.DELETE.{stream}`

Where `{stream}` is the name of the stream to delete.

## Response

<JSONSchema schema={streamDeleteResponse} />
