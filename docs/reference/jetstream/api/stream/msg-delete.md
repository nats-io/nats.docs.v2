# Delete Message

Deletes a specific message from a stream.

## Subject

`$JS.API.STREAM.MSG.DELETE.{stream}`

Where `{stream}` is the name of the stream.

import JSONSchema from '@site/src/components/JSONSchema';
import streamMsgDeleteRequest from '@site/jsm.go/schemas/jetstream/api/v1/stream_msg_delete_request.json';
import streamMsgDeleteResponse from '@site/jsm.go/schemas/jetstream/api/v1/stream_msg_delete_response.json';

## Request

<JSONSchema schema={streamMsgDeleteRequest} />

## Response

<JSONSchema schema={streamMsgDeleteResponse} />