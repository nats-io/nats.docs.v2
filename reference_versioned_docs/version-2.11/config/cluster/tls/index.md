# tls

<Reloadable state="reloadable" note="New TLS settings apply to route connections established after the reload; existing routes keep the old TLS session." />
TLS configuration for securing cluster connections.
`verify` is always enabled and `cert_file` is used for
both client and server for mutual TLS.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`cert_store`](./cert_store.md) | Load the certificate from an OS certificate store rather than a file. Windows only. | `string` | - | Yes |
| [`certs`](./certs/index.md) | Multiple certificate/key pairs to serve, so one listener can present different certificates to different clients. Use this instead of `cert_file` and `key_file`. | `object` | - | Yes |
| [`handshake_first`](./handshake_first.md) | Send the TLS handshake before the `INFO` protocol message rather than after. A duration string instead of `true` waits that long for a client that may not support it before falling back. | `(multiple)` | `false` | Yes |
| [`min_version`](./min_version.md) | Lowest TLS version the server will negotiate. | `string` | - | Yes |
| [`ocsp_peer`](./ocsp_peer/index.md) | Verify the peer's certificate against its OCSP responder and reject revoked certificates. Set an object to tune the checks. | `(multiple)` | `false` | Yes |
| [`cert_file`](./cert_file.md) | TLS certificate file. | `string` | - | Yes\* |
| [`key_file`](./key_file.md) | TLS certificate key file. | `string` | - | Yes\* |
| [`ca_file`](./ca_file.md) | TLS certificate authority file. Defaults to system trust store. | `string` | - | Yes\* |
| [`cipher_suites`](./cipher_suites.md) | When set, only the specified TLS cipher suites will be allowed. Values must match the golang version used to build the server. | `string` | - | Yes\* |
| [`curve_preferences`](./curve_preferences.md) | List of TLS cipher curves to use in order. | `string` | - | Yes\* |
| [`insecure`](./insecure.md) | Skip certificate verification. This only applies to outgoing connections, NOT incoming client connections. **not recommended.** | `boolean` | - | Yes\* |
| [`timeout`](./timeout.md) | TLS handshake timeout. | `duration` | `500ms` | Yes\* |
| [`verify`](./verify.md) | If true, require and verify client certificates. Does not apply to monitoring. | `boolean` | `false` | Ignored\* |
| [`verify_and_map`](./verify_and_map.md) | If true, require and verify client certificates and map certificate values for authentication. Does not apply to monitoring. | `boolean` | `false` | Yes\* |
| [`verify_cert_and_check_known_urls`](./verify_cert_and_check_known_urls.md) | Only used in a non-client context where `verify` is true, such as cluster and gateway configurations. The incoming connection's certificate x509v3 Subject Alternative Name DNS entries will be matched against all URLs. If a match is found, the connection is accepted and rejected otherwise.  For gateways, the server will match all names in the certificate against the gateway URLs.  For clusters, the server will match all names in the certificate against the route URLs.  A consequence of this, is that dynamic cluster growth may require config changes in other clusters where this option is true. DNS name checking is performed according to RFC6125. Only the full wildcard is supported for the the left most domain. | `boolean` | - | Yes\* |
| [`connection_rate_limit`](./connection_rate_limit.md) |  | `integer` | - | Ignored\* |
| [`pinned_certs`](./pinned_certs.md) | List of hex-encoded SHA256 of DER-encoded public key fingerprints. When present, during the TLS handshake, the provided certificate's fingerprint is required to be present in the list, otherwise the connection will be closed. | `string` | - | Yes\* |

\* See the property page for reload caveats.
