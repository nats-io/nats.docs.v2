---
id: subject-mapping
title: "Subject mapping"
sidebar_position: 9
description: How the server rewrites a message's subject from its own config before routing — to rename a subject, split its traffic by weight, or shard it into stable buckets by a hashed token
---

# Subject mapping

Every message so far has kept the subject its publisher gave it: a client
publishes `orders.created`, and the server routes it to whoever subscribed to
`orders.created`. Subject mapping breaks that one-to-one link. The server
rewrites a message's subject the moment it arrives, before it looks for
interested subscribers, and it does the rewrite from its own configuration —
the publisher sends the same command and never sees the change.

Acme has a use for that today. Its old mobile app still publishes new orders
to `orders.placed`, but every service moved to `orders.created` several pages
ago. Instead of shipping a new app build, Acme tells the server to map
`orders.placed` onto `orders.created`. The app keeps publishing
`orders.placed`; the packers and analytics keep subscribing to
`orders.created`; the server joins the two.

This is the account-level subject mapping that the JetStream chapter points
back to. It's different from a stream's subject transform or its republish
setting: those rewrite subjects as a message enters or leaves a JetStream
stream, and you configure them on the stream. Server-side mapping runs earlier,
on plain core subjects, before any stream is involved. For the stream side, see
[Subject mapping and transforms](/learn/jetstream/subject-mapping); this page
stays on the core, server-config side.

## Rename a subject

A **subject mapping** is a rule in server configuration that rewrites one
subject to another. You give the server a source subject and a destination
subject; when a message arrives on the source, the server delivers it as if the
publisher had named the destination.

Mapping lives in the server's configuration file, so this is the first page in
the chapter that needs one. Earlier pages started the server with a bare
`nats-server`; from here you write a small config file and start the server
with `nats-server -c server.conf`. A config file that renames Acme's legacy
subject looks like this:

```bash
# server.conf
mappings {
  orders.placed: orders.created
}
```

```bash
nats-server -c server.conf
```

Now a publisher to `orders.placed` reaches every subscriber on
`orders.created`. The publisher's command doesn't change, and it gets no signal
that a mapping exists — the rewrite happens on the server, on the way in.

The top-level `mappings` block belongs to the server's built-in account, so
on a plain server with no accounts or authentication it covers every client.
Mapping is always scoped to an account: with several accounts configured, each
has its own mappings and they never cross the account boundary.

The `mappings` block is reloadable. Edit `server.conf` and run
`nats-server --signal reload` to apply the change without restarting; the
signal tells the running server to re-read its config, and open connections
stay up.

## Preview a mapping before you apply it

You don't have to change a running server to see what a mapping does.
`nats server mappings` takes a source, a destination, and a subject, runs the
same transform code the server uses, and prints the result — with no server and
no connection.

<div class="nats-example" data-type="learn-core-nats-subject-mapping-test-mapping" data-languages="cli"></div>

```
orders.created

orders.us.created
```

The second command shows a **token reference**: `{{wildcard(1)}}` in the
destination stands for the token the first single-token wildcard matched in the
source. Source `orders.legacy.*` matched `us`, so the destination
`orders.{{wildcard(1)}}.created` filled in as `orders.us.created`. You number
wildcards left to right, so `{{wildcard(2)}}` would be the second `*`.

## Split traffic by weight

A mapping can send a fraction of matched messages to a different subject. A
**weighted mapping** lists several destinations, each with a weight from 0 to
100, and the server picks one per message at random in proportion to the
weights.

Acme is testing a new packer build. It wants a tenth of new orders handled by
the canary and the rest handled normally, so it maps `orders.created` and gives
the canary a weight of 10:

```bash
# server.conf
mappings {
  orders.created: [
    { destination: orders.created.canary, weight: 10 }
  ]
}
```

The weights you list add up to 10, not 100. The server sends the remaining 90
out of every 100 messages to the source subject unchanged, so the packers
already on `orders.created` keep handling most orders while the canary on
`orders.created.canary` samples the rest. Whenever your listed weights total
less than 100, the leftover share stays on the original subject.

To split between two new subjects instead, list both and make the weights total
100 — 50 and 50, say, for an even A/B test where nothing stays on the original.
If you want the leftover share dropped rather than kept — to test how a
subscriber copes with loss — list the source subject itself as a destination,
which tells the server your weights are final and stops it topping them up.
This works because the source here is a literal subject.

The split is per-message and random, the same way a queue group picks a member:
over a few messages it can look lopsided, and over thousands it converges on the
weights you set. Each weight must be 100 or less, and the weights for one source
must total 100 or less, or the server rejects the config.

## Partition by a token

A weighted mapping spreads messages at random across its destinations.
**Partitioning** spreads them deterministically instead: it routes each message
by hashing one of its tokens into a fixed bucket, so the same token value always
lands in the same bucket. In a destination, `{{partition(n, 1)}}` stands for
that bucket — it hashes the token the first single-token wildcard matched into
one of `n` buckets, numbered `0` to `n-1`.

Acme wants each order handled by one fixed packer pool, so everything about an
order stays together: one pool's cache, no coordination between pools. The order
id decides the pool, which means the id has to be in the subject. So the app
publishes new orders with the id as the last token, like
`orders.created.ord_8w2k`, and Acme splits them into three buckets by hashing
that id:

