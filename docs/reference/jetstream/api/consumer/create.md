# Create Consumer

Creates a new consumer.

## Subject

`$JS.API.CONSUMER.CREATE.{stream}.{consumer}`

Where `{stream}` is the stream name and `{consumer}` is the consumer name (optional).

import JSONSchema from '@site/src/components/JSONSchema';
import consumerCreateRequest from '@site/jsm.go/schemas/jetstream/api/v1/consumer_create_request.json';
import consumerCreateResponse from '@site/jsm.go/schemas/jetstream/api/v1/consumer_create_response.json';

## Request

<JSONSchema schema={consumerCreateRequest} />

## Response

<JSONSchema schema={consumerCreateResponse} />
