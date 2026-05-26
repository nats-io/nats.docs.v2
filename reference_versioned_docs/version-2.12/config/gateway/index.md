# gateway

Configuration for setting up gateway connections
between clusters.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`name`](/reference/2.12/config/gateway/name) | Name of this cluster. All gateway connections belonging to the same cluster must specify the same name. | `string` | - | Yes |
| [`reject_unknown_cluster`](/reference/2.12/config/gateway/reject_unknown_cluster) | If true, gateway will reject connections from cluster that are not configured in gateways. It does so by checking if the cluster name, provided by the incomming connection, exists as named gateway. This effectively disables gossiping of new cluster. It does not restrict a configured gateway, thus cluster, from dynamically growing. | `boolean` | `false` | Yes |
| [`host`](/reference/2.12/config/gateway/host) | Interface where the gateway will listen for incoming gateway connections. | `string` | `0.0.0.0` | Yes |
| [`port`](/reference/2.12/config/gateway/port) | Port where the gateway will listen for incoming gateway connections. | `integer` | `7222` | Yes |
| [`listen`](/reference/2.12/config/gateway/listen) | `<host>:<port>` format. Alternative to `host`/`port`. | `string` | - | Yes |
| [`tls`](/reference/2.12/config/gateway/tls) | A `tls` configuration map for securing gateway connections. `verify` is always enabled. Unless otherwise, `cert_file` will be the default client certificate. | `object` | - | Yes |
| [`advertise`](/reference/2.12/config/gateway/advertise) | `<host>:<port>` to advertise how this server can be contacted by other gateway members. This is useful in setups with NAT. | `string` | - | Yes |
| [`connect_retries`](/reference/2.12/config/gateway/connect_retries) | After how many failed connect attempts to give up establishing a connection to a discovered gateway. Default is 0, do not retry. When enabled, attempts will be made once a second. This, does not apply to explicitly configured gateways. | `integer` | `0` | Yes |
| [`authorization`](/reference/2.12/config/gateway/authorization) | Authorization map for gateways. When a single username/password is used, it defines the authentication mechanism this server expects, and how this server will authenticate itself when establishing a connection to a discovered gateway. This will not be used for gateways explicitly listed in gateways and therefore have to be provided as part of the URL. With this authentication mode, either use the same credentials throughout the system or list every gateway explicitly on every server. If the tls configuration map specifies verify_and_map only provide the expected username. Here different certificates can be used, but they do have to map to the same username. The authorization map also allows for timeout which is honored but users and token configuration are not supported and will prevent the server from starting. The permissions block is ignored. | `object` | - | Yes |
| [`gateways`](/reference/2.12/config/gateway/gateways) | List of gateway entries. | `object` | - | Yes |
