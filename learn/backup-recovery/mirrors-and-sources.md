---
id: mirrors-and-sources
title: Mirrors as a DR tool
sidebar_position: 3
description: Stand up a cross-site mirror of ORDERS in its own JetStream domain, read its lag, and learn why a mirror is not a backup
---

# Mirrors as a DR tool

The last page gave you a **snapshot**, a point-in-time copy of `ORDERS`
you can restore from. A snapshot gets back the data as it stood at the
moment you took it. The data written since then is gone, and a restore
takes as long as it takes to stream the archive back in.

This page adds the second tool: a **mirror**. A mirror is a read-only live
copy of `ORDERS` at a second site, kept current by replication. A snapshot
answers "what point can I return to", and a mirror answers "what site can I
promote to take over". You'll set one up, read how far it trails the
original, and see where its protection ends.

This page applies a mirror to disaster recovery. How a mirror replicates
(start position, subject filters, sourcing) is covered in
[Mirrors & sources](/learn/jetstream/mirrors-and-sources).

## A mirror is a live copy at a second site

So far `ORDERS` lives on the `east` cluster. If the whole site fails, every
replica of `ORDERS` fails with it. R3 replication protects you from losing
one server, not from losing the cluster.

A mirror lives somewhere else. The second site is a cluster called `west`.
On `west` you create a stream that copies `ORDERS` from `east`. It accepts
no writes of its own; it stores every message the `east` stream stores. The
stream it copies from is its **upstream**. The copy flows one way, from the
upstream to the mirror.

## Keep the two sites independent

A mirror only helps if `west` keeps working when `east` is gone. That
decides how you connect the two clusters:

- **Each cluster is its own JetStream domain.** A **JetStream domain** is a
  set of servers with its own meta group, the RAFT group that holds all stream
  and consumer assignments. With `east` and `west` in separate domains,
  losing `east` doesn't touch the control plane of `west`, and you can edit
  streams in `west` during the outage.
- **`west` connects to `east` as a leaf node.** The leaf connection carries
  ordinary subjects and the other domain's JetStream API, which is
  reachable as `$JS.east.API` from `west` and `$JS.west.API` from `east`.

If both clusters shared one meta group, for example as two clusters of a
super-cluster without domains, losing `east` could also cost the meta
group its majority. Then no stream can be edited anywhere, including the
promotion of the mirror. That design needs a third cluster to keep the
quorum; see
[Resilient cross-region clusters](../topologies/resilient-cross-region-clusters.md).

The domain is set in each server's `jetstream` block. On `east`:

```conf
jetstream {
  store_dir: "/data/jetstream"
  domain: east
}

# west's servers connect here as leaf nodes
leafnodes {
  listen: 0.0.0.0:7422
}
```

On `west`, each server sets its own domain and a leaf connection to `east`
in the `ORDERS` account:

```conf
jetstream {
  store_dir: "/data/jetstream"
  domain: west
}

leafnodes {
  remotes: [
    {
      urls: [
        "nats-leaf://n1-east:7422"
        "nats-leaf://n2-east:7422"
        "nats-leaf://n3-east:7422"
      ]
      # the local account the leaf traffic joins
      account: ORDERS
      # a user in the ORDERS account on east
      credentials: "/etc/nats/orders-leaf.creds"
    }
  ]
}
```

Leaf nodes and domains are covered in
[Leaf nodes](/learn/topologies/leaf-nodes).

## Use the same stream name at both sites

Name the mirror `ORDERS`, the same as the upstream. Stream names are per
domain, so the two don't collide. After a failover, clients reconnect to
`west` and find a stream called `ORDERS`, with no change to their
configuration.

## Create the mirror

The mirror reads `ORDERS` in the `east` domain. Its configuration says
where the upstream is with an `external` block, the API prefix of the other
domain. Write it to a file, `orders-mirror-of-east.json`:

