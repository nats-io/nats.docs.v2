# allowed_connection_types

<Reloadable state="reloadable" />
If specified, the user is constrained to the specified connection
types.

- `STANDARD` indicates a standard client TCP connection using the
  NATS protocol.
- `WEBSOCKET` indicates a WebSocket-based connection to NATS if the
  `websockets` configuration is enabled.
- `LEAFNODE` indicates a connection established by configured leafnode
  `remote` on a server.
- `MQTT` indicates a connection established by an MQTT client to NATS
  if the `mqtt` configuration is enabled.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `[ string ]` | - | `STANDARD`, `WEBSOCKET`, `LEAFNODE`, `MQTT` |
