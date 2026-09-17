# allowed_origins

<Aliases aliases="allowed_origin, allow_origins, allow_origin, origins, origin" />
<Reloadable state="not-reloadable" />
The list of accepted origins. When empty, and `same_origin` is `false`,
clients from any origin are allowed to connect.

This list specifies the only accepted values for the client's request
`Origin` header. The scheme, host, and port must match. By convention,
the absence of TCP port in the URL will be port 80 for an
"http://" scheme, and 443 for "https://".


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `[ string ]` | - | - |
