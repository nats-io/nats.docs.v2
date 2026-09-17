# handshake_first

<Aliases aliases="first, immediate" />
<Reloadable state="reloadable" note="Accept side only; applies to newly accepted connections." />
Force the leafnode connection to use a TLS-first handshake prior
to the remote sending the `INFO` protocol message.

Note, this option must be set to true on both the remote server
accepting the leafnode connections as well as the leafnode itself.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `boolean` | - | `true`, `false` |
