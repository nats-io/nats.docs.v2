# Info Response

Service information and metadata response.

import JSONSchema from '@site/src/components/JSONSchema';
import infoResponse from '@site/src/schemas/vendor/v2.14/jsm/micro/v1/info_response.json';

## Request Subject

`$SRV.INFO`

Services respond to info requests on their specific subjects:
- `$SRV.INFO.{service}` - Info for all instances of a service
- `$SRV.INFO.{service}.{id}` - Info for a specific service instance

## Response Schema

<JSONSchema schema={infoResponse} />
