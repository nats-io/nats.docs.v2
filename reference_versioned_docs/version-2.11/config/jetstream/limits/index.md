# limits

<Reloadable /> 
Default cross-account JetStream limits.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`max_ack_pending`](/reference/2.11/config/jetstream/limits/max_ack_pending) | Defines the maximum number of in-flight messages allowed to be configured on consumers. | `integer` | - | Yes |
| [`max_ha_assets`](/reference/2.11/config/jetstream/limits/max_ha_assets) | The maximum number of JetStream assets that can exist at any given time having more than one replica. | `integer` | - | Yes |
| [`max_request_batch`](/reference/2.11/config/jetstream/limits/max_request_batch) | The maximum request batch size allowed to be configured on pull consumers. | `integer` | - | Yes |
| [`duplicate_window`](/reference/2.11/config/jetstream/limits/duplicate_window) | The maximum duplication window period allowed to be configured on a stream. | `duration` | - | Yes |
