# Pause Consumer

Pauses or resumes a consumer.

## Subject

`$JS.API.CONSUMER.PAUSE.{stream}.{consumer}`

Where `{stream}` is the stream name and `{consumer}` is the consumer name.

import JSONSchema from '@site/src/components/JSONSchema';
import consumerPauseRequest from '@site/jsm.go/schemas/jetstream/api/v1/consumer_pause_request.json';
import consumerPauseResponse from '@site/jsm.go/schemas/jetstream/api/v1/consumer_pause_response.json';

## Request

<JSONSchema schema={consumerPauseRequest} />

## Response

<JSONSchema schema={consumerPauseResponse} />