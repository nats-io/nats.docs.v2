# API Limit Reached

API request queue limit reached events.

import JSONSchema from '@site/src/components/JSONSchema';
import apiLimitReached from '@site/src/schemas/vendor/v2.14/jsm/jetstream/advisory/v1/api_limit_reached.json';

## Subscription Subject

`$JS.EVENT.ADVISORY.API.LIMIT_REACHED`

The subject has no account token. The server publishes this advisory in the system account, and the `server` field identifies the server that hit the limit.

## Event Schema

<JSONSchema schema={apiLimitReached} />
