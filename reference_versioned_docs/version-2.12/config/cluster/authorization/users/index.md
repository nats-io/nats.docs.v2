# users

<Reloadable /> 
A list of multiple users with different credentials.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`username`](/reference/config/cluster/authorization/users/username) | Name of the user. | `string` | - | Yes |
| [`password`](/reference/config/cluster/authorization/users/password) | Password of the user. This can be a free-text value (not recommended) or a bcrypted value using the `nats server passwd` CLI command. | `string` | - | Yes |
| [`nkey`](/reference/config/cluster/authorization/users/nkey) | Public NKey identifying the user. The value begins with a `U` character. Exclusive with `username` and `password`. | `string` | - | Yes |
| [`permissions`](/reference/config/cluster/authorization/users/permissions) |  | `object` | - | Yes |
| [`allowed_connection_types`](/reference/config/cluster/authorization/users/allowed_connection_types) | If specified, the user is constrained to the specified connection types.  - `STANDARD` indicates a standard client TCP connection using the   NATS protocol. - `WEBSOCKET` indicates a WebSocket-based connection to NATS if the   `websockets` configuration is enabled. - `LEAFNODE` indicates a connection established by configured leafnode   `remote` on a server. - `MQTT` indicates a connection established by an MQTT client to NATS   if the `mqtt` configuration is enabled. | `string` | - | Yes |
