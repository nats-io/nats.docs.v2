# List Consumers

Lists consumers for a stream.

import JSONSchema from '@site/src/components/JSONSchema';
import consumerListRequest from '@site/src/schemas/vendor/v2.14/jsm/jetstream/api/v1/consumer_list_request.json';
import consumerListResponse from '@site/src/schemas/vendor/v2.14/jsm/jetstream/api/v1/consumer_list_response.json';

## Subject

`$JS.API.CONSUMER.LIST.{stream}`

Where `{stream}` is the stream name.

## Request

<JSONSchema schema={consumerListRequest} />

## Response

<JSONSchema schema={consumerListResponse} />
