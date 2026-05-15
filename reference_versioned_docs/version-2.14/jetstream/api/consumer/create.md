# Create Consumer

Creates a new consumer.

import JSONSchema from '@site/src/components/JSONSchema';
import consumerCreateRequest from '@site/src/schemas/vendor/v2.14/jsm/jetstream/api/v1/consumer_create_request.json';
import consumerCreateResponse from '@site/src/schemas/vendor/v2.14/jsm/jetstream/api/v1/consumer_create_response.json';

## Subject

`$JS.API.CONSUMER.CREATE.{stream}.{consumer}`

Where `{stream}` is the stream name and `{consumer}` is the consumer name (optional).

## Request

<JSONSchema schema={consumerCreateRequest} />

## Response

<JSONSchema schema={consumerCreateResponse} />
