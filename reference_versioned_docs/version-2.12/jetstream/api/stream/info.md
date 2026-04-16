# Stream Info

Retrieves information about a stream.

import JSONSchema from '@site/src/components/JSONSchema';
import streamInfoRequest from '@site/src/schemas/vendor/v2.12/jsm/jetstream/api/v1/stream_info_request.json';
import streamInfoResponse from '@site/src/schemas/vendor/v2.12/jsm/jetstream/api/v1/stream_info_response.json';

## Subject

`$JS.API.STREAM.INFO.{stream}`

Where `{stream}` is the name of the stream.

## Request

<JSONSchema schema={streamInfoRequest} />

## Response

<JSONSchema schema={streamInfoResponse} />
