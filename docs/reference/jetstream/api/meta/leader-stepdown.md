# Meta Leader Stepdown

Initiates meta-group leader stepdown.

## Subject

`$JS.API.META.LEADER.STEPDOWN`

import JSONSchema from '@site/src/components/JSONSchema';
import metaLeaderStepdownRequest from '@site/jsm.go/schemas/jetstream/api/v1/meta_leader_stepdown_request.json';
import metaLeaderStepdownResponse from '@site/jsm.go/schemas/jetstream/api/v1/meta_leader_stepdown_response.json';

## Request

<JSONSchema schema={metaLeaderStepdownRequest} />

## Response

<JSONSchema schema={metaLeaderStepdownResponse} />