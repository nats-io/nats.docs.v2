# account

<Reloadable state="not-reloadable" />
Account that leaf nodes authenticating as this user are
bound to. Each user in the list can name a different
account.

The account must be declared in the `accounts` block or
the server refuses to start. Leave it unset to bind to
the global account; the `account` on the surrounding
`authorization` block does not apply to users listed
here.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `string` | - | - |
