# gateway

<Reloadable state="reloadable" note="Only TLS certificate material reloads, for this gateway and its remotes, and only for connections established afterwards. Every other gateway setting fails the reload — `host`, `port`, `name`, `authorization`, the remote list, and the TLS `timeout`, `verify_and_map`, `verify_cert_and_check_known_urls` and `pinned_certs`." />
Configuration for setting up gateway connections
between clusters.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`name`](./name.md) | Name of this cluster. All gateway connections belonging to the same cluster must specify the same name. | `string` | - | No |
| [`reject_unknown_cluster`](./reject_unknown_cluster.md) | If true, gateway will reject connections from cluster that are not configured in gateways. It does so by checking if the cluster name, provided by the incomming connection, exists as named gateway. This effectively disables gossiping of new cluster. It does not restrict a configured gateway, thus cluster, from dynamically growing. | `boolean` | `false` | No |
| [`host`](./host.md) | Interface where the gateway will listen for incoming gateway connections. | `string` | `0.0.0.0` | No |
| [`port`](./port.md) | Port where the gateway will listen for incoming gateway connections. | `integer` | `7222` | No |
| [`listen`](./listen.md) | `<host>:<port>` format. Alternative to `host`/`port`. | `string` | - | No |
| [`tls`](./tls/index.md) | A `tls` configuration map for securing gateway connections. `verify` is always enabled. Unless otherwise, `cert_file` will be the default client certificate. | `object` | - | Yes\* |
| [`advertise`](./advertise.md) | `<host>:<port>` to advertise how this server can be contacted by other gateway members. This is useful in setups with NAT. | `string` | - | No |
| [`connect_retries`](./connect_retries.md) | After how many failed connect attempts to give up establishing a connection to a discovered gateway. Default is 0, do not retry. When enabled, attempts will be made once a second. This, does not apply to explicitly configured gateways. | `integer` | `0` | No |
| [`authorization`](./authorization/index.md) | Authorization map for gateways. When a single username/password is used, it defines the authentication mechanism this server expects, and how this server will authenticate itself when establishing a connection to a discovered gateway. This will not be used for gateways explicitly listed in gateways and therefore have to be provided as part of the URL. With this authentication mode, either use the same credentials throughout the system or list every gateway explicitly on every server. If the tls configuration map specifies verify_and_map only provide the expected username. Here different certificates can be used, but they do have to map to the same username. The authorization map also allows for timeout which is honored but users and token configuration are not supported and will prevent the server from starting. The permissions block is ignored. | `object` | - | No\* |
| [`connect_backoff`](./connect_backoff.md) | Back off between gateway reconnect attempts instead of retrying at a fixed interval. | `boolean` | `false` | No |
| [`write_deadline`](./write_deadline.md) | How long a gateway write may block before the connection is treated as stalled. | `duration` | `10s` | No |
| [`write_timeout`](./write_timeout.md) | What to do when a gateway connection misses its `write_deadline`. | `string` | `default` | No |
| [`gateways`](./gateways/index.md) | List of gateway entries. | `object` | - | No\* |

\* See the property page for reload caveats.
