# limits

<Reloadable state="not-reloadable" />
Default cross-account JetStream limits.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`batch`](./batch/index.md) | Ceilings on atomic batch publishing. | `object` | - | No |
| [`max_ack_pending`](./max_ack_pending.md) | Defines the maximum number of in-flight messages allowed to be configured on consumers. | `integer` | - | No |
| [`max_ha_assets`](./max_ha_assets.md) | The maximum number of JetStream assets that can exist at any given time having more than one replica. | `integer` | - | No |
| [`max_request_batch`](./max_request_batch.md) | The maximum request batch size allowed to be configured on pull consumers. | `integer` | - | No |
| [`duplicate_window`](./duplicate_window.md) | The maximum duplication window period allowed to be configured on a stream. | `duration` | - | No |
