# rtt_thresholds

<Reloadable state="reloadable" />
Applies only when the `s2_auto` mode is used and defines the round-trip time (RTT)
thresholds for compression level changes.

By default, no compression is used unless the RTT hits the first threshold
(e.g. 10ms), then `s2_fast`. The next threshold would switch to `s2_better`,
and then finally `s2_best` is the last threshold is reached.

Note, the compression level is dynamic so if the RTT decreases, the compression
level will decrease accordingly.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `[ duration ]` | Duration as a string with units such as 100ms, 10s, 5m, or 2h. | - |
