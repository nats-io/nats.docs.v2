# Consumer Names

Lists consumer names for a stream.

import JSONSchema from '@site/src/components/JSONSchema';
import consumerNamesRequest from '@site/src/schemas/vendor/v2.11/jsm/jetstream/api/v1/consumer_names_request.json';
import consumerNamesResponse from '@site/src/schemas/vendor/v2.11/jsm/jetstream/api/v1/consumer_names_response.json';

## Subject

`$JS.API.CONSUMER.NAMES.{stream}`

Where `{stream}` is the stream name.

## Request

<JSONSchema schema={consumerNamesRequest} />

## Response

<JSONSchema schema={consumerNamesResponse} />
