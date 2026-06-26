---
id: queue-groups
title: "Queue groups"
sidebar_position: 5
description: Share one subject across a pool of subscribers, so each message is handled by exactly one of them
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Queue groups

So far every subscriber on a subject gets a copy of every message.
That's what you want for `notifications` and `analytics`: each of them
needs to see every order. It's not what you want for `warehouse`.

The warehouse does real work for each order: it picks a box, prints a
label, packs the items. One process can't keep up with a busy day. You
want a pool of packers, and you want each order packed by exactly one of
them, not zero and not two.

Plain pub/sub can't do that. Run three copies of the `warehouse`
subscriber and all three pack the same order. This page introduces the
NATS answer: the queue group.

## What a queue group is

A **queue group** is a set of subscribers on the same subject that share
a name. The server treats the whole group as one logical subscriber: for
each message, it picks exactly one member of the group and delivers to
that member alone.

The shared name is the **queue group name**. A subscriber joins a group
by subscribing to a subject *and* naming a group at the same time. Any
subscriber that names the same group, on the same subject, is in the same
group.

There's nothing to configure on the server. Your application picks the
queue group name, and it arrives with the subscription. The server
learns a group exists the moment its first member subscribes.

<div class="nats-flow" data-scenario="queueGroupAnimated" data-width="600" data-height="350"></div>

Watch each message (a moving dot) reach exactly one worker, even though
all of them subscribed. That single-delivery behavior is the whole point
of a queue group.

## Add the packers pool

Our running scenario carries over one `nats-server` from earlier pages,
with the `notifications` and `analytics` subscribers still running. Now
replace the single `warehouse` subscriber with a pool.

Each packer subscribes to `orders.created` and names the queue group
`packers`. The `--queue` flag is what turns a plain subscription into a
queue-group membership:

<div class="nats-example" data-type="learn-core-nats-queue-groups-queue-subscribe" data-languages="cli,js,go,python,java,rust,csharp"></div>

The queue group name here is `packers`. It's a plain string the
application chooses. Pick a name that says what the group does;
`packers` reads better in logs than `q1`.

## See the load balancing

Open three terminals and run the same `nats sub` in each, so you have
three packers in the `packers` group:

```bash
# Terminal 1, 2, and 3 — three members of the packers group
nats sub orders.created --queue packers
```

In a fourth terminal, publish a few orders:

```bash
nats pub orders.created '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
nats pub orders.created '{"order_id":"ord_2zr9","customer":"globex","total_cents":7800,"ts":"2026-05-22T10:14:25Z"}'
nats pub orders.created '{"order_id":"ord_4kp1","customer":"acme-co","total_cents":1500,"ts":"2026-05-22T10:14:29Z"}'
```

Each message lands in exactly one of the three terminals. Publish a dozen
more and they spread across the three packers. No packer sees a message
that another packer already took.

## How the server picks a member

The server keeps the live members of a group in a list. For each message,
it picks a random index into that list and delivers to that member. The
selection is uniform-random across the available members.

Random selection has one consequence: the server doesn't rotate fairly
through the members the way round-robin would. The same packer can be
chosen twice in a row, and over a handful of messages the split can look
lopsided. Over many messages it evens out.

> The wire-level `PUB`/`SUB`/`MSG` protocol is documented in
> [Reference → Client protocol](/reference/protocols/client). We only
> need the behavior here.

## Membership is dynamic

A packer joins the group by subscribing and leaves by unsubscribing or
disconnecting. Both happen with no configuration and no coordination
step.

Start a fourth packer while orders are flowing. It starts receiving its
share immediately, because the server includes it in the next random
pick. Stop a packer and the server drops it from the list; the next
message goes to one of the survivors.

This is what makes a queue group a good fit for an autoscaler. A pool
that grows to ten packers under load and shrinks to two overnight needs
no broker reconfiguration. Each instance subscribes on start and the
group resizes itself.

One limit belongs here, because core NATS is **at-most-once**: if the
server picks a packer and that packer dies *after* the message is
delivered to it, that message is gone. The server already handed it off;
it won't pick a second packer for the same message. Core NATS does not
retry delivery to another member.

Delivering work that must survive a worker crash (retry to a different
worker, no message lost) is a job for a durable work queue in
[JetStream](/learn/jetstream), not core NATS.

## Queue members and plain subscribers coexist

Here's the property that makes queue groups fit our scenario cleanly. A
queue group and a plain subscriber can listen to the same subject at the
same time, and they don't interfere.

