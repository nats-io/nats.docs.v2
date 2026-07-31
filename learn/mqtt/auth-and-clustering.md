---
id: auth-and-clustering
title: "Auth and clustering"
sidebar_position: 5
description: Restrict a user to MQTT connections, authenticate devices in operator mode, and run MQTT on the east cluster
---

# Auth and clustering

Everything so far ran on one server with no credentials. Acme's sensors
are about to leave the lab, which raises two questions: how does a device
prove who it is, and what happens when the fleet outgrows a single
server.

## Restrict a user to MQTT

Users are shared across connection types. A username and password
defined in `authorization` works from an MQTT device, a NATS client, or
a WebSocket browser session, which is usually more access than a sensor
needs.

`allowed_connection_types` pins a user to the connection types you
intend:

```conf
authorization {
  users = [
    { user: order-svc, password: s3cr3t }
    {
      user: sensor
      password: "s3cret"
      permissions: { publish: { allow: ["sensors.>"] } }
      allowed_connection_types: ["MQTT"]
    }
  ]
}
```

Now `sensor` can connect over MQTT and nothing else. See it hold in
both directions. Over MQTT, the credentials work:

```bash
mosquitto_pub -h 127.0.0.1 -p 1883 -u sensor -P s3cret \
  -t "sensors/warehouse/cold-1/temp" -m "4.2"
```

Present the same credentials on port 4222 as a NATS client and the
connection is refused:

```bash
nats pub --user sensor --password s3cret sensors.test "4.2"
```

```
nats: error: nats: Authorization Violation
```

The option accepts a list, so a user that needs two kinds gets both:

```conf
allowed_connection_types: ["STANDARD", "MQTT"]
```

The full set of values is `STANDARD`, `WEBSOCKET`, `LEAFNODE`,
`LEAFNODE_WS`, `MQTT`, `MQTT_WS`, and `IN_PROCESS`. The `_WS` variants
cover the same protocol carried over WebSocket, so a browser-based MQTT
client needs `MQTT_WS` rather than `MQTT`. Omit
`allowed_connection_types` entirely and every type is allowed, which is
the default.

`allowed_connection_types` can also be written `connection_types` or
`clients`; they're aliases for the same option.

## Permissions for MQTT users

