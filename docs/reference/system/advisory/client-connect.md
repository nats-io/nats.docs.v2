# Client Connect

Client connection events.

## Subscription Subject

`$SYS.ACCOUNT.{account}.CONNECT`

Where `{account}` is the account name.

import JSONSchema from '@site/src/components/JSONSchema';
import clientConnect from '@site/jsm.go/schemas/server/advisory/v1/client_connect.json';

## Event Schema

<JSONSchema schema={clientConnect} />