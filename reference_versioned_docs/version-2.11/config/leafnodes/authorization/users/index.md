# users

<Reloadable state="not-reloadable" note="Reordering the users array is accepted because the comparison is keyed by username." />
A list of multiple users with different credentials.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`username`](./username.md) | Name of the user. | `string` | - | No |
| [`password`](./password.md) | Password of the user. This can be a free-text value (not recommended) or a bcrypted value using the `nats server passwd` CLI command. | `string` | - | No |
| [`account`](./account.md) | Account that leaf nodes authenticating as this user are bound to. Each user in the list can name a different account.  The account must be declared in the `accounts` block or the server refuses to start. Leave it unset to bind to the global account; the `account` on the surrounding `authorization` block does not apply to users listed here. | `string` | - | No |
