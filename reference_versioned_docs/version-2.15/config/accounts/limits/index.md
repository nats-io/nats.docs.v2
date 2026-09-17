# limits

<Reloadable state="reloadable" note="max_connections, max_subscriptions and max_payload are re-applied to already-connected clients. max_leafnodes is the exception - see that page." />

## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`max_connections`](./max_connections.md) | The maximum number of concurrent connections for this account. | `integer` | - | Yes\* |
| [`max_subscriptions`](./max_subscriptions.md) | The maximum number of concurrent subscriptions for this account. | `integer` | - | Yes\* |
| [`max_payload`](./max_payload.md) | The maximum payload size allowed for messages. | `integer` | - | Yes\* |
| [`max_leafnodes`](./max_leafnodes.md) | The maximum number of concurrent leafnode connections allowed. | `integer` | - | Yes\* |

\* See the property page for reload caveats.
