# Stream Names

Lists stream names.

import JSONSchema from '@site/src/components/JSONSchema';
import streamNamesRequest from '@site/src/schemas/vendor/v2.14/jsm/jetstream/api/v1/stream_names_request.json';
import streamNamesResponse from '@site/src/schemas/vendor/v2.14/jsm/jetstream/api/v1/stream_names_response.json';

## Subject

`$JS.API.STREAM.NAMES`

## Request

<JSONSchema schema={streamNamesRequest} />

## Response

<JSONSchema schema={streamNamesResponse} />
