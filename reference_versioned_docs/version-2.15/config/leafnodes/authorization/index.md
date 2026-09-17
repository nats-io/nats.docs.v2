# authorization

<Reloadable state="not-reloadable" />
Authorization scoped to accepting leaf node connections.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`username`](./username.md) | User name the connecting server authenticates with (requires `password`). | `string` | - | No |
| [`password`](./password.md) | Password the connecting server authenticates with (requires `username`). | `string` | - | No |
| [`users`](./users/index.md) | A list of multiple users with different credentials. | `object` | - | No\* |
| [`timeout`](./timeout.md) | Maximum number of seconds to wait for a client to authenticate. | `float` | `1` | No |
| [`account`](./account.md) | Account that leaf nodes authenticating with these credentials are bound to. | `string` | - | No |
| [`nkey`](./nkey.md) | Public user nkey a connecting leaf node must sign for. | `string` | - | No |
| [`proxy_required`](./proxy_required.md) | Reject leaf node connections that did not arrive through a PROXY protocol header. | `boolean` | `false` | No |

\* See the property page for reload caveats.