```json
{
  "name": "ORDERS",
  "storage": "file",
  "num_replicas": 3,
  "allow_direct": true,
  "mirror_direct": true,
  "mirror": {
    "name": "ORDERS",
    "external": { "api": "$JS.east.API" },
    "consumer": { "name": "mirror-west", "deliver_subject": "_mirror.ORDERS.west" }
  }
}
```

The mirror has no `subjects`. It listens on nothing, so it can't take a
write by mistake.

The `consumer` block makes it a **durable mirror** (NATS 2.14 and later).
By default a mirror creates a temporary consumer on the upstream for
itself. A durable mirror instead reads through a named consumer on the
upstream, which keeps the mirror's position when the upstream cluster goes
down and comes back. Create that consumer on `east` first, then the mirror
on `west`:

```bash
# On east: the durable consumer the mirror reads through.
nats --context east consumer add ORDERS mirror-west \
  --target _mirror.ORDERS.west \
  --ack flow_control --flow-control --heartbeat 1s \
  --deliver all --defaults

# On west: the mirror itself.
nats --context west stream add ORDERS --config orders-mirror-of-east.json
```

The consumer uses the `flow_control` ack policy, which needs a push
consumer with flow control and a heartbeat. The mirror acknowledges through
the flow-control messages, so the consumer's ack floor is the mirror's
position. A durable consumer remembers what it delivered, so create a new
one whenever you create a mirror from scratch; otherwise the new mirror
starts where the old one stopped.

`mirror_direct` lets the mirror answer Direct Get requests, so reads in
`west` are served by `west`. Direct Get is covered in
[Get direct](/learn/jetstream/get-direct).

Decide this setup before you create the mirror. You can't re-point a
mirror at a different upstream or change what it copies; to change it, you
delete the mirror and create it again.

## How writes and reads flow

In normal operation there's one stream that accepts writes, `ORDERS` on
`east`. A publish to `orders.created` from a client connected to `west`
crosses the leaf connection and is stored by `east`:

```bash
nats --context west req orders.created '{"order_id":"ord_8w2k"}'
```

```
{"stream":"ORDERS","domain":"east","seq":1}
```

The acknowledgment names the `east` domain. All writes go through one
stream, in one order. The mirror copies each message with its original
sequence number, so `seq 1` on `east` is `seq 1` on `west`.

Reads in `west` stay local. A Direct Get for a message is answered by the
mirror:

```bash
nats --context west stream get ORDERS --last-for orders.created
```

<div class="nats-flow" data-scenario="mirrorDRAnimated" data-width="600" data-height="350"></div>

The animation shows the steady state: `order-svc` writes to `ORDERS` on
`east`, and each message replicates to the mirror on `west`.

## Lag is how far the mirror trails

Replication isn't synchronous. The upstream stores a message and
acknowledges the publisher before the mirror has it. The gap is the
mirror's **lag**: how many messages it trails behind its upstream.

Read it from the mirror's stream info:

```bash
nats --context west stream info ORDERS
```

The output has a `Mirror Information` section:

```
Mirror Information:

  Stream Name: ORDERS
  External API: $JS.east.API
          Lag: 0
    Last Seen: 1.20s
```

`Lag` is the number of messages the upstream has that the mirror doesn't.
`Last Seen` is how long ago the mirror last heard from the upstream.

Read the two together. The mirror computes `Lag` from the last message it
received, which reports how many more the upstream has pending. When the
upstream stops answering, no more messages arrive and `Lag` keeps its last
value, often `0`, while `Last Seen` grows. So `Lag: 0` only means the
mirror is caught up when `Last Seen` is small, a second or two.

These numbers are your **RPO**, the recovery point objective: how much data
you lose if the upstream is gone. With a healthy link it's the lag. Once
the link is down, it's everything the upstream stored after `Last Seen`,
and the mirror can't tell you how much that is.

Watch both fields continuously rather than checking them once. The server
exposes them through its monitoring endpoints for an alert to scrape; in
the JSON the last-seen field is named `active`. Setting that up is covered
in [Monitoring](/learn/monitoring).

