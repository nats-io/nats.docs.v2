# API Limit Reached

API rate limit reached events.

import JSONSchema from '@site/src/components/JSONSchema';
import apiLimitReached from '@site/src/schemas/vendor/v2.12/jsm/jetstream/advisory/v1/api_limit_reached.json';

## Subscription Subject

`$JS.EVENT.ADVISORY.API.LIMIT_REACHED.{account}`

Where `{account}` is the account name.

## Event Schema

<JSONSchema schema={apiLimitReached} />
