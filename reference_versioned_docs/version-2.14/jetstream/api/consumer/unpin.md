# Unpin Consumer

Unpins a consumer group.

import JSONSchema from '@site/src/components/JSONSchema';
import consumerUnpinRequest from '@site/src/schemas/vendor/v2.14/jsm/jetstream/api/v1/consumer_unpin_request.json';
import consumerUnpinResponse from '@site/src/schemas/vendor/v2.14/jsm/jetstream/api/v1/consumer_unpin_response.json';

## Subject

`$JS.API.CONSUMER.UNPIN.{stream}.{consumer}`

Where `{stream}` is the stream name and `{consumer}` is the consumer name.

## Request

<JSONSchema schema={consumerUnpinRequest} />

## Response

<JSONSchema schema={consumerUnpinResponse} />
