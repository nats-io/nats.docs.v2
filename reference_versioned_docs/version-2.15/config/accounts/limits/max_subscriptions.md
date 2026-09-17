# max_subscriptions

<Aliases aliases="max_subs" />
<Reloadable state="reloadable" note="Re-applied to already-connected clients, and a client already holding more subscriptions than the new limit is disconnected with MaxSubscriptionsExceeded. Effective value is min(account limit, server max_subscriptions)." />
The maximum number of concurrent subscriptions for this account.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `integer` | - | - |
