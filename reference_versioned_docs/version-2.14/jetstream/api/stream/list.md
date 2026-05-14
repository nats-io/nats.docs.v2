# List Streams

Lists all streams.

import JSONSchema from '@site/src/components/JSONSchema';
import streamListRequest from '@site/src/schemas/vendor/v2.14/jsm/jetstream/api/v1/stream_list_request.json';
import streamListResponse from '@site/src/schemas/vendor/v2.14/jsm/jetstream/api/v1/stream_list_response.json';

## Subject

`$JS.API.STREAM.LIST`

## Request

<JSONSchema schema={streamListRequest} />

## Response

<JSONSchema schema={streamListResponse} />