## A mirror is not a backup

A mirror follows the upstream's live writes. A corrupt write lands in the
mirror too, and a mirror keeps no earlier state to rewind to.

A mirror gives you **availability**. Lose the whole `east` site and the
mirror on `west` still holds your orders, ready to take over. That shortens
your **RTO**, the recovery time objective: how long recovery takes.

A mirror doesn't give you a point in time you can rewind to. Write a
corrupt batch and the corruption replicates as faithfully as a good write.
The mirror holds only what the upstream has now, and its own retention
limits can age messages out on their own schedule.

An upstream delete or purge behaves differently from what people expect.
Delete `ORDERS` on `east` and the mirror isn't deleted with it: it keeps
every message it had copied, stops receiving new ones, and records the
fault in the `Error` field of its Mirror Information. Purge a range on the
upstream and the messages the mirror already stored stay; the mirror only
skips what it hadn't received yet. So a mirror can outlive a mistake on the
upstream, but only as a copy frozen at the break, never as a point in time
you chose.

A snapshot is fixed at the moment you took it, so a later delete or
corruption can't affect it, and you can rewind to it. The two tools cover
different failures, and you need both:

- **Mirror:** the site failed. Promote the copy and redirect traffic to it.
  Short RTO, data loss bounded by the lag at the time of the failure.
- **Snapshot:** the data is wrong (deleted, purged, corrupted). Restore the
  point in time before it went wrong.

R3 replication is neither. It keeps `ORDERS` available when one server of
`east` fails, and a corrupt write replicates to all three replicas.

## Pitfalls

**A mirror is not a backup.** Corrupt data replicates into the mirror, and
an upstream delete leaves the mirror frozen where replication stopped. Pair
the mirror with snapshots.

**Don't trust `Lag: 0` without `Last Seen`.** When the upstream is down,
`Lag` keeps its last value while `Last Seen` grows. Check both, and alert on
`Last Seen`.

**Don't share a meta group between the sites.** If the mirror's cluster
depends on a meta group that loses its majority with the upstream site, you
can't promote the mirror. Put each site in its own JetStream domain.

**Create a new durable consumer for each new mirror.** A durable consumer
keeps its position. A mirror created from scratch on an old consumer starts
where the old mirror stopped, not at the start of the upstream.

**A mirror's config is fixed after creation.** You can't re-point it or
change what it copies; delete it and create it again.

**Avoid a Work Queue upstream.** The mirror's consumer on the upstream
bypasses the work queue's check for overlapping consumers, so a worker and
the mirror can both receive the same message. Use `Limits` retention on the
upstream. Retention policies are covered in
[Mirrors & sources](/learn/jetstream/mirrors-and-sources).

## Where you are

You now have:

- Two clusters in separate JetStream domains, `west` connected to `east` as
  a leaf node.
- An `ORDERS` mirror on `west`, copying `ORDERS` from `east` through a
  durable consumer, and answering reads locally.
- A way to read its `Lag` and `Last Seen`, and to tell a caught-up mirror
  from a stalled one.

What you don't have yet are the consumers at the DR site, which a mirror
doesn't copy, and the procedure for using the mirror when `east` fails.

## What's next

Continue to [Consumer DR](./consumer-dr.md).

## See also

- [Mirrors & sources](/learn/jetstream/mirrors-and-sources) — how a mirror
  replicates: start position, subject handling, and sourcing.
- [Consumer DR](./consumer-dr.md) — consumers at the DR site, which the
  mirror doesn't copy.
- [Leaf nodes](/learn/topologies/leaf-nodes) — the leaf connection between
  `west` and `east`, and JetStream domains.
- [Get direct](/learn/jetstream/get-direct) — `allow_direct` and
  `mirror_direct`.
- [Reference → Cross-account subjects](/reference/jetstream/cross-account-subjects)
  — the API and delivery subjects a cross-domain mirror uses.
