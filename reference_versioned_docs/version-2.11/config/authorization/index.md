# authorization

<Reloadable state="reloadable" />
Static single or multi-user declaration.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`username`](./username.md) | Specifies a global user name that clients can use to authenticate the server (requires `password`, exclusive of `token`). | `string` | - | Yes\* |
| [`password`](./password.md) | Specifies a global password that clients can use to authenticate the server (requires `user`, exclusive of `token`). | `string` | - | Yes\* |
| [`token`](./token.md) | Specifies a global token that clients can use to authenticate with the server (exclusive of `user` and `password`). | `string` | - | Yes\* |
| [`users`](./users/index.md) | A list of multiple users with different credentials. | `object` | - | Yes |
| [`default_permissions`](./default_permissions/index.md) | The default permissions applied to users, if permissions are not explicitly defined for them. | `object` | - | Yes\* |
| [`timeout`](./timeout.md) | Maximum number of seconds to wait for a client to authenticate. | `float` | `1` | Yes\* |
| [`auth_callout`](./auth_callout/index.md) | Enables the auth callout functionality. All client connections requiring authentication will have their credentials pass-through to a dedicated auth service. | `object` | - | No\* |

\* See the property page for reload caveats.