`analytics` subscribes to `orders.created` with no queue group. The three
packers subscribe to `orders.created` in the `packers` group. For each
published order:

- `analytics` receives it: plain subscribers always get every message.
- exactly one packer receives it: the group gets one copy, shared.

The server runs the two distributions independently. The plain
subscription is a one-to-one fan-out, the group subscription is a
one-to-one-of-many pick, and the same message satisfies both.

This is exactly the split our scenario wants. Analytics must count every
order, so it stays a plain subscriber. Packing must happen once per
order, so it becomes a queue group. The same subject carries both
behaviors with no extra configuration.

You can confirm it. Keep the three `packers` terminals open, and in
another terminal subscribe plain:

```bash
# A plain subscriber alongside the packers group
nats sub orders.created
```

Publish an order. The plain terminal prints it, and exactly one of the
three packers prints it too.

## A group only shares within one subject

Membership is evaluated *after* subject matching. The server first finds
the subscriptions whose subject matches the message, then, among those,
applies the group pick. The name alone doesn't pull in members on a
different subject.

Two packers in a group named `packers`, one subscribed to `orders.created`
and one to `orders.shipped`, don't share load. They match different
subjects, so a message to `orders.created` is only ever considered for the
first one. The shared name does nothing across different subjects.

A queue group can subscribe with a wildcard, and then it load-balances
across everything that wildcard matches. A `packers` group on
`orders.*.created` (the regional subjects from the
[subjects page](/learn/core-nats/subjects-and-wildcards)) would spread
`orders.us.created` and `orders.eu.created` across its members. The group
shares load across the subjects its own subscription matches, and only
those.

## A note on placement across regions

When the same queue group has members in several clusters, the server
prefers a member in the publisher's own cluster before reaching across to
another region. That keeps work local and cuts cross-region traffic.

That behavior, geo-affinity for queue groups, belongs to multi-cluster
deployments, which this chapter doesn't set up. Our scenario is a single
local server, so every packer is equally local. See
[Topologies → Super-clusters](/learn/topologies/super-clusters) for how
it works once you span regions.

## Pitfalls

Queue groups are easy to mis-wire in ways the server reports no error
for. Watch for these.

**A typo in the queue group name makes a second group.** The server
matches members by the exact name string, so `packers` and `packer` are
two separate groups on the same subject. Both subscriptions succeed with
no warning, and each published order goes to one member of *each* group:
the work is double-handled instead of load-balanced. Give every member the
byte-for-byte identical name.

<div class="nats-example" data-type="learn-core-nats-queue-groups-typo-splits-group" data-languages="cli,js,go,python,java,rust,csharp"></div>

**Don't expect ordering or an even split across members.** The server
picks a member at random per message, not round-robin, so the same packer
can be chosen twice in a row and a short burst can look lopsided. It evens
out over many messages. If one packer must process `orders.created` for a
customer strictly in order, a queue group is the wrong tool. Keep that
work on a single subscriber.

**Make a packer's work safe to repeat.** Core NATS is at-most-once, so the
server does not redeliver after it hands a message off. The case to watch
for is the near-miss: a packer that's slow or briefly cut off can still be
doing work the publisher assumes was lost. Write each packer so handling the same
order twice is harmless (pack by `order_id`, skip an order already packed)
rather than assuming exactly one packer ever touches it. When you need the
server to retry a dropped message to another worker, that's a durable work
queue in [JetStream](/learn/jetstream), not core NATS.

## Where you are

Your running session now looks like this:

- One local `nats-server`, carried from earlier pages.
- A `packers` queue group on `orders.created`, load-balancing each order
  to exactly one packer, with members you can add and remove live.
- `analytics` still a plain subscriber on `orders.created`, seeing every
  order, undisturbed by the group.

You can do load-balanced *work* now. The piece you haven't seen is
load-balanced *requests*: many copies of a service answering on one
subject, each request handled once. That's a queue group applied to
request-reply, and it leads straight into the next pattern.

## What's next

The next page is [Scatter-gather](/learn/core-nats/scatter-gather): one
request, many responders, and gathering all the replies instead of taking
the first. You'll query three `shipping.quote` providers and pick the
best.

## See also

- [Core Concepts → Queue Groups](/concepts/queue-groups) — the
  five-minute overview of the same material.
- [JetStream → Learn](/learn/jetstream) — durable work queues, where a
  message survives a worker crash and is retried to another member.
- [Topologies → Super-clusters](/learn/topologies/super-clusters) —
  geo-affinity that keeps queue-group work in the publisher's region.
