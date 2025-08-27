# API Limit Reached

API rate limit reached events.

## Subscription Subject

`$JS.EVENT.ADVISORY.API.LIMIT_REACHED.{account}`

Where `{account}` is the account name.

import JSONSchema from '@site/src/components/JSONSchema';
import apiLimitReached from '@site/jsm.go/schemas/jetstream/advisory/v1/api_limit_reached.json';

## Event Schema

<JSONSchema schema={apiLimitReached} />

