# Purge Stream

Purges messages from a stream.

import JSONSchema from '@site/src/components/JSONSchema';
import streamPurgeRequest from '@site/src/schemas/vendor/v2.12/jsm/jetstream/api/v1/stream_purge_request.json';
import streamPurgeResponse from '@site/src/schemas/vendor/v2.12/jsm/jetstream/api/v1/stream_purge_response.json';

## Subject

`$JS.API.STREAM.PURGE.{stream}`

Where `{stream}` is the name of the stream.

## Request

<JSONSchema schema={streamPurgeRequest} />

## Response

<JSONSchema schema={streamPurgeResponse} />
