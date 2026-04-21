# tls

<Reloadable /> 
A TLS configuration map for creating a secure gateway connection.
If the top-level `gateway{}` tls block contains certificates that have
both client and server purposes, it is possible to omit this one
and the server will use the certificates from the `gateway{tls{}}`
section.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`cert_file`](/reference/config/gateway/gateways/tls/cert_file) | TLS certificate file. | `string` | - | Yes |
| [`key_file`](/reference/config/gateway/gateways/tls/key_file) | TLS certificate key file. | `string` | - | Yes |
| [`ca_file`](/reference/config/gateway/gateways/tls/ca_file) | TLS certificate authority file. Defaults to system trust store. | `string` | - | Yes |
| [`cipher_suites`](/reference/config/gateway/gateways/tls/cipher_suites) | When set, only the specified TLS cipher suites will be allowed. Values must match the golang version used to build the server. | `string` | - | Yes |
| [`curve_preferences`](/reference/config/gateway/gateways/tls/curve_preferences) | List of TLS cipher curves to use in order. | `string` | - | Yes |
| [`insecure`](/reference/config/gateway/gateways/tls/insecure) | Skip certificate verification. This only applies to outgoing connections, NOT incoming client connections. **not recommended.** | `boolean` | - | Yes |
| [`timeout`](/reference/config/gateway/gateways/tls/timeout) | TLS handshake timeout. | `duration` | `500ms` | Yes |
| [`verify`](/reference/config/gateway/gateways/tls/verify) | If true, require and verify client certificates. Does not apply to monitoring. | `boolean` | `false` | Yes |
| [`verify_and_map`](/reference/config/gateway/gateways/tls/verify_and_map) | If true, require and verify client certificates and map certificate values for authentication. Does not apply to monitoring. | `boolean` | `false` | Yes |
| [`verify_cert_and_check_known_urls`](/reference/config/gateway/gateways/tls/verify_cert_and_check_known_urls) | Only used in a non-client context where `verify` is true, such as cluster and gateway configurations. The incoming connection's certificate x509v3 Subject Alternative Name DNS entries will be matched against all URLs. If a match is found, the connection is accepted and rejected otherwise.  For gateways, the server will match all names in the certificate against the gateway URLs.  For clusters, the server will match all names in the certificate against the route URLs.  A consequence of this, is that dynamic cluster growth may require config changes in other clusters where this option is true. DNS name checking is performed according to RFC6125. Only the full wildcard is supported for the the left most domain. | `boolean` | - | Yes |
| [`connection_rate_limit`](/reference/config/gateway/gateways/tls/connection_rate_limit) |  | `integer` | - | Yes |
| [`pinned_certs`](/reference/config/gateway/gateways/tls/pinned_certs) | List of hex-encoded SHA256 of DER-encoded public key fingerprints. When present, during the TLS handshake, the provided certificate's fingerprint is required to be present in the list, otherwise the connection will be closed. | `string` | - | Yes |
