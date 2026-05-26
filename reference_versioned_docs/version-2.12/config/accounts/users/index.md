# users

<Reloadable /> 
A list of users under this account.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`username`](/reference/2.12/config/accounts/users/username) | Name of the user. | `string` | - | Yes |
| [`password`](/reference/2.12/config/accounts/users/password) | Password of the user. This can be a free-text value (not recommended) or a bcrypted value using the `nats server passwd` CLI command. | `string` | - | Yes |
| [`nkey`](/reference/2.12/config/accounts/users/nkey) | Public NKey identifying the user. The value begins with a `U` character. Exclusive with `username` and `password`. | `string` | - | Yes |
| [`permissions`](/reference/2.12/config/accounts/users/permissions) |  | `object` | - | Yes |
| [`allowed_connection_types`](/reference/2.12/config/accounts/users/allowed_connection_types) | If specified, the user is constrained to the specified connection types.  - `STANDARD` indicates a standard client TCP connection using the   NATS protocol. - `WEBSOCKET` indicates a WebSocket-based connection to NATS if the   `websockets` configuration is enabled. - `LEAFNODE` indicates a connection established by configured leafnode   `remote` on a server. - `MQTT` indicates a connection established by an MQTT client to NATS   if the `mqtt` configuration is enabled. | `string` | - | Yes |
