# remotes

<Reloadable state="not-reloadable" />
List of entries specifiying servers where the leaf
node client connection can be made.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`url`](./url.md) | URL or list of URLs of a remote server accepting leaf node connections. If username/password or token authentication is required on the remote, this should be encoded in the URL itself, e.g. `nats-leaf://username:password@localhost:7422`. Note, the URL scheme should be `nats-leaf` or `ws`. | `(multiple)` | - | No |
| [`nkey`](./nkey.md) | User nkey seed this remote authenticates with. | `string` | - | No |
| [`first_info_timeout`](./first_info_timeout.md) | How long to wait for the remote's `INFO` message before giving up on the connection. | `duration` | `1s` | No |
| [`no_randomize`](./no_randomize.md) | If true and more than one URL is specified, the first one in the list will be used. If the client disconnects from the server, then the next URL will be used in order. | `boolean` | - | No |
| [`account`](./account.md) | Account name or public NKey identifying the *local* account to bind to this remote server. Any traffic locally on this account will be forwarded to the remote server. | `string` | - | No |
| [`credentials`](./credentials.md) | Path to a credentials file. This is application when decentralized auth is used on the remote. | `string` | - | No |
| [`tls`](./tls/index.md) | TLS configuration for connecting/authenticating with the remote if mutual TLS is required. | `object` | - | Yes\* |
| [`hub`](./hub.md) |  | `boolean` | - | No |
| [`deny_imports`](./deny_imports.md) |  | `(multiple)` | - | Ignored\* |
| [`deny_exports`](./deny_exports.md) |  | `(multiple)` | - | Ignored\* |
| [`ws_compression`](./ws_compression.md) | If true, and connecting with the WebSocket protocol, the connection will indicate to the remote that it wishes compression to be used. | `boolean` | `false` | No |
| [`ws_no_masking`](./ws_no_masking.md) | If true and connecting with the WebSocket protocol, the connection will indicate to the remote that it wishes *not* to mask outbound WebSocket frames. | `boolean` | `false` | No |
| [`jetstream_cluster_migrate`](./jetstream_cluster_migrate.md) |  | `boolean` | `true` | No |
| [`compression`](./compression/index.md) | Defines the compression mode to use for a outgoing leafnode connection.  If set to `on`, it will use the `s2_auto`. | `(multiple)` | - | Yes\* |

\* See the property page for reload caveats.
