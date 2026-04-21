# Client Disconnect

Client disconnection events.

import JSONSchema from '@site/src/components/JSONSchema';
import clientDisconnect from '@site/src/schemas/vendor/v2.11/jsm/server/advisory/v1/client_disconnect.json';

## Subscription Subject

`$SYS.ACCOUNT.{account}.DISCONNECT`

Where `{account}` is the account name.

## Event Schema

<JSONSchema schema={clientDisconnect} />
