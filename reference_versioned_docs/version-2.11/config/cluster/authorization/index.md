# authorization

<Reloadable /> 
Authorization map for configuring cluster routes. When a single username/password is used, it defines the authentication mechanism
this server expects, and how this server will authenticate itself when establishing a connection to a discovered route. This will
not be used for routes explicitly listed in routes and therefore have to be provided as part of the URL. With this authentication
mode, either use the same credentials throughout the system or list every route explicitly on every server.

If the `tls` configuration map specifies `verify_and_map` only, provide the expected username. Here different certificates can be
used, but they have to map to the same `username`. The authorization map also allows for timeout which is honored but users and
token configuration are not supported and will prevent the server from starting. The `permissions` block is ignored.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`username`](/reference/config/cluster/authorization/username) | Specifies a global user name that clients can use to authenticate the server (requires `password`, exclusive of `token`). | `string` | - | Yes |
| [`password`](/reference/config/cluster/authorization/password) | Specifies a global password that clients can use to authenticate the server (requires `user`, exclusive of `token`). | `string` | - | Yes |
| [`token`](/reference/config/cluster/authorization/token) | Specifies a global token that clients can use to authenticate with the server (exclusive of `user` and `password`). | `string` | - | Yes |
| [`users`](/reference/config/cluster/authorization/users) | A list of multiple users with different credentials. | `object` | - | Yes |
| [`default_permissions`](/reference/config/cluster/authorization/default_permissions) | The default permissions applied to users, if permissions are not explicitly defined for them. | `object` | - | Yes |
| [`timeout`](/reference/config/cluster/authorization/timeout) | Maximum number of seconds to wait for a client to authenticate. | `float` | `1` | Yes |
