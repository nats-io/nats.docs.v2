# Get Message

Retrieves a specific message from a stream.

import JSONSchema from '@site/src/components/JSONSchema';
import streamMsgGetRequest from '@site/src/schemas/vendor/v2.12/jsm/jetstream/api/v1/stream_msg_get_request.json';
import streamMsgGetResponse from '@site/src/schemas/vendor/v2.12/jsm/jetstream/api/v1/stream_msg_get_response.json';

## Subject

`$JS.API.STREAM.MSG.GET.{stream}`

Where `{stream}` is the name of the stream.

## Request

<JSONSchema schema={streamMsgGetRequest} />

## Response

<JSONSchema schema={streamMsgGetResponse} />
