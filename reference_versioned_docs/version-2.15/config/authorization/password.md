# password

<Aliases aliases="pass" />
<Reloadable state="reloadable" note="passwordOption embeds authOption, so the reload re-authenticates every live connection against the new simple-auth password; clients still presenting the old one are disconnected." />
Specifies a global password that clients can use to authenticate
the server (requires `user`, exclusive of `token`).


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `string` | - | - |
