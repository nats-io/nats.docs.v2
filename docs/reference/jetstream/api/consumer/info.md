# Consumer Info

Retrieves consumer information.

## Subject

`$JS.API.CONSUMER.INFO.{stream}.{consumer}`

Where `{stream}` is the stream name and `{consumer}` is the consumer name.

import JSONSchema from '@site/src/components/JSONSchema';
import consumerInfoResponse from '@site/jsm.go/schemas/jetstream/api/v1/consumer_info_response.json';

## Response

<JSONSchema schema={consumerInfoResponse} />