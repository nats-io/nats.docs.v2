# mqtt

<Reloadable /> 
Configuration for enabling the MQTT interface.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`host`](/reference/2.11/config/mqtt/host) |  | `string` | `0.0.0.0` | Yes |
| [`port`](/reference/2.11/config/mqtt/port) |  | `integer` | `1883` | Yes |
| [`listen`](/reference/2.11/config/mqtt/listen) |  | `string` | - | Yes |
| [`tls`](/reference/2.11/config/mqtt/tls) |  | `object` | - | Yes |
| [`authorization`](/reference/2.11/config/mqtt/authorization) |  | `object` | - | Yes |
| [`no_auth_user`](/reference/2.11/config/mqtt/no_auth_user) | If no user name is provided when an MQTT client connects, will default this user name in the authentication phase. If specified, this will override, for MQTT clients, any `no_auth_user` value defined in the main configuration file. *Note: that this is not compatible with running the server in operator mode.* | `string` | - | Yes |
| [`ack_wait`](/reference/2.11/config/mqtt/ack_wait) | This is the amount of time after which a QoS 1 message sent to a client is redelivered as a `DUPLICATE` if the server has not received the `PUBACK` packet on the original Packet Identifier. will cause the server to use the default value (30 seconds).  Note that changes to this option is applied only to new MQTT subscriptions. | `duration` | `30s` | Yes |
| [`max_ack_pending`](/reference/2.11/config/mqtt/max_ack_pending) | This is the amount of QoS 1 messages the server can send to a subscription without receiving any `PUBACK` for those messages. The valid range is [0..65535].  The total of subscriptions' max_ack_pending on a given session cannot exceed 65535. Attempting to create a subscription that would bring the total above the limit would result in the server returning `0x80` in the `SUBACK` for this subscription.  Due to how the NATS Server handles the MQTT `#` wildcard, each subscription ending with `#` will use 2 times the `max_ack_pending` value. Note that changes to this option is applied only to new subscriptions. | `integer` | `100` | Yes |
| [`js_domain`](/reference/2.11/config/mqtt/js_domain) | If specified, sets an explicit JetStream domain to be used by MQTT. | `string` | - | Yes |
| [`stream_replicas`](/reference/2.11/config/mqtt/stream_replicas) | If specified, sets an explicit number of stream replicas to be used for MQTT-backed streams. | `integer` | - | Yes |
| [`consumer_inactive_threshold`](/reference/2.11/config/mqtt/consumer_inactive_threshold) | Set an explicit default inactive threshold for consumers used by MQTT. | `duration` | - | Yes |