```bash
# server.conf
mappings {
  "orders.created.*": "orders.created.{{partition(3, 1)}}.{{wildcard(1)}}"
}
```

The source `orders.created.*` matches any order id in the last token. The
destination builds a new subject: `{{partition(3, 1)}}` becomes the bucket for
that id, and `{{wildcard(1)}}` carries the id itself through. So
`orders.created.ord_8w2k` becomes `orders.created.0.ord_8w2k`.

The bucket is deterministic, so `nats server mappings` tells you exactly where
an id lands before you commit the config:

```bash
nats server mappings "orders.created.*" "orders.created.{{partition(3, 1)}}.{{wildcard(1)}}" orders.created.ord_8w2k
```

```
orders.created.0.ord_8w2k
```

Change the id and the bucket changes with it: `ord_7mn3` maps to
`orders.created.1.ord_7mn3`, and `ord_2zr9` to `orders.created.2.ord_2zr9`.
Feed the same id twice and you get the same bucket both times — that's what
makes it safe to route on.

Each pool subscribes to its own bucket. The packers for bucket 0 subscribe to
`orders.created.0.*` under a shared queue group; buckets 1 and 2 have their own
pools on `orders.created.1.*` and `orders.created.2.*`.
[Queue groups](/learn/core-nats/queue-groups) share the work inside a bucket;
the partition decides which bucket. Because the mapping rewrites the subject
before the server routes it, the pools subscribe to the bucket subjects, not to
`orders.created.*` — a subscriber still on the pre-map `orders.created.ord_8w2k`
receives nothing, because the server moved the message to a bucket subject
before matching interest.

`partition` and `wildcard` cover almost every core mapping. The transform
language has more functions — `split`, `slicefromleft`, and others reshape a
single token — and streams use the same set, so the full list lives with
[the transform language](/learn/jetstream/subject-mapping#the-transform-language).

## Cluster-scoped destinations

A destination can carry a `cluster` field. The mapping then applies only to
messages published through a server in that named cluster, and a server falls
back to the unscoped mapping when none matches its cluster. That lets one source
map differently in different regions, so it only matters once you run more than
one cluster — see [Super-clusters](/learn/topologies/super-clusters). A single
server has one scope and doesn't need it.

## Try it

Put the partition mapping on a real server and watch orders fall into buckets.
Save the config and start the server with it:

```bash
# server.conf
mappings {
  "orders.created.*": "orders.created.{{partition(3, 1)}}.{{wildcard(1)}}"
}
```

```bash
nats-server -c server.conf
```

Then open one subscriber per bucket and publish three orders:

<div class="nats-example" data-type="learn-core-nats-subject-mapping-partition-demo" data-languages="cli"></div>

Each order arrives at exactly one bucket: `ord_8w2k` at bucket 0, `ord_7mn3` at
bucket 1, `ord_2zr9` at bucket 2. Publish `orders.created.ord_8w2k` again and it
returns to bucket 0 — the hash doesn't drift.

## Pitfalls

**A mapping quietly changes who receives what.** The server rewrites the subject
before it checks interest, so a mapping can pull messages away from subscribers
still listening on the original subject. Map `orders.created` entirely onto a
new subject and the packers on `orders.created` go silent — every order lands
somewhere else, with no error and no warning. Before you map a subject that
services already use, check what subscribes to it, and keep a share on the
original (the weighted remainder is one way) if those subscribers still need it.

**Weights under 100 keep the rest, they don't drop it.** List one destination at
weight 10 and it's easy to assume the other 90 percent disappears. It doesn't:
the server routes that 90 percent to the source subject. If you really want the
remainder dropped — say, to test loss — list the source subject itself as a
destination so the server treats your weights as final. This only works for a
literal source like `orders.created`.

**A partition count is part of the subject contract.** Which bucket an order
lands in depends on `n` in `partition(n, ...)`. Raise `partition(3, ...)` to
`partition(4, ...)` later and the same order id can hash to a different bucket,
so a pool's subject filter silently starts covering a different set of orders.
Pick the bucket count once, up front, the way you would for any sharded system.

## Where you are

Your running session picked up its first configuration file:

- The one local `nats-server` now starts with `nats-server -c server.conf` and
  reloads with `nats-server --signal reload`.
- A mapping bridges the legacy `orders.placed` publisher onto `orders.created`,
  with nothing changed in the app.
- The server can also split a subject's traffic by weight, or shard it into
  fixed buckets by a hashed token, all before any subscriber is chosen.

The subject a publisher writes is no longer always the subject a subscriber
matches — the server config sits in between.

## What's next

Every publish and subscribe so far assumed the connection to the server was
just there. The next page,
[Connection lifecycle](/learn/core-nats/connection-lifecycle), looks at that
connection directly: what happens to your client and its in-flight messages when
the link drops, and how to watch it reconnect.

## See also

- [Subject mapping and transforms](/learn/jetstream/subject-mapping) — the
  stream side: transforms that rewrite subjects into a stream, and republish
  that emits them back out.
- [Reference → mappings](/reference/config/mappings) — the config keys
  `destination`, `weight`, and `cluster`, and their exact rules.
- [Queue groups](/learn/core-nats/queue-groups) — the pools that share the work
  inside each partition bucket.
- [Super-clusters](/learn/topologies/super-clusters) — cluster-scoped
  destinations across regions.
