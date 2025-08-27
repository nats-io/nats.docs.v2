# Healthz

import JSONSchema from '@site/src/components/JSONSchema';
import healthzRequest from '@site/jsm.go/schemas/server/monitor/v1/healthz_request.json';
import healthzResponse from '@site/jsm.go/schemas/server/monitor/v1/healthz_response.json';

## Request Schema

<JSONSchema schema={healthzRequest} />

## Response Schema

<JSONSchema schema={healthzResponse} />