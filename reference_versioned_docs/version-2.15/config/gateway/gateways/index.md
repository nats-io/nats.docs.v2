# gateways

<Reloadable state="not-reloadable" note="Only per-remote TLS *material* may change; the set of remotes and their names/URLs is fixed until restart." />
List of gateway entries.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`name`](./name.md) | Name of the gateway being connected to. | `string` | - | No |
| [`url`](./url.md) | A single URL to connect to. | `string` | - | No |
| [`urls`](./urls.md) | A list of URLs to connect to (multiple servers in a cluster). | `string` | - | No |
| [`tls`](./tls/index.md) | A TLS configuration map for creating a secure gateway connection. If the top-level `gateway{}` tls block contains certificates that have both client and server purposes, it is possible to omit this one and the server will use the certificates from the `gateway{tls{}}` section. | `object` | - | Yes\* |

\* See the property page for reload caveats.
