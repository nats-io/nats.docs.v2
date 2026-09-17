# max_ack_pending

<Aliases aliases="max_pending, max_inflight" />
<Reloadable state="reloadable" note="Existing sessions pick up the new value, but each subscription captures its own limit when it is created, so only subscriptions made after the reload are governed by it." />
This is the amount of QoS 1 messages the server can send to
a subscription without receiving any `PUBACK` for those messages.
The valid range is [0..65535].

The total of subscriptions' max_ack_pending on a given session cannot
exceed 65535. Attempting to create a subscription that would bring
the total above the limit would result in the server returning `0x80`
in the `SUBACK` for this subscription.

Due to how the NATS Server handles the MQTT `#` wildcard, each
subscription ending with `#` will use 2 times the `max_ack_pending`
value. Note that changes to this option is applied only to new
subscriptions.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `integer` | - | - |
