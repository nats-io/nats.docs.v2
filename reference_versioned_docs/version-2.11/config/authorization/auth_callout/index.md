# auth_callout

<Reloadable /> 
Enables the auth callout functionality.
All client connections requiring authentication will have
their credentials pass-through to a dedicated auth service.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`issuer`](./issuer.md) | An account public NKey. | `string` | - | Yes |
| [`account`](./account.md) | The name or public NKey of an account of the users which will be used by the authorization service to connect to the server. | `string` | `$G` | Yes |
| [`users`](./users.md) | The names or public NKeys of users within the defined account that will be used by the the auth service itself and thus bypass auth callout. | `string` | - | Yes |
| [`key`](./key.md) | A public XKey that will encrypt server requests to the auth service. | `string` | - | Yes |
