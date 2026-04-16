# Client Connect

Client connection events.

import JSONSchema from '@site/src/components/JSONSchema';
import clientConnect from '@site/src/schemas/vendor/v2.11/jsm/server/advisory/v1/client_connect.json';

## Subscription Subject

`$SYS.ACCOUNT.{account}.CONNECT`

Where `{account}` is the account name.

## Event Schema

<JSONSchema schema={clientConnect} />
