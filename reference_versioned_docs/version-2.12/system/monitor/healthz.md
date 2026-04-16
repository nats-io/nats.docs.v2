# Healthz

import JSONSchema from '@site/src/components/JSONSchema';
import healthzRequest from '@site/src/schemas/vendor/v2.12/server/monitor/v1/healthz_request.json';
import healthzResponse from '@site/src/schemas/vendor/v2.12/server/monitor/v1/healthz_response.json';

## Request Schema

<JSONSchema schema={healthzRequest} />

## Response Schema

<JSONSchema schema={healthzResponse} />
