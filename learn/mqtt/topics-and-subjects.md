---
id: topics-and-subjects
title: "Topics and subjects"
sidebar_position: 3
description: How the server converts MQTT topics into NATS subjects, what wildcards become, and which characters have no valid conversion
---

# Topics and subjects

On the last page `sensors/warehouse/cold-1/temp` arrived as
`sensors.warehouse.cold-1.temp`. That conversion was easy to guess: each
`/` became a `.`.

Real device fleets aren't that tidy. Topics start with a slash, end with
one, contain empty levels, or hold a `.` that means nothing special in
MQTT but separates levels in NATS. This page covers the whole rule set,
so you can predict the subject for any topic your devices publish and
write permissions and subscriptions against it.

Both systems are hierarchical, and that's why the conversion works at
all. MQTT separates levels with `/`; NATS separates them with `.`. The
server rewrites the separator and escapes anything that would produce an
invalid subject.

## The conversion rules

A plain topic converts one separator at a time. The awkward cases are
the ones where a `/` sits at the start, at the end, or next to another
`/` — a bare translation would produce `.foo.bar.`, which isn't a valid
NATS subject. The server escapes those positions instead.

| MQTT topic | NATS subject | Rule |
|---|---|---|
| `sensors/cold-1/temp` | `sensors.cold-1.temp` | `/` between two levels becomes `.` |
| `/sensors/temp` | `/.sensors.temp` | a leading `/` becomes `/.` |
| `sensors/temp/` | `sensors.temp./` | a trailing `/` becomes `./` |
| `sensors//temp` | `sensors./.temp` | a `/` next to another becomes `./` |
| `//sensors/temp` | `/./.sensors.temp` | both rules apply in turn |
| `cold-1.temp` | `cold-1//temp` | a `.` in the topic becomes `//` |

The last row is the one that surprises people. A `.` is an ordinary
character in an MQTT topic and the level separator in NATS, so it can't
pass through unchanged. The server encodes it as `//`, which is why the
first five rows escape `/` the way they do: the two characters swap
roles, and the escaping keeps the mapping reversible.

Converting `.` was added in NATS Server 2.10. Before that a `.` in a
topic was rejected the way whitespace still is.

## Characters with no conversion

Whitespace has no valid encoding, so the server refuses it. That means
the space, tab, newline, carriage return, and form feed. A subject
containing whitespace would break the NATS wire protocol when forwarded
to other connection types, since the control line could be split. The
DEL character (`0x7f`) is refused for a similar reason: the subject
index uses it internally as a marker.

The refusal shows up differently depending on what the client was doing:

- **Publishing** to a topic with one of these characters closes the
  connection.
- **Subscribing** to a filter with one of them returns a failure code in
  the SUBACK packet, so the subscription isn't created and the
  connection survives.

Device firmware that builds topics from free-text fields (a location
name, say) is where this usually bites. Strip whitespace before it
reaches the topic.

## Wildcards

MQTT and NATS both have single-level and multi-level wildcards, and they
map onto each other directly. As in NATS, MQTT allows them only in
subscriptions, never in a published topic — publish to a topic
containing `+` or `#` and the server rejects it.

| MQTT wildcard | NATS wildcard | Matches |
|---|---|---|
| `+` | `*` | exactly one level |
| `#` | `>` | one or more levels |

So a device subscribing to `sensors/+/temp` gets the NATS subscription
`sensors.*.temp`, and it receives `sensors/cold-1/temp` and
`sensors/cold-2/temp` but not `sensors/warehouse/cold-1/temp`.

### Why `#` sometimes creates two subscriptions

`#` and `>` are almost the same, and the difference costs an extra
subscription.

In MQTT, `sensors/#` matches `sensors/cold-1`, `sensors/cold-1/temp`,
and also the parent level `sensors` on its own. In NATS, `sensors.>`
requires at least one token after `sensors`, so it never matches
`sensors` by itself.

To make MQTT behave as specified, the server creates two NATS
subscriptions for that filter: one on `sensors.>` and one on `sensors`.
Together they cover exactly what MQTT's `#` covers.

A filter of just `#` needs no such help. It converts to `>`, which
already matches everything, so one subscription is enough.

This is worth remembering because the pair counts twice against limits.
A subscription ending in `#` consumes twice the `max_ack_pending`
budget, which the [next page](./qos-sessions-and-retained) covers.

## NATS wildcards inside MQTT topics

MQTT has no special meaning for `*` or `>`. They're ordinary characters
in a topic, and the server doesn't escape them during conversion. If one
ends up as a complete token in the resulting subject, NATS reads it as a
wildcard.

