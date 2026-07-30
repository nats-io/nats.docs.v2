---
id: qos-sessions-and-retained
title: "QoS, sessions, and retained messages"
sidebar_position: 4
description: What the server guarantees about delivery, what it remembers between connections, and why NATS publishes always arrive as QoS 0
---

# QoS, sessions, and retained messages

Devices drop off networks. A truck drives through a tunnel, a warehouse
sensor loses Wi-Fi, a gateway reboots. MQTT's answer to all three is
state the broker holds on the client's behalf, and this page covers the
three kinds NATS keeps for you: delivery state (QoS), subscription state
(sessions), and last-value state (retained messages).

All three live in the JetStream streams the server created when you
enabled MQTT. You don't manage them, but knowing they're streams
explains why JetStream is required and where the storage goes.

## The three QoS levels

Quality of Service is the promise the broker makes about delivering one
message.

| QoS | Promise | Cost |
|---|---|---|
| 0 | At most once. Sent and forgotten. | Nothing stored, no acknowledgment |
| 1 | At least once. Redelivered until acknowledged. | Stored until the PUBACK arrives; duplicates possible |
| 2 | Exactly once. A four-packet handshake removes duplicates. | Most round trips and most state |

The server implements all three for MQTT connections. A device can
publish at any level and subscribe at any level, and the effective level
for a delivery is the lower of the two: a QoS 0 publish to a QoS 1
subscriber is still delivered at QoS 0.

QoS is an MQTT-side contract, though. NATS has no equivalent — a NATS
client doesn't request a delivery guarantee when it publishes, and there
is no field on a NATS message to carry one. So these guarantees hold end
to end only when both ends are MQTT. The next section covers what
happens when they aren't.

## NATS publishes arrive as QoS 0

The bridge has one asymmetry worth knowing before you design around it.
A message published by a NATS client and delivered to an MQTT subscriber
is always QoS 0, whatever QoS that subscription asked for.

Nothing in a NATS publish carries a QoS. There's no field to read and no
acknowledgment contract to inherit, so the server delivers at the only
level it can promise. An MQTT device subscribed at QoS 1 to a subject
that NATS clients publish to gets at-most-once delivery in practice.

When a device genuinely needs the delivery guarantee, the message has to
originate from an MQTT publisher at QoS 1 or 2. If the traffic starts on
the NATS side and delivery matters, keep the durability on the NATS
side, in a stream, rather than expecting MQTT redelivery to cover it.

## Redelivery for QoS 1 and 2

When the server delivers a QoS 1 or 2 message to a matching
subscription, it keeps the message until the client acknowledges the
packet identifier with a PUBACK. If no PUBACK arrives within `ack_wait`,
the server sends the message again, flagged as a duplicate.

`ack_wait` defaults to 30 seconds. Set it in the `mqtt {}` block:

```conf
mqtt {
  listen: 127.0.0.1:1883

  # Redeliver an unacknowledged QoS 1 or 2 message after this long.
  ack_wait: "1m"
}
```

Two practical notes. A change to `ack_wait` applies only to
subscriptions created after the change, so existing subscriptions keep
the old value until they're recreated. And a redelivered message is a
genuine duplicate: the device sees the same payload twice, which is why
QoS 1 is "at least once" rather than "exactly once". Handlers that
matter should be idempotent.

## How many messages can be in flight

`max_ack_pending` caps how many QoS 1 and 2 messages (combined) the
server will send to a subscription before it has to wait for
acknowledgments. It defaults to 100, and the valid range is 0 to 65535.

Two limits follow from that, and both surface as a subscription failure
rather than an error you can catch later:

- The total across all of a session's subscriptions can't exceed
  **65535**. A subscription that would push the total over the limit is
  refused, and the server returns `0x80` in the SUBACK for it.
