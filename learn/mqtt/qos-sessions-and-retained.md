---
id: qos-sessions-and-retained
title: "QoS, sessions, and retained messages"
sidebar_position: 4
description: What the server guarantees about delivery, what it stores between connections, and why NATS publishes always arrive as QoS 0
---

# QoS, sessions, and retained messages

You can predict the subject any topic lands on. What the server
promises about delivering the message there is a separate contract, and
it's the one devices depend on when they drop off the network and
reconnect. MQTT handles disconnects with state the broker holds for the
client, and this page covers the three kinds NATS keeps: delivery state
(QoS), subscription state (sessions), and retained messages. It also
covers will messages, which announce an abnormal disconnect to whoever
is listening.

The stored state lives in the JetStream streams the server created when
you enabled MQTT. You don't manage them, but knowing they're streams
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
client doesn't request a delivery guarantee when it publishes, and
there's no field on a NATS message to carry one. So these guarantees hold end
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
packet identifier. If that acknowledgment doesn't arrive within
`ack_wait`, the server sends the message again, flagged as a duplicate.

The two levels acknowledge differently. QoS 1 is a single PUBACK. QoS 2
is a four-packet handshake — the client answers with PUBREC, the server
replies PUBREL, and the client closes it with PUBCOMP — which is what
lets the server drop duplicates instead of delivering them.

`ack_wait` defaults to 30 seconds. Set it in the `mqtt {}` block:

```conf
mqtt {
  listen: 127.0.0.1:1883

  # Redeliver an unacknowledged QoS 1 or 2 message after this long.
  ack_wait: "1m"
}
```

Two things are worth knowing about this in practice. A change to
`ack_wait` applies only to subscriptions created after the change, so
existing subscriptions keep the old value until they're recreated. And a
redelivered message is a genuine duplicate: the device sees the same
payload twice, which is why QoS 1 is "at least once" rather than
"exactly once". Handlers that matter should be idempotent.

### See QoS 1 run

Subscribe at QoS 1 as the truck's telemetry unit:

```bash
mosquitto_sub -h 127.0.0.1 -p 1883 \
  -t "fleet/truck-17/telemetry" -q 1 -v
```

Publish at QoS 1 from another MQTT client:

```bash
mosquitto_pub -h 127.0.0.1 -p 1883 \
  -t "fleet/truck-17/telemetry" \
  -m "eta 14:20" -q 1
```

The subscriber prints the message once:

```
fleet/truck-17/telemetry eta 14:20
```

The visible output is the same as QoS 0; the difference is the
bookkeeping around it. The publisher waited for a PUBACK before
exiting, the server stored the message until the subscriber's PUBACK
arrived, and if that acknowledgment hadn't come within `ack_wait`, the
server would have sent the message again with the DUP flag set. Both
ends were MQTT here, which is what made the QoS 1 contract hold end to
end.

## How many messages can be in flight

`max_ack_pending` caps how many QoS 1 and 2 messages (combined) the
server will send to a subscription before it has to wait for
acknowledgments. It defaults to **1024**, and the valid range is 0 to
65535. Setting it to `0` doesn't mean "nothing in flight" — the server
reads 0 as "use the default" and applies 1024.

Two limits follow from that:

- The total across all of a session's subscriptions can't exceed
  **65535**. A subscription that would push the total over the limit is
  refused, and the server returns `0x80` in the SUBACK for it.
