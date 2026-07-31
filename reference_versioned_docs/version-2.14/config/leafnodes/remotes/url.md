# url

<Aliases aliases="urls" />
<Reloadable state="reloadable" />
URL or list of URLs of a remote server accepting leaf
node connections.
If username/password or token authentication is required
on the remote, this should be encoded in the URL itself,
e.g. `nats-leaf://username:password@localhost:7422`.
Note, the URL scheme should be `nats-leaf` or `ws`.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `string` |  | - |
| `[ string ]` |  | - |
