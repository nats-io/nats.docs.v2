# Delete Message

Deletes a specific message from a stream.

import JSONSchema from '@site/src/components/JSONSchema';
import streamMsgDeleteRequest from '@site/src/schemas/vendor/v2.11/jsm/jetstream/api/v1/stream_msg_delete_request.json';
import streamMsgDeleteResponse from '@site/src/schemas/vendor/v2.11/jsm/jetstream/api/v1/stream_msg_delete_response.json';

## Subject

`$JS.API.STREAM.MSG.DELETE.{stream}`

Where `{stream}` is the name of the stream.

## Request

<JSONSchema schema={streamMsgDeleteRequest} />

## Response

<JSONSchema schema={streamMsgDeleteResponse} />
