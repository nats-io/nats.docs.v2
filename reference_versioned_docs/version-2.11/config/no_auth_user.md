# no_auth_user

<Reloadable state="reloadable" note="Removing `no_auth_user` reloads, provided no user in the new configuration still has that username. Setting or changing it fails the reload." />
Name of the user that non-authenticated clients
will inherit the authorization controls of. This must be a user
defined in either the `authorization` or `accounts` block.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `string` | - | - |
