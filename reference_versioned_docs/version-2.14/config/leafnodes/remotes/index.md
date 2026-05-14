# remotes

List of entries specifiying servers where the leaf
node client connection can be made.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`url`](/reference/config/leafnodes/remotes/url) | URL or list of URLs of a remote server accepting leaf node connections. If username/password or token authentication is required on the remote, this should be encoded in the URL itself, e.g. `nats-leaf://username:password@localhost:7422`. Note, the URL scheme should be `nats-leaf` or `ws`. | `(multiple)` | - | Yes |
| [`no_randomize`](/reference/config/leafnodes/remotes/no_randomize) | If true and more than one URL is specified, the first one in the list will be used. If the client disconnects from the server, then the next URL will be used in order. | `boolean` | - | Yes |
| [`account`](/reference/config/leafnodes/remotes/account) | Account name or public NKey identifying the *local* account to bind to this remote server. Any traffic locally on this account will be forwarded to the remote server. | `string` | - | Yes |
| [`credentials`](/reference/config/leafnodes/remotes/credentials) | Path to a credentials file. This is application when decentralized auth is used on the remote. | `string` | - | Yes |
| [`tls`](/reference/config/leafnodes/remotes/tls) | TLS configuration for connecting/authenticating with the remote if mutual TLS is required. | `object` | - | Yes |
| [`hub`](/reference/config/leafnodes/remotes/hub) |  | `boolean` | - | Yes |
| [`deny_imports`](/reference/config/leafnodes/remotes/deny_imports) |  | `(multiple)` | - | Yes |
| [`deny_exports`](/reference/config/leafnodes/remotes/deny_exports) |  | `(multiple)` | - | Yes |
| [`ws_compression`](/reference/config/leafnodes/remotes/ws_compression) | If true, and connecting with the WebSocket protocol, the connection will indicate to the remote that it wishes compression to be used. | `boolean` | `false` | Yes |
| [`ws_no_masking`](/reference/config/leafnodes/remotes/ws_no_masking) | If true and connecting with the WebSocket protocol, the connection will indicate to the remote that it wishes *not* to mask outbound WebSocket frames. | `boolean` | `false` | Yes |
| [`jetstream_cluster_migrate`](/reference/config/leafnodes/remotes/jetstream_cluster_migrate) |  | `boolean` | `true` | Yes |
| [`compression`](/reference/config/leafnodes/remotes/compression) | Defines the compression mode to use for a outgoing leafnode connection.  If set to `on`, it will use the `s2_auto`. | `(multiple)` | - | Yes |
