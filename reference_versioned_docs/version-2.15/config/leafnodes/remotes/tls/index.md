# tls

<Reloadable state="reloadable" note="On 2.11/2.12 the reload reports success; the new TLS material is used only after a restart." />
TLS configuration for connecting/authenticating with
the remote if mutual TLS is required.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`allow_insecure_cipher_suites`](./allow_insecure_cipher_suites.md) | Permit cipher suites Go considers insecure to be named in `cipher_suites`. Without it those names are rejected. | `boolean` | `false` | Yes |
| [`cert_store`](./cert_store.md) | Load the certificate from an OS certificate store rather than a file. Windows only. | `string` | - | Yes |
| [`certs`](./certs/index.md) | Multiple certificate/key pairs to serve, so one listener can present different certificates to different clients. Use this instead of `cert_file` and `key_file`. | `object` | - | Yes |
| [`handshake_first`](./handshake_first.md) | Force the leafnode connection to use a TLS-first handshake prior to the remote sending the `INFO` protocol message.  Note, this option must be set to true on both the remote server accepting the leafnode connections as well as the leafnode itself. | `boolean` | `false` | Yes\* |
| [`min_version`](./min_version.md) | Lowest TLS version the server will negotiate. | `string` | - | Yes |
| [`ocsp_peer`](./ocsp_peer/index.md) | Verify the peer's certificate against its OCSP responder and reject revoked certificates. Set an object to tune the checks. | `(multiple)` | `false` | Yes |
| [`cert_file`](./cert_file.md) | TLS certificate file. | `string` | - | Yes\* |
| [`key_file`](./key_file.md) | TLS certificate key file. | `string` | - | Yes\* |
| [`ca_file`](./ca_file.md) | TLS certificate authority file. Defaults to system trust store. | `string` | - | Yes\* |
| [`cipher_suites`](./cipher_suites.md) | When set, only the specified TLS cipher suites will be allowed. Values must match the golang version used to build the server. | `string` | - | Yes\* |
| [`curve_preferences`](./curve_preferences.md) | List of TLS cipher curves to use in order. | `string` | - | Yes\* |
| [`insecure`](./insecure.md) | Skip certificate verification. This only applies to outgoing connections, NOT incoming client connections. **not recommended.** | `boolean` | - | Yes\* |
| [`timeout`](./timeout.md) | TLS handshake timeout. | `duration` | `500ms` | No |
| [`verify`](./verify.md) | If true, require and verify client certificates. Does not apply to monitoring. | `boolean` | `false` | Yes\* |
| [`verify_and_map`](./verify_and_map.md) | If true, require and verify client certificates and map certificate values for authentication. Does not apply to monitoring. | `boolean` | `false` | Ignored\* |
| [`connection_rate_limit`](./connection_rate_limit.md) |  | `integer` | - | Ignored\* |
| [`pinned_certs`](./pinned_certs.md) | List of hex-encoded SHA256 of DER-encoded public key fingerprints. When present, during the TLS handshake, the provided certificate's fingerprint is required to be present in the list, otherwise the connection will be closed. | `string` | - | Ignored\* |

\* See the property page for reload caveats.
