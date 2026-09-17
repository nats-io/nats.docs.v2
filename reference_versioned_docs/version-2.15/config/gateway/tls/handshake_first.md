# handshake_first

<Aliases aliases="first, immediate" />
<Reloadable state="reloadable" />
Send the TLS handshake before the `INFO` protocol message rather
than after. A duration string instead of `true` waits that long for
a client that may not support it before falling back.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `boolean` |  | `true`, `false` |
| `string` |  | - |
