# pinned_certs

<Reloadable state="reloadable" note="One of the few settings in this domain that also acts on EXISTING connections — routes whose cert no longer matches are disconnected." />
List of hex-encoded SHA256 of DER-encoded public key fingerprints. When present, during the TLS handshake, the
provided certificate's fingerprint is required to be present in the list, otherwise the connection will be
closed.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `string` | - | - |
