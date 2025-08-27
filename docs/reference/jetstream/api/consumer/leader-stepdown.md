# Leader Stepdown

Initiates leader stepdown for a consumer.

## Subject

`$JS.API.CONSUMER.LEADER.STEPDOWN.{stream}.{consumer}`

Where `{stream}` is the stream name and `{consumer}` is the consumer name.

import JSONSchema from '@site/src/components/JSONSchema';
import consumerLeaderStepdownRequest from '@site/jsm.go/schemas/jetstream/api/v1/consumer_leader_stepdown_request.json';
import consumerLeaderStepdownResponse from '@site/jsm.go/schemas/jetstream/api/v1/consumer_leader_stepdown_response.json';

## Request

<JSONSchema schema={consumerLeaderStepdownRequest} />

## Response

<JSONSchema schema={consumerLeaderStepdownResponse} />