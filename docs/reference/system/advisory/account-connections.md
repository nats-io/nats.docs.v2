# Account Connections

Account connection limit events.

## Subscription Subject

`$SYS.ACCOUNT.{account}.CONNECTIONS`

Where `{account}` is the account name.

import JSONSchema from '@site/src/components/JSONSchema';
import accountConnections from '@site/jsm.go/schemas/server/advisory/v1/account_connections.json';

## Event Schema

<JSONSchema schema={accountConnections} />