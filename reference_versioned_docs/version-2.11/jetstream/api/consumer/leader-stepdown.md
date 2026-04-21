# Leader Stepdown

Initiates leader stepdown for a consumer.

import JSONSchema from '@site/src/components/JSONSchema';
import consumerLeaderStepdownRequest from '@site/src/schemas/vendor/v2.11/jsm/jetstream/api/v1/consumer_leader_stepdown_request.json';
import consumerLeaderStepdownResponse from '@site/src/schemas/vendor/v2.11/jsm/jetstream/api/v1/consumer_leader_stepdown_response.json';

## Subject

`$JS.API.CONSUMER.LEADER.STEPDOWN.{stream}.{consumer}`

Where `{stream}` is the stream name and `{consumer}` is the consumer name.

## Request

<JSONSchema schema={consumerLeaderStepdownRequest} />

## Response

<JSONSchema schema={consumerLeaderStepdownResponse} />
