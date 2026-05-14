# Account Connections

Account connection limit events.

import JSONSchema from '@site/src/components/JSONSchema';
import accountConnections from '@site/src/schemas/vendor/v2.14/jsm/server/advisory/v1/account_connections.json';

## Subscription Subject

`$SYS.ACCOUNT.{account}.CONNECTIONS`

Where `{account}` is the account name.

## Event Schema

<JSONSchema schema={accountConnections} />