Permissions are written against converted subjects, as
[Topics and subjects](/learn/mqtt/topics-and-subjects#permissions-apply-to-the-subject)
covered. A device publishing `sensors/warehouse/cold-1/temp` needs
publish permission on `sensors.warehouse.cold-1.temp`.

Here's a complete single-server config with a locked-down MQTT user:

```conf
listen: 127.0.0.1:4222

jetstream {
  store_dir: "./js/mqtt-server"
}

authorization {
  sensor_perms = {
    publish:   { allow: ["sensors.>"] }
    subscribe: { allow: ["fleet.>", "fleet"] }
  }
  users = [
    {
      user: sensor
      password: "s3cret"
      permissions: $sensor_perms
      allowed_connection_types: ["MQTT"]
    }
  ]
}

mqtt {
  listen: 127.0.0.1:1883
}
```

The `subscribe` list carries both `fleet.>` and `fleet` so that a device
subscribing to the MQTT filter `fleet/#` gets both subscriptions the
server creates for it.

Before this listener faces real devices, put TLS on it. The `mqtt {}`
block takes its own `tls {}` map, separate from the one on the client
port:

```conf
mqtt {
  listen: 127.0.0.1:1883
  tls {
    cert_file: "./certs/mqtt-server.pem"
    key_file:  "./certs/mqtt-server.key"
  }
}
```

The options are the same as any other `tls {}` block — add `ca_file`
and `verify: true` for mutual TLS — and
[Security → Encryption](/learn/security/encryption) covers them.

The `mqtt {}` block can also carry its own `authorization {}` with a
username, password, or token scoped to the MQTT listener only, and its
own `no_auth_user`, which overrides the top-level one for MQTT
connections. That last one is the answer when device firmware can't
send credentials at all: it maps credential-less MQTT connections onto
one of the users defined in the top-level `users` list, so the fleet
gets that user's permissions while NATS clients keep their own rules.
Two limits apply: a listener-scoped username or token can't be combined
with a top-level `users` list, and `no_auth_user` doesn't work in
operator mode.

### You don't need to allow `$MQTT.sub.>`

A QoS 1 or 2 subscription is backed by a JetStream durable, and the
server delivers to it over an internal subject under `$MQTT.sub.`.

You don't have to grant permission for that subject. From server
2.12.3, an MQTT connection is implicitly allowed to subscribe to
`$MQTT.sub.` and `$MQTT.deliver.pubrel.` subjects: the allow-list check
is skipped for them. Before 2.12.3 — including 2.10 and 2.11, which this
chapter otherwise supports — you have to list `$MQTT.sub.>` in the
user's subscribe allow list, or every QoS 1 and 2 subscription fails
with `0x80` in the SUBACK. Configs written for those servers often still
carry the entry; on 2.12.3 or later it's harmless, and you can drop it.

Deny is still enforced. An explicit deny on `$MQTT.sub.>` stops the
server from creating the internal subscription, and QoS 1 and 2
subscriptions fail with a failure code in the SUBACK. So leave those
subjects out of your permission lists entirely: don't allow them
(unnecessary) and don't deny them (breaks QoS 1).

## Authenticating devices in operator mode

[Operator mode](/learn/security/operator-mode) authenticates NATS
clients with a challenge: the server sends a nonce and the client signs
it with the private key from its credentials file. MQTT clients can't do
that. There's nothing in the MQTT protocol that signs a server-supplied
nonce.

Operator mode handles this by treating the user JWT itself as the
credential. The device sends the JWT as the MQTT **password**, with any
non-empty username, and the server authenticates on the JWT alone.

Because the JWT travels as a bearer credential with no signature step,
the user has to be a **bearer** user. That takes two steps, since
accounts disallow bearer tokens by default. Here the devices live in
their own account, `SENSORS`, keeping their subjects separate from the
ORDERS workload:

```bash
nats auth account edit SENSORS --bearer
nats auth user add sensor SENSORS --bearer
```

Miss either one and the connection is refused: the server is waiting for
a nonce signature that MQTT can't produce, or the account still
disallows bearer tokens. The device sees a CONNACK with return code 5,
"not authorized" — MQTT clients get that rather than the
`Authorization Violation` error a NATS client would receive, so check
the CONNACK code rather than looking for that string.

A bearer credential has two consequences.
Anyone holding the JWT can connect as that user, since there's no key to
prove possession, so treat it like a password and put TLS in front of
it. And `no_auth_user` isn't compatible with operator mode at all — in
operator mode every connection needs a JWT.

## MQTT on a cluster

Devices connect to one server, but the fleet needs more than one. MQTT
runs on the `east` cluster with two changes to what you've already seen.

### `server_name` becomes required

A standalone server can go without `server_name`. Once the server has a
`cluster` or `gateway` block, MQTT requires it, and startup fails
otherwise:

```
mqtt requires server name to be explicitly set
```

Server names have to be unique across the cluster or super-cluster,
which the `east` cluster already satisfies with `n1-east`, `n2-east`,
and `n3-east`. Here's `n1-east` accepting MQTT connections:

```conf
server_name: n1-east
listen: 127.0.0.1:4222

jetstream {
  store_dir: "./js/n1-east"
}

cluster {
  name: east
  listen: 127.0.0.1:6222
  routes: [
    nats://127.0.0.1:6223
    nats://127.0.0.1:6224
  ]
}

mqtt {
  listen: 127.0.0.1:1883
}
```

Add the same `mqtt {}` block to `n2-east` and `n3-east`, giving each its
own MQTT port if they share a machine. A device can then connect to any
of the three.

### Stream replicas in a cluster

The streams holding MQTT state are replicated automatically once
JetStream is clustered, and you don't create them. The replica count is
derived from the `routes` you configured, not from how many servers
the cluster actually has: the server counts the addresses in its own
`routes` list, then clamps the result to between 1 and 3.

That distinction matters for the config above. `n1-east` lists two
routes, so its MQTT streams come up at `R=2`, not `R=3` — enough to
survive one server, but not what you'd guess from a three-node cluster.
If you want three replicas, either list all the peers in `routes` or set
it explicitly:

```conf
mqtt {
  listen: 127.0.0.1:1883
  stream_replicas: 3
}
```

`stream_replicas` overrides the derived value. Ask for more replicas
than the cluster can satisfy and the streams fail to create, which
surfaces as MQTT clients being unable to connect.

### MQTT on a leaf node

A leaf node close to the devices — on a factory floor, in a vehicle —
can serve MQTT too, and it doesn't have to run JetStream itself. The
standalone JetStream check doesn't apply once the server has a
`leafnodes` configuration; the leaf can use JetStream reachable through
its connection to the hub.

If the leaf runs its own JetStream under a domain, point MQTT at it:

```conf
mqtt {
  listen: 127.0.0.1:1883
  js_domain: "factory"
}
```

`js_domain` selects the JetStream domain MQTT stores its state in. Set
it to the leaf's local domain and sessions and retained messages stay
on the leaf, so local devices keep working when the link to the hub is
down. The domain is part of the session's storage identity, which is
also what keeps sessions in different domains from colliding.

### Two cluster caveats

**Retained messages are best-effort in a cluster.** They're stored in a
replicated stream available cluster-wide, but propagation isn't instant.
A publisher can retain a message on one server while a subscriber
connecting to a different server subscribes microseconds later and sees
nothing, because that server hasn't received it yet. When an
application depends on reading a retained value immediately, have it
connect to the server that produced it.

**Client-ID collision detection is slower in a cluster.** On one server,
a second connection with a live client ID evicts the first immediately.
Across a cluster the eviction travels between servers, so both
connections can be briefly alive at once. The detection still works;
it's just not instantaneous. Unique client IDs per device remain the
answer.

## Seeing your devices

The monitoring port knows about MQTT. With `http: 8222` in the config,
`/connz` can filter connections by MQTT client ID:

```bash
curl -s "http://127.0.0.1:8222/connz?mqtt_client=truck-17"
```

Each MQTT connection's record carries its client ID in the
`mqtt_client` field, and `/varz` has an `mqtt` section showing the
listener's resolved settings, including the JetStream domain in use.
This is the tool for the client-ID collision from the
[previous page](/learn/mqtt/qos-sessions-and-retained#two-devices-one-client-id):
filter on the suspect client ID and watch which remote address holds
the session between drops.
[Monitoring endpoints](/learn/monitoring/monitoring-endpoints) covers
the port itself.

## Pitfalls

**Leaving credentials off the MQTT listener.** With no `authorization`
block, any device that can reach port 1883 connects. Devices sit on
networks you control least, so put credentials and TLS on the MQTT
listener before it leaves a lab.

**Denying `$MQTT.sub.>`.** A permission set written to be restrictive
sometimes denies everything under `$MQTT.`, which silently breaks QoS 1
and 2 subscriptions — they fail in the SUBACK while QoS 0 keeps working,
so the fleet looks half-broken. Leave those subjects out of the list.

**Forgetting `--bearer` in operator mode.** The device presents a
perfectly valid JWT and is still refused with CONNACK return code 5.
The credential is fine; either the user isn't marked as a bearer or the
account still disallows bearer tokens. Both have to be set. Don't go
looking for an `Authorization Violation` in the client's output — MQTT
clients never receive that message, only the CONNACK code.

**Adding a cluster block without `server_name`.** The server starts fine
as a standalone and then refuses to start the moment you add clustering.
Set `server_name` on every server from the beginning and the problem
never appears.

## Where you are

Acme's fleet is now ready for production:

- a `sensor` user restricted to MQTT connections, with permissions
  written against converted subjects
- no `$MQTT.sub.>` entry needed, and none denied
- devices in operator mode authenticating with a bearer JWT sent as the
  MQTT password
- MQTT enabled on `n1-east`, `n2-east`, and `n3-east`, each with
  `server_name` set
- MQTT state replicated across the cluster, with retained messages
  best-effort and client-ID eviction slightly delayed

## What's next

That's the whole of MQTT support.
[Where to go next](/learn/mqtt/where-next) collects the model into one place and
points at the chapters that take each piece further.

## See also

- [Security → Authorization](/learn/security/authorization) — how
  publish and subscribe permissions are evaluated
- [Topologies → Your first cluster](/learn/topologies/your-first-cluster)
  — building the `east` cluster this page enables MQTT on
- [Reference → mqtt](/reference/config/mqtt/) — `stream_replicas` and
  the rest of the block
