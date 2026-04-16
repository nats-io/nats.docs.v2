# Meta Leader Stepdown

Initiates meta-group leader stepdown.

import JSONSchema from '@site/src/components/JSONSchema';
import metaLeaderStepdownRequest from '@site/src/schemas/vendor/v2.12/jsm/jetstream/api/v1/meta_leader_stepdown_request.json';
import metaLeaderStepdownResponse from '@site/src/schemas/vendor/v2.12/jsm/jetstream/api/v1/meta_leader_stepdown_response.json';

## Subject

`$JS.API.META.LEADER.STEPDOWN`

## Request

<JSONSchema schema={metaLeaderStepdownRequest} />

## Response

<JSONSchema schema={metaLeaderStepdownResponse} />