| MQTT topic | NATS subject | How NATS reads it |
|---|---|---|
| `fleet*/status` | `fleet*.status` | literal — `*` is only part of the token |
| `fleet>/status` | `fleet>.status` | literal — same reason |
| `fleet/*/status` | `fleet.*.status` | wildcard — `*` is the whole token |
| `fleet/>` | `fleet.>` | wildcard — `>` is the whole token |

The server doesn't reject these. The publish-time wildcard check covers
only MQTT's own wildcards, `+` and `#`; `*` and `>` are ordinary
characters as far as MQTT is concerned, so they pass straight through.

That leaves two different problems depending on direction:

- **Subscribing** to `fleet/*/status` creates a real NATS wildcard
  subscription on `fleet.*.status`. The device asked for one literal
  topic and receives every `fleet/<anything>/status` instead.
- **Publishing** to `fleet/*/status` succeeds and lands on the subject
  `fleet.*.status`, which is not a subject any device is reading
  literally.

Keep `*` and `>` out of topic names unless you mean the NATS behavior.

## Permissions apply to the subject

Authorization runs on the converted subject, not the MQTT topic. The
server converts first, then checks permissions.

Write permissions for MQTT users as NATS subjects, with NATS wildcards.
A device publishing `sensors/warehouse/cold-1/temp` needs publish
permission on `sensors.warehouse.cold-1.temp`, and `sensors.>` covers
the whole fleet. A rule written `sensors/#` never matches anything.

Subscribe permissions need one more step, because of the two-subscription
rule above. A device subscribing to `sensors/#` makes the server create
subscriptions on both `sensors.>` and `sensors`, and permissions are
checked for each. Allow only `sensors.>` and the second one is denied.
Grant both:

```text
subscribe: ["sensors.>", "sensors"]
```

The full permission setup for MQTT users, including the extra subject a
QoS 1 subscription needs, is on
[Auth and clustering](./auth-and-clustering).

## See a conversion for yourself

The quickest way to check any topic is to subscribe to everything on the
NATS side and watch what arrives. In one terminal:

```bash
nats sub ">"
```

Publish a few awkward topics from another:

```bash
mosquitto_pub -h 127.0.0.1 -p 1883 -t "/sensors/temp" -m "4.2"
mosquitto_pub -h 127.0.0.1 -p 1883 -t "sensors//temp" -m "4.3"
mosquitto_pub -h 127.0.0.1 -p 1883 -t "cold-1.temp" -m "4.4"
```

The subjects show the escaping:

```
[#1] Received on "/.sensors.temp"
4.2

[#2] Received on "sensors./.temp"
4.3

[#3] Received on "cold-1//temp"
4.4
```

Keep this handy when you're writing permissions for a fleet whose topics
you don't control. Publish one message and read the subject off the
subscriber rather than working it out by hand.

## Pitfalls

**Writing permissions as MQTT topics.** Permissions are checked against
the converted subject, so a rule written with `/` separators or MQTT
wildcards never matches. `sensors/#` is not a NATS subject; for
publishing, the rule you want is `sensors.>`. This fails quietly in the
wrong direction — the device connects and then finds its publishes
rejected.

**Granting only `sensors.>` for a `#` subscription.** A device
subscribing to `sensors/#` needs both `sensors.>` and `sensors`, because
the server creates a subscription for each. Grant only the first and the
device connects, subscribes, and silently never receives anything
published to the parent level.

**Assuming a leading or trailing slash is cosmetic.** `sensors/temp` and
`/sensors/temp` convert to different subjects (`sensors.temp` and
`/.sensors.temp`), and neither matches a subscription written for the
other. If some devices in a fleet emit a leading slash and others don't,
you have two subject trees, not one. Normalize the topics on the device
or account for both in your subscriptions.

**Letting free text into a topic.** A topic built from a device name or
location that contains a space is rejected: the publish closes the
connection, and a subscription gets a failure code in its SUBACK.
Sanitize anything interpolated into a topic.

## Where you are

Nothing changed in your running setup. What you have now is the full
mapping:

- `/` becomes `.`, with escaping at the start, at the end, and between
  adjacent slashes
- `.` becomes `//`
- whitespace and DEL are refused
- `+` becomes `*`, `#` becomes `>`, and `#` below the top level costs two
  subscriptions
- permissions, subscriptions, and stream subjects are all written against
  the converted subject

## What's next

You can now predict which subject any topic lands on. The next question
is what the server promises about delivering it.
[QoS, sessions, and retained messages](./qos-sessions-and-retained)
covers the delivery guarantees, what the server stores between
connections, and why messages from the NATS side always arrive as QoS 0.

## See also

- [Core NATS → Subjects and wildcards](/learn/core-nats/subjects-and-wildcards)
  — the NATS subject rules these conversions target
- [Security → Authorization](/learn/security/authorization) — how
  publish and subscribe permissions are evaluated
- [Reference → mqtt](/reference/config/mqtt/) — the `mqtt {}` block
