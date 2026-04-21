# Pause Consumer

Pauses or resumes a consumer.

import JSONSchema from '@site/src/components/JSONSchema';
import consumerPauseRequest from '@site/src/schemas/vendor/v2.12/jsm/jetstream/api/v1/consumer_pause_request.json';
import consumerPauseResponse from '@site/src/schemas/vendor/v2.12/jsm/jetstream/api/v1/consumer_pause_response.json';

## Subject

`$JS.API.CONSUMER.PAUSE.{stream}.{consumer}`

Where `{stream}` is the stream name and `{consumer}` is the consumer name.

## Request

<JSONSchema schema={consumerPauseRequest} />

## Response

<JSONSchema schema={consumerPauseResponse} />
