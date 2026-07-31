# username

<Aliases aliases="user" />
<Reloadable state="reloadable" note="usernameOption embeds authOption, so the reload re-authenticates every live connection against the new simple-auth username; clients still presenting the old one are disconnected." />
Specifies a global user name that clients can use to authenticate
the server (requires `password`, exclusive of `token`).


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `string` | - | - |
