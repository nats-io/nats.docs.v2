# limits

<Reloadable state="reloadable" note="Each key is enforced when the stream or consumer it applies to is created or updated, so an already-existing asset keeps the value that applied when it was made — see the individual keys below for exceptions." />
Default cross-account JetStream limits.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`batch`](./batch/index.md) | Ceilings on atomic batch publishing. | `object` | - | Yes\* |
| [`max_ack_pending`](./max_ack_pending.md) | Defines the maximum number of in-flight messages allowed to be configured on consumers. | `integer` | - | Yes\* |
| [`max_ha_assets`](./max_ha_assets.md) | The maximum number of JetStream assets that can exist at any given time having more than one replica. | `integer` | - | No |
| [`max_request_batch`](./max_request_batch.md) | The maximum request batch size allowed to be configured on pull consumers. | `integer` | - | Yes\* |
| [`duplicate_window`](./duplicate_window.md) | The maximum duplication window period allowed to be configured on a stream. | `duration` | - | Yes\* |
| [`default_max_consumers`](./default_max_consumers.md) | The default maximum number of consumers allowed on a stream that does not set its own `max_consumers`, and whose account has no consumer limit either. Set to `-1` to disable this default and allow an unlimited number of consumers, matching pre-2.15 behavior. | `integer` | `1000` | Yes\* |

\* See the property page for reload caveats.
