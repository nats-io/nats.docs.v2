# pinned_certs

<Reloadable state="reloadable" note="The only gateway key that is explicitly whitelisted for reload; it also re-checks and disconnects existing gateway connections." />
List of hex-encoded SHA256 of DER-encoded public key fingerprints. When present, during the TLS handshake, the
provided certificate's fingerprint is required to be present in the list, otherwise the connection will be
closed.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `string` | - | - |
