# Client Disconnect

Client disconnection events.

## Subscription Subject

`$SYS.ACCOUNT.{account}.DISCONNECT`

Where `{account}` is the account name.

import JSONSchema from '@site/src/components/JSONSchema';
import clientDisconnect from '@site/jsm.go/schemas/server/advisory/v1/client_disconnect.json';

## Event Schema

<JSONSchema schema={clientDisconnect} />