---
id: your-first-mqtt-client
title: "Your first MQTT client"
sidebar_position: 2
description: Enable the mqtt block on a local server, publish from an MQTT sensor, and receive the reading on the NATS side
---

# Your first MQTT client

Acme's cold-chain sensors speak MQTT and can't be changed. The ORDERS
platform speaks NATS. This page puts both on one server: a sensor
publishes a temperature reading over MQTT, and a `nats sub` on the other
side receives it as an ordinary NATS message.

You need two things to get there: JetStream, which MQTT stores its state
in, and an `mqtt {}` block, which opens the port devices connect to.

## MQTT stores its state in JetStream

MQTT needs state that outlives a connection: a session's
subscriptions, unacknowledged QoS 1 and 2 messages, and retained
messages. The server keeps all of it in JetStream streams, so JetStream
has to be reachable.

On a standalone server, reachable means enabled locally. Configure
`mqtt {}` without JetStream and the server refuses to start:

```
mqtt requires JetStream to be enabled if running in standalone mode
```

The error names the scope: "in standalone mode". A server with a
`cluster`, `gateway`, or `leafnode` configuration can reach JetStream
elsewhere in the system, so the check doesn't apply there. This chapter
runs JetStream locally throughout.

Turn JetStream on and the server creates the streams it needs on its
own. You never manage them; they're covered in
[QoS, sessions, and retained messages](/learn/mqtt/qos-sessions-and-retained).

## Enable MQTT

You need two blocks: `jetstream` for the state and `mqtt` for the
listener.

```conf
# mqtt-server.conf — one server serving both NATS clients and MQTT devices
listen: 127.0.0.1:4222

jetstream {
  store_dir: "./js/mqtt-server"
}

mqtt {
  listen: 127.0.0.1:1883
}
```

MQTT gets its own listener on port 1883, the conventional MQTT port.
The server doesn't choose it for you: an `mqtt {}` block with no
`listen` or `port` disables MQTT silently, with no error and no log
line, so always set one. It's a separate listener from the client port
on 4222, the way the cluster and leafnode ports are separate — one port
per kind of connection. NATS clients keep connecting to 4222 and know
nothing about MQTT.

Start it:

```bash
nats-server -c mqtt-server.conf
```

The log confirms the listener is up:

```
[INF] Listening for MQTT clients on mqtt://127.0.0.1:1883
```

There's no `authorization` block yet, so devices connect without
credentials. That's fine on a laptop and wrong in production;
[Auth and clustering](/learn/mqtt/auth-and-clustering) locks it down.

The full field list for the block — TLS, timeouts, replica counts —
is in [Reference → mqtt](/reference/config/mqtt/). The three pages after
this one introduce the fields that change behavior you can observe.

## Publish from a sensor, receive on NATS

Subscribe on the NATS side first, so the interest is registered before
the reading arrives. In one terminal:

```bash
nats sub "sensors.>"
```

In a second terminal, publish as the cold-chain sensor would, over MQTT:

```bash
mosquitto_pub -h 127.0.0.1 -p 1883 \
  -t "sensors/warehouse/cold-1/temp" \
  -m "4.2"
```

The NATS subscriber receives it:

```
[#1] Received on "sensors.warehouse.cold-1.temp"
Nmqtt-Pub: 0

4.2
```

The device published `sensors/warehouse/cold-1/temp` and the subscriber
matched `sensors.warehouse.cold-1.temp`. The server converted the topic
to a subject on the way through, turning each `/` into a `.`. The
payload crossed untouched — MQTT payloads are bytes, and so are NATS
payloads. The `Nmqtt-Pub` header is the server marking the message as
MQTT-originated, with the QoS it was published at; NATS subscribers can
read it or ignore it.

Nothing on the NATS side is MQTT-aware. `nats sub` used a normal
wildcard subscription and got a normal message. Any NATS subscriber, a
JetStream stream, or a service can consume device traffic the same way.

<div class="nats-flow" data-scenario="mqttBridgeAnimated" data-width="640" data-height="460"></div>

## Publish from NATS, receive on the device

The bridge runs both ways. Acme's dispatch system sends instructions to
trucks over the same server.

Subscribe as the truck's telemetry unit, over MQTT:

```bash
mosquitto_sub -h 127.0.0.1 -p 1883 \
  -t "fleet/truck-17/telemetry" -v
```

