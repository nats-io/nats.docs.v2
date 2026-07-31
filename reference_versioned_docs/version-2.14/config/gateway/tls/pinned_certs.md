# pinned_certs

<Reloadable state="reloadable" note="Reloads, and also re-checks gateway connections that are already established, disconnecting any whose certificate is no longer pinned." />
List of hex-encoded SHA256 of DER-encoded public key fingerprints. When present, during the TLS handshake, the
provided certificate's fingerprint is required to be present in the list, otherwise the connection will be
closed.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `string` | - | - |
