# Meta Rescue

Lowers the quorum the meta group needs, so peers can be removed when too many servers are permanently gone. This is unsafe and is only for disaster recovery.

import JSONSchema from '@site/src/components/JSONSchema';
import metaRescueRequest from '@site/src/schemas/vendor/v2.15/jsm/jetstream/api/v1/meta_rescue_request.json';
import metaRescueResponse from '@site/src/schemas/vendor/v2.15/jsm/jetstream/api/v1/meta_rescue_response.json';

## Subject

`$JS.API.META.RESCUE`

Only works from the system account. This is a broadcast subject: every online server evaluates the request and replies on its own, so expect one response per server rather than a single reply.

## Request

<JSONSchema schema={metaRescueRequest} />

## Response

<JSONSchema schema={metaRescueResponse} />
