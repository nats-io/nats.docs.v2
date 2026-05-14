# accounts

<Reloadable /> 
Static config-defined accounts.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`users`](/reference/config/accounts/users) | A list of users under this account. | `object` | - | Yes |
| [`exports`](/reference/config/accounts/exports) | A list of exports for this account. | `object` | - | Yes |
| [`imports`](/reference/config/accounts/imports) | A list of imports for this account. | `object` | - | Yes |
| [`nkey`](/reference/config/accounts/nkey) | Public nkey associated with this account. TODO: when should this be used? | `string` | - | Yes |
| [`jetstream`](/reference/config/accounts/jetstream) |  | `(multiple)` | - | Yes |
| [`default_permissions`](/reference/config/accounts/default_permissions) | The default permissions applied to users within this account, if permissions are not explicitly defined for them. | `object` | - | Yes |
| [`mappings`](/reference/config/accounts/mappings) |  | `(multiple)` | - | Yes |
| [`limits`](/reference/config/accounts/limits) |  | `object` | - | Yes |
