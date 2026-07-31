# cluster

<Reloadable state="reloadable" note="Most cluster settings reload, including routes, name, advertise and pool_size. Changing the cluster `host`, `port` or `listen` fails the reload." />
Configuration for clustering a set of servers.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`name`](./name.md) | Name of the cluster. | `string` | - | Yes |
| [`host`](./host.md) | Host for cluster route connections. | `string` | `0.0.0.0` | No |
| [`port`](./port.md) | Port for cluster route connections. | `integer` | `6222` | No |
| [`listen`](./listen.md) |  | `string` | - | No\* |
| [`tls`](./tls/index.md) | TLS configuration for securing cluster connections. `verify` is always enabled and `cert_file` is used for both client and server for mutual TLS. | `object` | - | Yes\* |
| [`advertise`](./advertise.md) | Advertised cluster `<host>:<port>`. Useful for cluster setups since behind NAT. When using TLS this is important to set to control the hostname that clients will use when discovering the route so TLS hostname verification does not fail. | `string` | - | Yes |
| [`no_advertise`](./no_advertise.md) | If true, the server will not send or gossip its client URLs to other servers in the cluster, nor will it tell its clients about other servers' client URLs. | `boolean` | - | Yes |
| [`routes`](./routes.md) | A list of server URLs to cluster with. Self-routes are ignored. Should authentication via token or username/password be required, specify them as part of the URL. | `string` | - | Yes\* |
| [`connect_retries`](./connect_retries.md) | After how many failed connect attempts to give up establishing a connection to a *discovered* route. Default is 0, do not retry. When enabled, attempts will be made once a second. This, does not apply to explicitly configured routes. | `integer` | `0` | Yes\* |
| [`authorization`](./authorization/index.md) | Authorization map for configuring cluster routes. When a single username/password is used, it defines the authentication mechanism this server expects, and how this server will authenticate itself when establishing a connection to a discovered route. This will not be used for routes explicitly listed in routes and therefore have to be provided as part of the URL. With this authentication mode, either use the same credentials throughout the system or list every route explicitly on every server.  If the `tls` configuration map specifies `verify_and_map` only, provide the expected username. Here different certificates can be used, but they have to map to the same `username`. The authorization map also allows for timeout which is honored but users and token configuration are not supported and will prevent the server from starting. The `permissions` block is ignored. | `object` | - | Yes\* |
| [`permissions`](./permissions/index.md) | Subject permissions applied to routes, limiting what this cluster will export to and import from its peers. | `object` | - | Yes |
| [`ping_interval`](./ping_interval.md) | How often the server pings an idle route. | `duration` | `2m` | Yes |
| [`ping_max`](./ping_max.md) | Unanswered pings before the route is closed. | `integer` | `2` | Yes |
| [`pool_size`](./pool_size.md) | The size of the connection pool used to distribute load across non-pinned accounts. | `integer` | `3` | Yes |
| [`accounts`](./accounts.md) | A list of accounts to *pin*, each of which will have their own dedicated route connection between servers. Note, this is not take up a connection from the pool. | `string` | - | Yes\* |
| [`compression`](./compression/index.md) | Defines the type compression mode to use between routes.  If set to `on`, it will use the `s2_fast` compression. | `(multiple)` | - | Yes |

\* See the property page for reload caveats.