Publish from the NATS side:

```bash
nats pub fleet.truck-17.telemetry "reroute to depot 4"
```

The device receives it:

```
fleet/truck-17/telemetry reroute to depot 4
```

The conversion runs in reverse for delivery: the subject
`fleet.truck-17.telemetry` matches the device's subscription on
`fleet/truck-17/telemetry`.

One detail matters later: a message published by a NATS client always
arrives at an MQTT subscriber as QoS 0, whatever QoS the subscription
asked for. A NATS publish carries no QoS, so there's nothing to promote
it with. [QoS, sessions, and retained
messages](/learn/mqtt/qos-sessions-and-retained) covers what that costs you.

## What the server does with a subscription

When the MQTT client subscribed to `fleet/truck-17/telemetry`, the
server created a matching NATS subscription on
`fleet.truck-17.telemetry`. The bridge is a real subscription, not a
special case in the publish path.

Because the interest is a real NATS subscription, it propagates the way
any other subscription does. A publisher connected to a different server
in the cluster reaches this device, and the publisher needs to know
nothing about MQTT. The same holds in the other direction: an MQTT
publish becomes a NATS publish on the converted subject, and every
matching NATS subscriber receives it.

## Where the readings go

The readings are now ordinary NATS traffic, so everything Acme already
runs on NATS can treat them the same way it treats anything else,
including keeping them.

JetStream is already enabled, so capturing both device subject trees
takes one command:

```bash
nats stream add DEVICES \
  --subjects "sensors.>,fleet.>" \
  --storage file \
  --retention limits \
  --max-age 720h \
  --defaults
```

Everything on those two subject trees is now stored for 30 days — sensor
readings, truck telemetry, and the dispatch instructions published from
the NATS side. The ORDERS platform consumes `DEVICES` like any other
stream: a cold-chain excursion flags the order for the shipment it
belongs to, and truck telemetry updates a delivery's position.
Consumers, filtering, and replay work exactly as the
[JetStream deep dive](/learn/jetstream) describes, because this is a
normal stream.

The devices don't change at all; they keep publishing plain MQTT and
the server does the rest. A QoS 0 reading is gone once it is delivered, and QoS 1
only reaches subscribers that exist at the time. Stored in `DEVICES`, a
reading is still readable by a consumer written next month.

## Pitfalls

Two problems account for most failed first attempts.

**Starting without JetStream.** A server with an `mqtt {}` block and no
`jetstream` block exits at startup with `mqtt requires JetStream to be
enabled if running in standalone mode`. The requirement applies per
account too: an MQTT user whose account has no JetStream is refused at
connect time. Enable JetStream on the server, and on the account your
MQTT users bind to.

**Pointing an MQTT-over-WebSocket client at 1883.** MQTT clients that
speak WebSocket must connect to the WebSocket port configured in the
`websocket {}` block, not the MQTT port. Send a WebSocket handshake to
1883 and the server rejects it with `MQTT clients over websocket must
connect to the Websocket port, not the MQTT port`. Plain MQTT goes to
1883; MQTT over WebSocket goes to the WebSocket listener.

## Where you are

You have one `nats-server` doing two jobs:

- NATS clients on 4222, MQTT devices on 1883
- JetStream enabled, holding the MQTT state the server manages for itself
- a sensor publishing `sensors/warehouse/cold-1/temp` that a
  `nats sub "sensors.>"` receives as `sensors.warehouse.cold-1.temp`
- a truck subscribed to `fleet/truck-17/telemetry` receiving what a NATS
  client publishes on `fleet.truck-17.telemetry`
- a `DEVICES` stream capturing `sensors.>` and `fleet.>`, which is how
  device data reaches the ORDERS platform

Keep the server and the stream; the next pages build on both.

## What's next

The conversion worked cleanly here because the topics were simple. Real
device fleets use leading slashes, empty levels, and wildcards, and some
characters have no valid subject to convert to.
[Topics and subjects](/learn/mqtt/topics-and-subjects) covers the full set of
rules.

## See also

- [Reference → mqtt](/reference/config/mqtt/) — every field of the
  `mqtt {}` block
- [Core NATS → Publish-subscribe](/learn/core-nats/publish-subscribe) —
  the NATS side of what you just did
- [JetStream deep dive](/learn/jetstream) — the persistence layer MQTT
  stores its state in
