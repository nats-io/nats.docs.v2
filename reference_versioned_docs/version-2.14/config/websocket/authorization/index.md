# authorization

<Reloadable /> 

## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`username`](/reference/config/websocket/authorization/username) | Specifies a global user name that clients can use to authenticate the server (requires `password`, exclusive of `token`). | `string` | - | Yes |
| [`password`](/reference/config/websocket/authorization/password) | Specifies a global password that clients can use to authenticate the server (requires `user`, exclusive of `token`). | `string` | - | Yes |
| [`token`](/reference/config/websocket/authorization/token) | Specifies a global token that clients can use to authenticate with the server (exclusive of `user` and `password`). | `string` | - | Yes |
| [`timeout`](/reference/config/websocket/authorization/timeout) | Maximum number of seconds to wait for a client to authenticate. | `float` | `1` | Yes |
