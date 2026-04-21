# Stats Response

Service statistics and metrics response.

import JSONSchema from '@site/src/components/JSONSchema';
import statsResponse from '@site/src/schemas/vendor/v2.11/jsm/micro/v1/stats_response.json';

## Request Subject

`$SRV.STATS`

Services respond to stats requests on their specific subjects:
- `$SRV.STATS.{service}` - Statistics for all instances of a service
- `$SRV.STATS.{service}.{id}` - Statistics for a specific service instance

## Response Schema

<JSONSchema schema={statsResponse} />
