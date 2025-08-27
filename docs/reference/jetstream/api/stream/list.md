# List Streams

Lists all streams.

## Subject

`$JS.API.STREAM.LIST`

import JSONSchema from '@site/src/components/JSONSchema';
import streamListRequest from '@site/jsm.go/schemas/jetstream/api/v1/stream_list_request.json';
import streamListResponse from '@site/jsm.go/schemas/jetstream/api/v1/stream_list_response.json';

## Request

<JSONSchema schema={streamListRequest} />

## Response

<JSONSchema schema={streamListResponse} />