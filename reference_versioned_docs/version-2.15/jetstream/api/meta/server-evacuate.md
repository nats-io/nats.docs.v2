# Server Evacuate

Moves every stream and consumer off one server, so it can be taken out of the cluster. Each asset keeps its replica count and the server picks the replacement peers. Replacement is best effort: an asset with no qualifying peer is moved off the server anyway and runs under-replicated until one becomes available. The evacuated server is excluded from placement for those assets so they are not handed straight back to it.

import JSONSchema from '@site/src/components/JSONSchema';
import metaServerEvacuateRequest from '@site/src/schemas/vendor/v2.15/jsm/jetstream/api/v1/meta_server_evacuate_request.json';
import metaServerEvacuateResponse from '@site/src/schemas/vendor/v2.15/jsm/jetstream/api/v1/meta_server_evacuate_response.json';

## Subject

`$JS.API.SERVER.EVACUATE`

Only works from the system account.

## Request

<JSONSchema schema={metaServerEvacuateRequest} />

## Response

<JSONSchema schema={metaServerEvacuateResponse} />
