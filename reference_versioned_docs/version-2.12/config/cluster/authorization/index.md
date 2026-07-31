# authorization

<Reloadable state="reloadable" note="Only username/password/timeout/default_permissions are legal under cluster authorization." />
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
| [`username`](./username.md) | User name the connecting server authenticates with (requires `password`). | `string` | - | Yes |
| [`password`](./password.md) | Password the connecting server authenticates with (requires `username`). | `string` | - | Yes |
| [`default_permissions`](./default_permissions/index.md) | The default permissions applied to users, if permissions are not explicitly defined for them. | `object` | - | Yes\* |
| [`timeout`](./timeout.md) | Maximum number of seconds to wait for a client to authenticate. | `float` | `1` | Yes\* |

\* See the property page for reload caveats.
