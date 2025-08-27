# Server Remove

Removes a server from the JetStream cluster.

## Subject

`$JS.API.META.SERVER.REMOVE`

import JSONSchema from '@site/src/components/JSONSchema';
import metaServerRemoveRequest from '@site/jsm.go/schemas/jetstream/api/v1/meta_server_remove_request.json';
import metaServerRemoveResponse from '@site/jsm.go/schemas/jetstream/api/v1/meta_server_remove_response.json';

## Request

<JSONSchema schema={metaServerRemoveRequest} />

## Response

<JSONSchema schema={metaServerRemoveResponse} />