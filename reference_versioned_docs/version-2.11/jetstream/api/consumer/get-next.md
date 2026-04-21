# Get Next Message

Gets next message(s) from a consumer.

import JSONSchema from '@site/src/components/JSONSchema';
import consumerGetnextRequest from '@site/src/schemas/vendor/v2.11/jsm/jetstream/api/v1/consumer_getnext_request.json';

## Subject

`$JS.API.CONSUMER.MSG.NEXT.{stream}.{consumer}`

Where `{stream}` is the stream name and `{consumer}` is the consumer name.

## Request

<JSONSchema schema={consumerGetnextRequest} />
