# compression

<Reloadable state="reloadable" />
Defines the type compression mode to use between routes.

If set to `on`, it will use the `s2_fast` compression.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `string` | The compression mode dictates if and how compression is applied for a connection.  The value of `accept` indicates it will inherit the mode of the server it is connecting to. If both have `accept`, no compression will be used.  The `s2_fast`, `s2_better`, and `s2_best` modes indicate the level of S2 compression used.  `s2_auto` will dynamically change the compression level based on RTT thresholds. | `disabled`, `off`, `enabled`, `on`, `accept`, `s2_fast`, `s2_better`, `s2_best`, `s2_auto` |
| `object` | An object with a set of explicit properties that can be set. | - |
## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`mode`](./mode.md) |  | `string` | `accept` | Yes |
| [`rtt_thresholds`](./rtt_thresholds.md) | Applies only when the `s2_auto` mode is used and defines the round-trip time (RTT) thresholds for compression level changes.  By default, no compression is used unless the RTT hits the first threshold (e.g. 10ms), then `s2_fast`. The next threshold would switch to `s2_better`, and then finally `s2_best` is the last threshold is reached.  Note, the compression level is dynamic so if the RTT decreases, the compression level will decrease accordingly. | `duration` | `[10ms 50ms 100ms]` | Yes |
