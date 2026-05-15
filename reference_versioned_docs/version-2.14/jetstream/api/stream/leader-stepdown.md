# Leader Stepdown

Initiates leader stepdown for a stream.

import JSONSchema from '@site/src/components/JSONSchema';
import streamLeaderStepdownRequest from '@site/src/schemas/vendor/v2.14/jsm/jetstream/api/v1/stream_leader_stepdown_request.json';
import streamLeaderStepdownResponse from '@site/src/schemas/vendor/v2.14/jsm/jetstream/api/v1/stream_leader_stepdown_response.json';

## Subject

`$JS.API.STREAM.LEADER.STEPDOWN.{stream}`

Where `{stream}` is the name of the stream.

## Request

<JSONSchema schema={streamLeaderStepdownRequest} />

## Response

<JSONSchema schema={streamLeaderStepdownResponse} />
