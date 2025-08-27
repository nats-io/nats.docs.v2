# Get Message

Retrieves a specific message from a stream.

## Subject

`$JS.API.STREAM.MSG.GET.{stream}`

Where `{stream}` is the name of the stream.

import JSONSchema from '@site/src/components/JSONSchema';
import streamMsgGetRequest from '@site/jsm.go/schemas/jetstream/api/v1/stream_msg_get_request.json';
import streamMsgGetResponse from '@site/jsm.go/schemas/jetstream/api/v1/stream_msg_get_response.json';

## Request

<JSONSchema schema={streamMsgGetRequest} />

## Response

<JSONSchema schema={streamMsgGetResponse} />