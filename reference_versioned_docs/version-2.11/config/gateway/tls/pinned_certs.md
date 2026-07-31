# pinned_certs

<Reloadable state="not-reloadable" note="Changing the pinned certificates fails the whole reload, so the server has to be restarted. Reloading them is supported from 2.14." />
List of hex-encoded SHA256 of DER-encoded public key fingerprints. When present, during the TLS handshake, the
provided certificate's fingerprint is required to be present in the list, otherwise the connection will be
closed.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `string` | - | - |
