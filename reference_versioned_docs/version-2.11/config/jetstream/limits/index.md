# limits

<Reloadable /> 
Default cross-account JetStream limits.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`max_ack_pending`](./max_ack_pending.md) | Defines the maximum number of in-flight messages allowed to be configured on consumers. | `integer` | - | Yes |
| [`max_ha_assets`](./max_ha_assets.md) | The maximum number of JetStream assets that can exist at any given time having more than one replica. | `integer` | - | Yes |
| [`max_request_batch`](./max_request_batch.md) | The maximum request batch size allowed to be configured on pull consumers. | `integer` | - | Yes |
| [`duplicate_window`](./duplicate_window.md) | The maximum duplication window period allowed to be configured on a stream. | `duration` | - | Yes |
