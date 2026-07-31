# authorization

<Reloadable state="not-reloadable" note="Any change to gateway username, password or timeout fails the whole reload." />
Authorization map for gateways. When a single username/password is
used, it defines the authentication mechanism this server expects,
and how this server will authenticate itself when establishing
a connection to a discovered gateway. This will not be used for
gateways explicitly listed in gateways and therefore have to be
provided as part of the URL. With this authentication mode, either
use the same credentials throughout the system or list every gateway
explicitly on every server. If the tls configuration map specifies
verify_and_map only provide the expected username. Here different
certificates can be used, but they do have to map to the same username.
The authorization map also allows for timeout which is honored but
users and token configuration are not supported and will prevent the
server from starting. The permissions block is ignored.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`username`](./username.md) | User name the connecting server authenticates with (requires `password`). | `string` | - | No |
| [`password`](./password.md) | Password the connecting server authenticates with (requires `username`). | `string` | - | No |
| [`default_permissions`](./default_permissions/index.md) | The default permissions applied to users, if permissions are not explicitly defined for them. | `object` | - | Ignored\* |
| [`timeout`](./timeout.md) | Maximum number of seconds to wait for a client to authenticate. | `float` | `1` | No |

\* See the property page for reload caveats.