- A subscription ending in `#` counts **twice**, because of the two
  subscriptions the server creates for it (see
  [Topics and subjects](/learn/mqtt/topics-and-subjects#why--sometimes-creates-two-subscriptions)).

Those two combine into a tighter ceiling than the 65535 suggests. At the
default of 1024, a session has room for 63 plain subscriptions, or
31 if they all end in `#` — the check is strict, so the subscription
that would reach the cap exactly is already refused. A device that
subscribes to many topics can
hit that, and the symptom is a subscription refused with `0x80` rather
than an error your code can catch later. Lower `max_ack_pending` if you
need more subscriptions per session. Like `ack_wait`, a change applies
only to new subscriptions.

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

This bites when it happens by accident. Deploy the same client ID to
two devices and each connection evicts the other; if both have
reconnect logic, the cycle repeats as fast as they can reconnect. The
server limits the damage by recording the client ID as flapping and
refusing to hand the session over again for about a second, which slows
the cycle without stopping it.

The check works across a cluster too, and there it's less immediate:
eviction has to travel between servers rather than happening in one
process. There are also cases where the server refuses the new
connection instead of closing the old one — for instance when the
existing connection is in the middle of processing packets and can't be
closed safely. Treat client IDs as unique per device and none of this
comes up.

## Will messages

A will message is how the rest of the system finds out a device dropped
off. The device registers the will in its CONNECT packet: a topic, a
payload, and optionally a QoS level and the RETAIN flag. If the
connection ends without a clean DISCONNECT — the network drops, the
keepalive times out, the process dies — the server publishes the will.
A clean DISCONNECT discards it silently.

The will topic converts to a subject by the same rules as any other
topic, so the notification reaches NATS subscribers too. That makes
device liveness visible to the whole backbone: a will on
`fleet/truck-17/status` lands on `fleet.truck-17.status`, where any
NATS service can react to it.

Watch it happen. Subscribe on the NATS side:

```bash
nats sub "fleet.>"
```

Connect an MQTT client that registers a will, in another terminal:

```bash
mosquitto_sub -h 127.0.0.1 -p 1883 \
  -t "fleet/dispatch" \
  --will-topic "fleet/truck-17/status" \
  --will-payload "offline"
```

Now kill that client without giving it the chance to disconnect
cleanly:

```bash
kill -9 $(pgrep mosquitto_sub)
```

The NATS subscriber receives the will:

```
[#1] Received on "fleet.truck-17.status"
Nmqtt-Pub: 0

offline
```

Interrupt the client with Ctrl-C instead and nothing arrives: mosquitto
sends a DISCONNECT on the way out, and the server discards the will.
The will fires only on an abnormal disconnect, which is exactly the
case you want to detect.

Pair the will with the RETAIN flag (`--will-retain` in mosquitto) and
the "offline" marker persists as the topic's retained value, so a
dashboard that subscribes later still sees the device as down. Retained
messages are the next section. Publish with the
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
both devices connect and both keep dropping. Give every device its
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

**Testing a will with a clean shutdown.** A client that exits normally
sends DISCONNECT, and the server discards the will without publishing
it. If your liveness test stops the device politely, you'll conclude
wills don't work. Test with a hard kill or by cutting the network, the
failures the will exists for.

## Where you are

Your setup is unchanged, and you now know what the server is holding:

- QoS 0, 1, and 2 supported, with delivery at the lower of publish and
  subscription QoS
- NATS-originated messages always delivered at QoS 0
- unacknowledged QoS 1 and 2 messages redelivered after `ack_wait`
  (30 seconds by default), capped in flight by `max_ack_pending`
- sessions keyed by client ID, stored in JetStream, cleared by the
  clean session flag
- a will message registered at connect, published on abnormal
  disconnect, and discarded on a clean one
- one retained message per topic, replaced by the next retained publish
  and deleted by an empty one

## What's next

Everything so far ran on one server with no authentication. Devices in
the field need credentials, and the fleet needs more than one server.
[Auth and clustering](/learn/mqtt/auth-and-clustering) restricts a user to MQTT
connections, writes permissions for a device fleet, and covers what
changes when MQTT runs on the `east` cluster.

## See also

- [Reference → mqtt](/reference/config/mqtt/) — `ack_wait`,
  `max_ack_pending`, and the rest of the block
- [JetStream → Delivery and acknowledgment](/learn/jetstream/delivery-and-acknowledgment)
  — the same redelivery idea on the NATS side, where MQTT's state is stored
- [Topics and subjects](/learn/mqtt/topics-and-subjects) — the `#` rule that makes
  a subscription cost double
