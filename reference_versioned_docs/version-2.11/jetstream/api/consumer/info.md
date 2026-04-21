# Consumer Info

Retrieves consumer information.

import JSONSchema from '@site/src/components/JSONSchema';
import consumerInfoResponse from '@site/src/schemas/vendor/v2.11/jsm/jetstream/api/v1/consumer_info_response.json';

## Subject

`$JS.API.CONSUMER.INFO.{stream}.{consumer}`

Where `{stream}` is the stream name and `{consumer}` is the consumer name.

## Response

<JSONSchema schema={consumerInfoResponse} />
