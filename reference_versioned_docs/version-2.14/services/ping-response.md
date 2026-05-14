# Ping Response

Service health check response.

import JSONSchema from '@site/src/components/JSONSchema';
import pingResponse from '@site/src/schemas/vendor/v2.14/jsm/micro/v1/ping_response.json';

## Request Subject

`$SRV.PING`

Services respond to ping requests on their specific subjects:
- `$SRV.PING.{service}` - Ping all instances of a service
- `$SRV.PING.{service}.{id}` - Ping a specific service instance

## Response Schema

<JSONSchema schema={pingResponse} />
