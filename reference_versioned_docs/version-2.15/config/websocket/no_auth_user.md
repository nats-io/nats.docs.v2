# no_auth_user

<Reloadable state="not-reloadable" />
If no user name is provided when a WebSocket client connects, will
default this user name in the authentication phase. If specified, this
will override, for WebSocket clients, any `no_auth_user` value defined
in the main configuration file.

A leaf node connecting over WebSocket also picks this value up in
preference to the top-level `no_auth_user`.

*Note: that this is not compatible with running the server in
operator mode.*


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `string` | - | - |
