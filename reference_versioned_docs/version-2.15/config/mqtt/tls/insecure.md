# insecure

<Reloadable state="reloadable" note="Meaningless for the inbound MQTT listener; reloads without error but changes nothing observable." />
Skip certificate verification. This only applies to outgoing connections, NOT incoming client connections. **not recommended.**


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `boolean` | - | `true`, `false` |
