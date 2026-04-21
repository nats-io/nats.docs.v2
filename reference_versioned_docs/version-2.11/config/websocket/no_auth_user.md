# no_auth_user

<Reloadable /> 
If no user name is provided when an MQTT client connects, will default
this user name in the authentication phase. If specified, this will
override, for MQTT clients, any `no_auth_user` value defined in the
main configuration file.
*Note: that this is not compatible with running the server in
operator mode.*


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `string` | - | - |
