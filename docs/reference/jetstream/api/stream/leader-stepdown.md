# Leader Stepdown

Initiates leader stepdown for a stream.

## Subject

`$JS.API.STREAM.LEADER.STEPDOWN.{stream}`

Where `{stream}` is the name of the stream.

import JSONSchema from '@site/src/components/JSONSchema';
import streamLeaderStepdownRequest from '@site/jsm.go/schemas/jetstream/api/v1/stream_leader_stepdown_request.json';
import streamLeaderStepdownResponse from '@site/jsm.go/schemas/jetstream/api/v1/stream_leader_stepdown_response.json';

## Request

<JSONSchema schema={streamLeaderStepdownRequest} />

## Response

<JSONSchema schema={streamLeaderStepdownResponse} />