# authorization

<Reloadable /> 
Static single or multi-user declaration.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`username`](/reference/2.11/config/authorization/username) | Specifies a global user name that clients can use to authenticate the server (requires `password`, exclusive of `token`). | `string` | - | Yes |
| [`password`](/reference/2.11/config/authorization/password) | Specifies a global password that clients can use to authenticate the server (requires `user`, exclusive of `token`). | `string` | - | Yes |
| [`token`](/reference/2.11/config/authorization/token) | Specifies a global token that clients can use to authenticate with the server (exclusive of `user` and `password`). | `string` | - | Yes |
| [`users`](/reference/2.11/config/authorization/users) | A list of multiple users with different credentials. | `object` | - | Yes |
| [`default_permissions`](/reference/2.11/config/authorization/default_permissions) | The default permissions applied to users, if permissions are not explicitly defined for them. | `object` | - | Yes |
| [`timeout`](/reference/2.11/config/authorization/timeout) | Maximum number of seconds to wait for a client to authenticate. | `float` | `1` | Yes |
| [`auth_callout`](/reference/2.11/config/authorization/auth_callout) | Enables the auth callout functionality. All client connections requiring authentication will have their credentials pass-through to a dedicated auth service. | `object` | - | Yes |
