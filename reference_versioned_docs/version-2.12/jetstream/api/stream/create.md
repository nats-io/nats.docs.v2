# Create Stream

Creates a new stream with the specified configuration.

import JSONSchema from '@site/src/components/JSONSchema';
import streamCreateRequest from '@site/src/schemas/vendor/v2.12/jsm/jetstream/api/v1/stream_create_request.json';
import streamCreateResponse from '@site/src/schemas/vendor/v2.12/jsm/jetstream/api/v1/stream_create_response.json';

## Subject

`$JS.API.STREAM.CREATE.{stream}`

Where `{stream}` is the name of the stream to create.

## Request

<JSONSchema schema={streamCreateRequest} />

## Response

<JSONSchema schema={streamCreateResponse} />
