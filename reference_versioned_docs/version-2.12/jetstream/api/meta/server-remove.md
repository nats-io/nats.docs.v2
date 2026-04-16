# Server Remove

Removes a server from the JetStream cluster.

import JSONSchema from '@site/src/components/JSONSchema';
import metaServerRemoveRequest from '@site/src/schemas/vendor/v2.12/jsm/jetstream/api/v1/meta_server_remove_request.json';
import metaServerRemoveResponse from '@site/src/schemas/vendor/v2.12/jsm/jetstream/api/v1/meta_server_remove_response.json';

## Subject

`$JS.API.META.SERVER.REMOVE`

## Request

<JSONSchema schema={metaServerRemoveRequest} />

## Response

<JSONSchema schema={metaServerRemoveResponse} />
