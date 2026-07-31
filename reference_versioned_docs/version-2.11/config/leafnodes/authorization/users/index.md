# users

<Reloadable state="not-reloadable" note="Reordering the users array is accepted because the comparison is keyed by username." />
A list of multiple users with different credentials.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`username`](./username.md) | Name of the user. | `string` | - | No |
| [`password`](./password.md) | Password of the user. This can be a free-text value (not recommended) or a bcrypted value using the `nats server passwd` CLI command. | `string` | - | No |
