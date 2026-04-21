# Delete Consumer

Deletes a consumer.

import JSONSchema from '@site/src/components/JSONSchema';
import consumerDeleteResponse from '@site/src/schemas/vendor/v2.11/jsm/jetstream/api/v1/consumer_delete_response.json';

## Subject

`$JS.API.CONSUMER.DELETE.{stream}.{consumer}`

Where `{stream}` is the stream name and `{consumer}` is the consumer name.

## Response

<JSONSchema schema={consumerDeleteResponse} />
