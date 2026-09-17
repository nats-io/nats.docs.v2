# accounts

<Reloadable state="reloadable" />
Static config-defined accounts.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`users`](./users/index.md) | A list of users under this account. | `object` | - | Yes |
| [`exports`](./exports/index.md) | A list of exports for this account. | `object` | - | Yes\* |
| [`imports`](./imports/index.md) | A list of imports for this account. | `object` | - | Yes\* |
| [`nkey`](./nkey.md) | Public NKey that identifies this account (an `A`-prefixed public account key). The server rejects the config if the value is not a valid public account NKey. | `string` | - | Yes\* |
| [`jetstream`](./jetstream/index.md) |  | `(multiple)` | - | Yes\* |
| [`default_permissions`](./default_permissions/index.md) | The default permissions applied to users within this account, if permissions are not explicitly defined for them. | `object` | - | Yes\* |
| [`msg_trace`](./msg_trace/index.md) | Where this account's message traces are delivered, and how often they are sampled. | `object` | - | Yes |
| [`mappings`](./mappings/index.md) |  | `(multiple)` | - | Yes\* |
| [`limits`](./limits/index.md) |  | `object` | - | Yes\* |

\* See the property page for reload caveats.
