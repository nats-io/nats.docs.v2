# Purge Stream

Purges messages from a stream.

## Subject

`$JS.API.STREAM.PURGE.{stream}`

Where `{stream}` is the name of the stream.

import JSONSchema from '@site/src/components/JSONSchema';
import streamPurgeRequest from '@site/jsm.go/schemas/jetstream/api/v1/stream_purge_request.json';
import streamPurgeResponse from '@site/jsm.go/schemas/jetstream/api/v1/stream_purge_response.json';

## Request

<JSONSchema schema={streamPurgeRequest} />

## Response

<JSONSchema schema={streamPurgeResponse} />