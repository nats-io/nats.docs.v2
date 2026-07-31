# msg_trace

<Reloadable state="reloadable" />
Where this account's message traces are delivered, and how often
they are sampled.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`dest`](./dest.md) | Subject the trace events are published to. | `string` | - | Yes |
| [`sampling`](./sampling.md) | Percentage of traced messages to report, 1 to 100. | `integer` | `100` | Yes |