- A subscription ending in `#` counts **twice**, because of the two
  subscriptions the server creates for it (see
  [Topics and subjects](./topics-and-subjects#why--sometimes-creates-two-subscriptions)).

With the default of 100, a session has room for roughly 655 plain
subscriptions, or about half that if they all end in `#`. Devices with
many subscriptions and a raised `max_ack_pending` hit the ceiling much
sooner. Like `ack_wait`, a change applies only to new subscriptions.

## Sessions

A session is the subscription state and in-flight delivery state the
server holds for one client. It's identified by the **client ID** the
device sends in its CONNECT packet, not by its connection, which is what
lets it survive a reconnect.

The server stores sessions in JetStream, so they outlive both the
connection and a server restart. A reconnecting device that used the
same client ID finds its subscriptions still in place and any unacked
QoS 1 and 2 messages still pending.

The `clean session` flag inverts that. Set it, and the server clears any
stored state for that client ID and the session lasts only as long as
the connection. A device with no durable subscriptions should set it;
one that wants messages buffered while it's offline shouldn't.

A client ID has to be a valid name — the same character restrictions
that apply to NATS subject tokens. An invalid one is refused at connect
with an identifier-rejected code. An empty client ID is allowed only
together with the clean session flag, in which case the server generates
one.

### Two devices, one client ID

Client IDs must be unique. The specification requires that when a second
connection presents a client ID already in use, the server closes the
first one and accepts the newcomer.

That rule is harsh when it happens by accident. Deploy the same client
ID to two devices and each connection evicts the other; if both have
reconnect logic, they take turns kicking each other off as fast as they
can reconnect. To keep that from becoming a hot loop, the server delays
closing the old connection, which slows the flapping rather than
stopping it.

The check works across a cluster too, and there it's less immediate:
eviction has to travel between servers rather than happening in one
process. There are also cases where the server refuses the new
connection instead of closing the old one — for instance when the
existing connection is in the middle of processing packets and can't be
closed safely. Treat client IDs as unique per device and the whole
problem disappears.

## Retained messages

A retained message is the last-value cache for a topic. Publish with the
RETAIN flag and the server stores that message; every subscriber whose
filter matches the topic afterward receives it immediately on
subscribing, without waiting for the next publish.

This is what makes a device's current state readable on demand. A
dashboard subscribing to `sensors/warehouse/cold-1/temp` gets the last
reading right away instead of waiting for the sensor's next report.

```bash
mosquitto_pub -h 127.0.0.1 -p 1883 \
  -t "sensors/warehouse/cold-1/temp" \
  -m "4.2" --retain
```

Subscribe afterward and the reading arrives at once:

```bash
mosquitto_sub -h 127.0.0.1 -p 1883 \
  -t "sensors/warehouse/cold-1/temp" -v
```

```
sensors/warehouse/cold-1/temp 4.2
```

<div class="nats-flow" data-scenario="mqttRetainedAnimated" data-width="680" data-height="340"></div>

Only one message is retained per topic; a new retained publish replaces
the previous one. Retention is per topic name, not per filter, so a
subscriber using a wildcard receives the retained message for every
matching topic.

Retained messages are stored regardless of QoS. A retained QoS 0
message is still persisted, which is part of why the account needs
JetStream even for a fleet that never uses QoS 1.

### Clearing a retained message

To delete one, publish an empty payload to the same topic with RETAIN
set:

```bash
mosquitto_pub -h 127.0.0.1 -p 1883 \
  -t "sensors/warehouse/cold-1/temp" \
  -m "" --retain
```

The zero-byte message is delivered to current subscribers as a normal
message, then the stored retained message is removed. Future subscribers
get nothing for that topic until something retains a new value.

## Pitfalls

**Expecting QoS 1 to cover NATS-originated messages.** A device
subscribed at QoS 1 still receives NATS publishes at QoS 0, with no
redelivery. If that traffic has to survive a device being offline, put
it in a JetStream stream and have something replay it, rather than
relying on the MQTT subscription.

**Sharing a client ID across devices.** Two devices with the same client
ID evict each other on every reconnect. It looks like a flaky network:
both devices connect, both drop, neither stays. Give every device its
own client ID, and prefer one derived from hardware rather than baked
into an image.

**Raising `max_ack_pending` without counting subscriptions.** The
per-session total is capped at 65535, and every `#` subscription costs
double. Raise the per-subscription value on a device with many
subscriptions and new subscriptions start failing with `0x80` in the
SUBACK, which is easy to misread as a permissions problem.

**Assuming a retained message is a message queue.** Only the last
retained value per topic is kept. A device that publishes ten readings
with RETAIN while a subscriber is offline leaves one value behind, not
ten. Use JetStream when you need the history.

## Where you are

Your setup is unchanged, and you now know what the server is holding:

- QoS 0, 1, and 2 supported, with delivery at the lower of publish and
  subscription QoS
- NATS-originated messages always delivered at QoS 0
- unacknowledged QoS 1 and 2 messages redelivered after `ack_wait`
  (30 seconds by default), capped in flight by `max_ack_pending`
- sessions keyed by client ID, stored in JetStream, cleared by the
  clean session flag
- one retained message per topic, replaced by the next retained publish
  and deleted by an empty one

## What's next

Everything so far ran on one server with no authentication. Devices in
the field need credentials, and the fleet needs more than one server.
[Auth and clustering](./auth-and-clustering) restricts a user to MQTT
connections, grants the extra permission a QoS 1 subscription needs, and
covers what changes when MQTT runs on the `east` cluster.

## See also

- [Reference → mqtt](/reference/config/mqtt/) — `ack_wait`,
  `max_ack_pending`, and the rest of the block
- [JetStream → Delivery and acknowledgment](/learn/jetstream/delivery-and-acknowledgment)
  — the same redelivery idea on the NATS side, where MQTT's state is stored
- [Topics and subjects](./topics-and-subjects) — the `#` rule that makes
  a subscription cost double
