# Unpin Consumer

Unpins a consumer group.

## Subject

`$JS.API.CONSUMER.UNPIN.{stream}.{consumer}`

Where `{stream}` is the stream name and `{consumer}` is the consumer name.

import JSONSchema from '@site/src/components/JSONSchema';
import consumerUnpinRequest from '@site/jsm.go/schemas/jetstream/api/v1/consumer_unpin_request.json';
import consumerUnpinResponse from '@site/jsm.go/schemas/jetstream/api/v1/consumer_unpin_response.json';

## Request

<JSONSchema schema={consumerUnpinRequest} />

## Response

<JSONSchema schema={consumerUnpinResponse} />