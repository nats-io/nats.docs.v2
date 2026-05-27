# tls

<Reloadable /> 
TLS configuration for client and HTTP monitoring.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`cert_file`](./cert_file.md) | TLS certificate file. | `string` | - | Yes |
| [`key_file`](./key_file.md) | TLS certificate key file. | `string` | - | Yes |
| [`ca_file`](./ca_file.md) | TLS certificate authority file. Defaults to system trust store. | `string` | - | Yes |
| [`cipher_suites`](./cipher_suites.md) | When set, only the specified TLS cipher suites will be allowed. Values must match the golang version used to build the server. | `string` | - | Yes |
| [`curve_preferences`](./curve_preferences.md) | List of TLS cipher curves to use in order. | `string` | - | Yes |
| [`insecure`](./insecure.md) | Skip certificate verification. This only applies to outgoing connections, NOT incoming client connections. **not recommended.** | `boolean` | - | Yes |
| [`timeout`](./timeout.md) | TLS handshake timeout. | `duration` | `500ms` | Yes |
| [`verify`](./verify.md) | If true, require and verify client certificates. Does not apply to monitoring. | `boolean` | `false` | Yes |
| [`verify_and_map`](./verify_and_map.md) | If true, require and verify client certificates and map certificate values for authentication. Does not apply to monitoring. | `boolean` | `false` | Yes |
| [`verify_cert_and_check_known_urls`](./verify_cert_and_check_known_urls.md) | Only used in a non-client context where `verify` is true, such as cluster and gateway configurations. The incoming connection's certificate x509v3 Subject Alternative Name DNS entries will be matched against all URLs. If a match is found, the connection is accepted and rejected otherwise.  For gateways, the server will match all names in the certificate against the gateway URLs.  For clusters, the server will match all names in the certificate against the route URLs.  A consequence of this, is that dynamic cluster growth may require config changes in other clusters where this option is true. DNS name checking is performed according to RFC6125. Only the full wildcard is supported for the the left most domain. | `boolean` | - | Yes |
| [`connection_rate_limit`](./connection_rate_limit.md) |  | `integer` | - | Yes |
| [`pinned_certs`](./pinned_certs.md) | List of hex-encoded SHA256 of DER-encoded public key fingerprints. When present, during the TLS handshake, the provided certificate's fingerprint is required to be present in the list, otherwise the connection will be closed. | `string` | - | Yes |
