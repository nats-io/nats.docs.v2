---
id: where-next
title: "Where to go next"
sidebar_position: 6
description: Recap the MQTT model and point to the chapters and Reference that take it further
---

# Where to go next

Acme's devices now sit on the same backbone as everything else,
unmodified: publishing MQTT topics that land on NATS subjects, captured
in a `DEVICES` stream the ORDERS platform reads, authenticated as
MQTT-only users, running on the `east` cluster.

This page doesn't teach anything new. It collects the model into one
place and points at what takes each piece further.

## The core idea

`nats-server` is the MQTT broker. There's no bridge process and no
translation layer you operate. One binary holds one listener for NATS
clients and another for MQTT devices, and the conversion between them
happens inside the server.

A **topic becomes a subject** on the way through: `/` turns into `.`,
`.` turns into `//`, and the awkward positions are escaped. A few
characters have no encoding at all — a space above all — and those
topics are refused rather than converted. Everything downstream —
subscriptions, permissions, streams — is written against the converted
subject, not the topic the device sent.

**QoS is an MQTT-side contract.** The server honors 0, 1, and 2 between
MQTT clients, holding each unacknowledged message and redelivering it
once `ack_wait` expires, until the client acknowledges. It can't extend
that contract to NATS publishes, which arrive as QoS 0, because a NATS
message carries no QoS to inherit.

**MQTT's state lives in JetStream.** Sessions, retained messages, and
in-flight QoS 1 and 2 deliveries are all stored in streams the server
manages for itself. That's why the account needs JetStream, and why
sessions survive both a reconnect and a restart.

## What this chapter did not cover

A few things hold everywhere and didn't get a page of their own:

- Messages published by NATS clients reach MQTT subscribers as QoS 0.
- Topics containing a space, tab, newline, carriage return, form feed,
  or DEL are rejected: publishing closes the connection, subscribing
  returns a failure code in the SUBACK.
- A subscription filter ending in `#` creates two NATS subscriptions and
  consumes twice the `max_ack_pending` budget.
- Only MQTT v3.1.1 is supported; a client requesting v5 is rejected at
  connect.

And two topics are out of scope here:

- **MQTT over WebSocket.** Browser-based MQTT clients connect through
  the `websocket {}` listener, with `MQTT_WS` as their connection type.
  The WebSocket side has its own configuration and is not covered in
  this chapter.
- **Sparkplug B.** The payload specification some industrial fleets
  layer on top of MQTT. To the server it's ordinary MQTT traffic;
  nothing in NATS interprets it.

## Where the reference details live

This chapter is concept-first and unversioned. The exact fields of the
`mqtt {}` block, their types, ranges, and defaults, are in
**[Reference → mqtt](/reference/config/mqtt/)**, which is versioned and
exhaustive. When you need the precise default for `ack_wait`, the valid
range of `max_ack_pending`, or the TLS options the listener accepts,
that's where to look.

For how the server implements MQTT internally — the streams it creates,
the packet handling, the session records — the
[MQTT implementation overview](https://github.com/nats-io/nats-server/blob/main/server/README-MQTT.md)
in the `nats-server` repo is the primary source.

## What to read next

Two chapters continue directly from where this one stops.

**[JetStream](/learn/jetstream)** is the real next step, because the
chapter ends by putting device data in a stream and then leaves it there.
`DEVICES` is an ordinary stream, so consumers, filtering, retention
policies, and replay all apply to it, and that's the work of actually
using what the sensors send. The same chapter explains the machinery
behind MQTT's own sessions and retained messages.

**[Security](/learn/security)** finishes the auth story.
[Auth and clustering](/learn/mqtt/auth-and-clustering) restricted a user to MQTT
connections and handed devices a bearer JWT, but stopped short of the
model underneath: accounts as subject isolation, how permissions are
evaluated, and [operator mode](/learn/security/operator-mode) end to end.
A fleet in the field needs that model, not one `authorization` block.

One more is worth knowing about rather than reading now.
[Topologies](/learn/topologies) covers **leaf nodes**, which suit devices
well: a leaf on a factory floor or in a vehicle gives local MQTT clients
a nearby server that needs only outbound connectivity to the hub, so
they keep working when the link to the cloud is down.
[Auth and clustering](/learn/mqtt/auth-and-clustering#mqtt-on-a-leaf-node)
covers the `js_domain` setting that keeps MQTT state on the leaf.

## Production checklist

Every content page closed with a Pitfalls section. This collects their
action items into one pass to make before you point real devices at a
server. Each group links back to the page that explains why.

### Your first MQTT client — see [Pitfalls](/learn/mqtt/your-first-mqtt-client#pitfalls)

- [ ] Enable JetStream on the server and on the account your MQTT users bind to; without it the server won't start and MQTT clients can't connect.
- [ ] Point plain MQTT clients at the MQTT port and MQTT-over-WebSocket clients at the WebSocket listener; the two are not interchangeable.

### Topics and subjects — see [Pitfalls](/learn/mqtt/topics-and-subjects#pitfalls)

- [ ] Write every permission as a NATS subject with NATS wildcards; a rule written with `/` or `#` never matches.
- [ ] Grant both `sensors.>` and `sensors` for a device subscribing to `sensors/#`; missing the second one fails the whole filter with `0x80`, not just the parent level.
- [ ] Normalize leading and trailing slashes across the fleet, or account for both subject trees; `sensors/temp` and `/sensors/temp` are different subjects.
- [ ] Sanitize anything interpolated into a topic; a space closes the connection on publish and fails the SUBACK on subscribe.

### QoS, sessions, and retained messages — see [Pitfalls](/learn/mqtt/qos-sessions-and-retained#pitfalls)

- [ ] Don't rely on a QoS 1 subscription to make NATS-originated traffic durable; it arrives as QoS 0. Put that data in a stream instead.
- [ ] Give every device its own client ID, ideally derived from hardware; duplicates evict each other on every reconnect.
- [ ] Count subscriptions against `max_ack_pending`; at the default of 1024 a session fits 63 subscriptions (31 if they end in `#`) before the 65535 per-session cap refuses one with `0x80`.
- [ ] Use JetStream where you need history; only the last retained value per topic is kept.
- [ ] Test wills with a hard kill or a cut network, not a clean shutdown; a DISCONNECT discards the will.

### Auth and clustering — see [Pitfalls](/learn/mqtt/auth-and-clustering#pitfalls)

- [ ] Put credentials and TLS on the MQTT listener before it leaves a lab; an open port 1883 accepts any device that can reach it.
- [ ] Keep `$MQTT.sub.>` out of permission lists on 2.12.3 and later — allowing it is unnecessary there, and denying it silently breaks QoS 1 and 2. On 2.10 and 2.11, allow it explicitly.
- [ ] Set `--bearer` on both the account and the user for operator-mode devices; missing either refuses a valid JWT with CONNACK return code 5.
- [ ] Set `server_name` on every server; MQTT requires it as soon as a cluster or gateway block exists.

## See also

- [Reference → mqtt](/reference/config/mqtt/) — every field of the
  `mqtt {}` block, versioned and exhaustive
- [JetStream deep dive](/learn/jetstream) — the `DEVICES` stream and the
  persistence MQTT itself runs on
- [Security deep dive](/learn/security) — accounts, permissions, and
  operator mode for device credentials
