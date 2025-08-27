# Delete Consumer

Deletes a consumer.

## Subject

`$JS.API.CONSUMER.DELETE.{stream}.{consumer}`

Where `{stream}` is the stream name and `{consumer}` is the consumer name.

import JSONSchema from '@site/src/components/JSONSchema';
import consumerDeleteResponse from '@site/jsm.go/schemas/jetstream/api/v1/consumer_delete_response.json';

## Response

<JSONSchema schema={consumerDeleteResponse} />