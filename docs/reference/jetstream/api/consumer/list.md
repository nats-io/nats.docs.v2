# List Consumers

Lists consumers for a stream.

## Subject

`$JS.API.CONSUMER.LIST.{stream}`

Where `{stream}` is the stream name.

import JSONSchema from '@site/src/components/JSONSchema';
import consumerListRequest from '@site/jsm.go/schemas/jetstream/api/v1/consumer_list_request.json';
import consumerListResponse from '@site/jsm.go/schemas/jetstream/api/v1/consumer_list_response.json';

## Request

<JSONSchema schema={consumerListRequest} />

## Response

<JSONSchema schema={consumerListResponse} />