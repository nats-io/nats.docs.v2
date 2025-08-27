# Consumer Names

Lists consumer names for a stream.

## Subject

`$JS.API.CONSUMER.NAMES.{stream}`

Where `{stream}` is the stream name.

import JSONSchema from '@site/src/components/JSONSchema';
import consumerNamesRequest from '@site/jsm.go/schemas/jetstream/api/v1/consumer_names_request.json';
import consumerNamesResponse from '@site/jsm.go/schemas/jetstream/api/v1/consumer_names_response.json';

## Request

<JSONSchema schema={consumerNamesRequest} />

## Response

<JSONSchema schema={consumerNamesResponse} />