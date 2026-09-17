# max_connections

<Aliases aliases="max_conns" />
<Reloadable state="reloadable" note="Enforced against already-connected clients: re-registration during the reload fails once the account is at the new limit and those connections are closed with MaxAccountConnectionsExceeded. Which connections get dropped follows map iteration order." />
The maximum number of concurrent connections for this account.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `integer` | - | - |
