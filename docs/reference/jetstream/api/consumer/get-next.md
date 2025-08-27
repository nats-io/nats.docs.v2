# Get Next Message

Gets next message(s) from a consumer.

## Subject

`$JS.API.CONSUMER.MSG.NEXT.{stream}.{consumer}`

Where `{stream}` is the stream name and `{consumer}` is the consumer name.

import JSONSchema from '@site/src/components/JSONSchema';
import consumerGetnextRequest from '@site/jsm.go/schemas/jetstream/api/v1/consumer_getnext_request.json';

## Request

<JSONSchema schema={consumerGetnextRequest} />