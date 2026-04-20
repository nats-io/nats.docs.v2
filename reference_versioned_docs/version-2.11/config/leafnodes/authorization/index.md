# authorization

<Reloadable /> 
Authorization scoped to accepting leaf node connections.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`username`](/reference/2.11/config/leafnodes/authorization/username) | Specifies a global user name that clients can use to authenticate the server (requires `password`, exclusive of `token`). | `string` | - | Yes |
| [`password`](/reference/2.11/config/leafnodes/authorization/password) | Specifies a global password that clients can use to authenticate the server (requires `user`, exclusive of `token`). | `string` | - | Yes |
| [`token`](/reference/2.11/config/leafnodes/authorization/token) | Specifies a global token that clients can use to authenticate with the server (exclusive of `user` and `password`). | `string` | - | Yes |
| [`users`](/reference/2.11/config/leafnodes/authorization/users) | A list of multiple users with different credentials. | `object` | - | Yes |
| [`default_permissions`](/reference/2.11/config/leafnodes/authorization/default_permissions) | The default permissions applied to users, if permissions are not explicitly defined for them. | `object` | - | Yes |
| [`timeout`](/reference/2.11/config/leafnodes/authorization/timeout) | Maximum number of seconds to wait for a client to authenticate. | `float` | `1` | Yes |
