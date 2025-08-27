# Stream Names

Lists stream names.

## Subject

`$JS.API.STREAM.NAMES`

import JSONSchema from '@site/src/components/JSONSchema';
import streamNamesRequest from '@site/jsm.go/schemas/jetstream/api/v1/stream_names_request.json';
import streamNamesResponse from '@site/jsm.go/schemas/jetstream/api/v1/stream_names_response.json';

## Request

<JSONSchema schema={streamNamesRequest} />

## Response

<JSONSchema schema={streamNamesResponse} />