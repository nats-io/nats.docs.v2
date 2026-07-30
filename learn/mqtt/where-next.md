---
id: where-next
title: "Where to go next"
sidebar_position: 6
description: Recap the MQTT model and point to the chapters and Reference that take it further
---

# Where to go next

You started this chapter with devices that speak a protocol NATS doesn't
and firmware Acme can't change. You end it with those devices on the same
backbone as everything else: publishing MQTT topics that land on NATS
subjects, captured in a `DEVICES` stream the ORDERS platform reads,
authenticated as MQTT-only users, running on the `east` cluster. The
devices were never modified.

This page doesn't teach anything new. It collects the model into one
place and points at what takes each piece further.

## The core idea

Every page circled the same idea, which is worth stating on its own.

`nats-server` **is** the MQTT broker. There's no bridge process and no
translation layer you operate. One binary holds one listener for NATS
clients and another for MQTT devices, and the conversion between them
happens inside the server.

A **topic becomes a subject** on the way through: `/` turns into `.`,
`.` turns into `//`, and the awkward positions are escaped so the result
is always a valid subject. Everything downstream — subscriptions,
permissions, streams — is written against the converted subject, not the
topic the device sent.

**QoS is an MQTT-side contract.** The server honors 0, 1, and 2 between
MQTT clients, holding unacknowledged messages until a PUBACK or until
`ack_wait` expires. It can't extend that contract to NATS publishes,
which arrive as QoS 0, because a NATS message carries no QoS to inherit.

**MQTT's state lives in JetStream.** Sessions, retained messages, and
in-flight QoS 1 and 2 deliveries are all stored in streams the server
manages for itself. That's why the account needs JetStream, and why
sessions survive both a reconnect and a restart.

Those four ideas are the chapter. Everything else refines them.

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
[Auth and clustering](./auth-and-clustering) restricted a user to MQTT
connections and handed devices a bearer JWT, but stopped short of the
model underneath: accounts as subject isolation, how permissions are
evaluated, and [operator mode](/learn/security/operator-mode) end to end.
A fleet in the field needs that model, not one `authorization` block.

One more is worth knowing about rather than reading now.
[Topologies](/learn/topologies) covers **leaf nodes**, which suit devices
well: a leaf on a factory floor or in a vehicle gives local MQTT clients
a nearby server that needs only outbound connectivity to the hub, so
they keep working when the link to the cloud is down.

## Production checklist

Every content page closed with a Pitfalls section. This collects their
action items into one pass to make before you point real devices at a
server. Each group links back to the page that explains why.

### Your first MQTT client — see [Pitfalls](./your-first-mqtt-client#pitfalls)

- [ ] Enable JetStream on the server and on the account your MQTT users bind to; without it the server won't start and MQTT clients can't connect.
- [ ] Point plain MQTT clients at the MQTT port and MQTT-over-WebSocket clients at the WebSocket listener; the two are not interchangeable.

### Topics and subjects — see [Pitfalls](./topics-and-subjects#pitfalls)

- [ ] Write every permission as a NATS subject with NATS wildcards; a rule written with `/` or `#` never matches.
- [ ] Grant both `sensors.>` and `sensors` for a device subscribing to `sensors/#`, since the server creates a subscription for each.
- [ ] Normalize leading and trailing slashes across the fleet, or account for both subject trees; `sensors/temp` and `/sensors/temp` are different subjects.
- [ ] Sanitize anything interpolated into a topic; whitespace closes the connection on publish and fails the SUBACK on subscribe.

### QoS, sessions, and retained messages — see [Pitfalls](./qos-sessions-and-retained#pitfalls)

- [ ] Don't rely on a QoS 1 subscription to make NATS-originated traffic durable; it arrives as QoS 0. Put that data in a stream instead.
- [ ] Give every device its own client ID, ideally derived from hardware; duplicates evict each other on every reconnect.
- [ ] Count subscriptions before raising `max_ack_pending`; the per-session total is capped at 65535 and every `#` subscription costs double.
- [ ] Use JetStream where you need history; only the last retained value per topic is kept.

### Auth and clustering — see [Pitfalls](./auth-and-clustering#pitfalls)

- [ ] Put credentials and TLS on the MQTT listener before it leaves a lab; an open port 1883 accepts any device that can reach it.
- [ ] Keep `$MQTT.sub.>` out of permission lists entirely — allowing it is unnecessary from 2.14, and denying it silently breaks QoS 1 and 2.
- [ ] Set `--bearer` on both the account and the user for operator-mode devices; missing either gives `Authorization Violation` with a valid JWT.
- [ ] Set `server_name` on every server; MQTT requires it as soon as a cluster or gateway block exists.

## See also

- [Reference → mqtt](/reference/config/mqtt/) — every field of the
  `mqtt {}` block, versioned and exhaustive
- [JetStream deep dive](/learn/jetstream) — the `DEVICES` stream and the
  persistence MQTT itself runs on
- [Security deep dive](/learn/security) — accounts, permissions, and
  operator mode for device credentials
- [Topologies deep dive](/learn/topologies) — leaf nodes for devices at
  the edge
