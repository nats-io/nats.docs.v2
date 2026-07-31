---
id: index
title: "Connect MQTT devices to NATS"
sidebar_position: 1
description: Run nats-server as the MQTT broker for your devices, so their topics land on the NATS subjects your applications already use
---

# Connect MQTT devices to NATS

`nats-server` speaks MQTT. Add one configuration block and the same
binary that serves your NATS clients also accepts MQTT connections, on
its own listener. There's no bridge process to deploy and
no second broker to run.

An MQTT device keeps its own client library, its topics, and its QoS
settings. It connects to `nats-server` the way it would connect to any
MQTT broker. The server converts each topic to a NATS subject, so a
temperature reading published on the MQTT topic
`sensors/warehouse/cold-1/temp` reaches a NATS subscriber on
`sensors.warehouse.cold-1.temp`.

NATS implements [MQTT
v3.1.1](https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html)
and supports QoS 0, 1, and 2. A device that requests MQTT v5 is
rejected at connect: it receives a CONNACK with return code 1,
"unacceptable protocol version".

## When to use it

MQTT support exists so you can keep an investment you already have.
Updating software on devices in the field is slow and risky, especially
when the application is embedded. If your endpoints already speak MQTT,
or can only ever speak MQTT, pointing them at `nats-server` gets them
onto a NATS backbone without touching the device code.

For a greenfield deployment, prefer NATS end to end where you can. One
technology from device to cloud gives you a single security model and
one set of observability tools. The NATS clients are efficient enough
for constrained hardware.

## What you gain over a standalone broker

A standalone MQTT broker scales by making one node bigger. `nats-server`
scales by adding servers: clusters, superclusters, and leaf nodes carry
MQTT traffic the same way they carry everything else, so capacity for
connections and messages grows with the deployment rather than being
bounded by one broker process. Delivery is subject-based fan-out, so one
sensor reading reaches any number of consumers without a per-subscriber
queue on the broker. And where a broker's persistence stops at a
last-value cache per topic, device traffic on NATS lands in JetStream
streams, with retention limits, replay, and consumers written long after
the message arrived.

## Who this is for

You have MQTT devices and a NATS system, and you want them on one
backbone: sensors, gateways, or vehicles that speak MQTT, publishing
into the same subjects your NATS applications already consume.

That covers:

- replacing a standalone MQTT broker with `nats-server`
- putting an existing fleet onto NATS without reflashing firmware
- routing device traffic into JetStream so it survives a restart

## The running scenario

The examples follow one fictional company. Acme runs its ORDERS
platform on NATS. Two groups of devices don't:
cold-chain temperature sensors in the warehouse and telemetry units in
the delivery fleet, both bought with MQTT firmware that Acme can't
change.

This chapter puts those devices on the same backbone. They publish MQTT
topics like `sensors/warehouse/cold-1/temp` and `fleet/truck-17/telemetry`;
the NATS side subscribes to `sensors.>` and `fleet.>` and treats the
readings like any other NATS message.

Once the readings are NATS
messages, they go into a stream like anything else, and the ORDERS
platform consumes them: a cold-chain excursion flags the order for that
shipment, and truck telemetry updates a delivery's position. The devices
keep speaking plain MQTT throughout.

## By the end you'll have

- an MQTT sensor publishing to `nats-server`, and a NATS subscriber
  receiving its readings
- a `DEVICES` stream capturing that traffic for the ORDERS platform to
  consume
- a working model of how a topic becomes a subject, wildcards included
- QoS 1 delivery you can reason about, and the two settings that shape it
- an MQTT user restricted to MQTT connections, running on the `east`
  cluster

## Map

| Page | What you learn |
|---|---|
| [Your first MQTT client](/learn/mqtt/your-first-mqtt-client) | Enable MQTT, connect a device, and watch its message reach a NATS subscriber |
| [Topics and subjects](/learn/mqtt/topics-and-subjects) | The conversion rules, wildcards, and which characters are rejected |
| [QoS, sessions, and retained messages](/learn/mqtt/qos-sessions-and-retained) | Delivery guarantees, redelivery, sessions, will messages, and retained messages |
| [Auth and clustering](/learn/mqtt/auth-and-clustering) | Restrict a user to MQTT, write fleet permissions, and run MQTT on a cluster |
| [Where to go next](/learn/mqtt/where-next) | A map of what's beyond this chapter |

## Prerequisites

You'll need:

- **`nats-server` 2.10 or later**, with JetStream enabled. MQTT support
  landed in 2.2, but this chapter uses the `.`-in-topic conversion and
  covers QoS 2, both of which arrived in 2.10. A single local server is
  enough until
  [Auth and clustering](/learn/mqtt/auth-and-clustering), which uses the
  `east` cluster.
- **An MQTT client.** The examples use
  [`mosquitto_pub` and `mosquitto_sub`](https://mosquitto.org/download/),
  which are small and available everywhere. Any MQTT v3.1.1 client works.
- **The `nats` CLI**, pointed at the same server, for the NATS side of
  every example.

Open a terminal and turn to
[Your first MQTT client](/learn/mqtt/your-first-mqtt-client).

## See also

- [Reference → mqtt](/reference/config/mqtt/) — every field of the
  `mqtt {}` block, versioned and exhaustive
- [Core NATS → Subjects and wildcards](/learn/core-nats/subjects-and-wildcards)
  — the subject rules that MQTT topics are converted into
- [JetStream deep dive](/learn/jetstream) — the persistence layer MQTT
  sessions and retained messages are stored in
