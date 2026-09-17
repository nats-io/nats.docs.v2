# batch

<Since version="2.12" />
<Reloadable state="reloadable" note="Enforced when a batch publish starts, so a batch already in progress is unaffected. Only a batch started after the reload sees the new ceiling." />
Ceilings on atomic batch publishing.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`max_msgs`](./max_msgs.md) | Messages allowed in a single batch. | `integer` | `1000` | Yes\* |
| [`max_inflight_total`](./max_inflight_total.md) | Batches allowed in flight across the server. | `integer` | `1000` | Yes\* |
| [`max_inflight_per_stream`](./max_inflight_per_stream.md) | Batches allowed in flight for one stream. | `integer` | `50` | Yes\* |
| [`timeout`](./timeout.md) | How long an incomplete batch is held before it is discarded. | `duration` | `10s` | Yes\* |

\* See the property page for reload caveats.
