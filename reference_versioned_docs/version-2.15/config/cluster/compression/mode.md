# mode

<Reloadable state="reloadable" />

## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `string` | The compression mode dictates if and how compression is applied for a connection.  The value of `accept` indicates it will inherit the mode of the server it is connecting to. If both have `accept`, no compression will be used.  The `s2_fast`, `s2_better`, and `s2_best` modes indicate the level of S2 compression used.  `s2_auto` will dynamically change the compression level based on RTT thresholds. | `disabled`, `off`, `enabled`, `on`, `accept`, `s2_fast`, `s2_better`, `s2_best`, `s2_auto` |
