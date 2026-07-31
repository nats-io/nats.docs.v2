# insecure

<Reloadable state="reloadable" note="Reloads, but has no effect in this block: it secures inbound client connections, and `insecure` only governs certificate verification on outbound ones." />
Skip certificate verification. This only applies to outgoing connections, NOT incoming client connections. **not recommended.**


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `boolean` | - | `true`, `false` |
