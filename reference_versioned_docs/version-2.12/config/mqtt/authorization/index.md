# authorization

<Reloadable /> 

## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`username`](./username.md) | Specifies a global user name that clients can use to authenticate the server (requires `password`, exclusive of `token`). | `string` | - | Yes |
| [`password`](./password.md) | Specifies a global password that clients can use to authenticate the server (requires `user`, exclusive of `token`). | `string` | - | Yes |
| [`token`](./token.md) | Specifies a global token that clients can use to authenticate with the server (exclusive of `user` and `password`). | `string` | - | Yes |
| [`timeout`](./timeout.md) | Maximum number of seconds to wait for a client to authenticate. | `float` | `1` | Yes |
