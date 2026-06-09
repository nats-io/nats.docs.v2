---
id: priority-groups
title: "10. Priority groups"
sidebar_position: 11
description: Steer which client on a pull consumer gets messages, and when
---

# 10. Priority groups

The worker pool on the previous page shared work evenly. Every worker on
the `shipping` consumer pulled, and the server handed out messages to
whoever asked. Fair, simple, and exactly what you want most of the time.

Some workloads are not most of the time. Sometimes you want one client to
do all the work until it falls over. Sometimes you want a far-away client
to stay idle unless the near ones are drowning. Plain work sharing cannot
express either preference.

**Priority groups** are how a pull consumer expresses those preferences.
They are designed in [ADR-42](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-42.md), and this page works
through the two you will reach for first.

## What a priority group is

A priority group is a named label on a pull consumer, plus a policy that
decides how the server serves pulls for that label.

You set two fields when you create the consumer:

- **`PriorityGroups`** — the list of group names the consumer supports.
  Today a consumer acts on exactly one group; naming more than one is
  accepted but only the first takes effect (see Pitfalls).
- **`PriorityPolicy`** — the rule the server applies: `overflow`,
  `pinned_client`, or `prioritized`.

Once a consumer has a policy, every pull must name its group. A pull
that omits the group is rejected with `priority group is required for
priority consumer`. The group on the pull and the group on the consumer
have to match.

That is the whole shape: a named group on the consumer, a policy that
governs it, and pulls that opt into the group by name. The rest of this
page is the two policies and the problem each one solves.

## The overflow policy

Picture two regions both able to process orders. `us-east` is close to
the stream and cheap to serve. `us-west` works too, but every message it
pulls crosses the country, costs more, and arrives slower. You want
`us-west` to sit quiet — unless `us-east` falls behind.

The **overflow** policy expresses exactly that. Workers in `us-east`
pull with no threshold, so they always get messages. Workers in
`us-west` pull with a `min_pending` threshold: the server serves their
pull only when the consumer has at least that many messages waiting.
Below the threshold their pull sits idle, the same as if the stream were
empty.

Create an overflow consumer on the `ORDERS` stream:

```bash
nats consumer add ORDERS dispatch --overflow-groups regions --ack explicit --pull --defaults
```

The `--overflow-groups regions` flag sets the policy to `overflow` and
names the single group `regions`. Confirm it:

```bash
nats consumer info ORDERS dispatch
```

The configuration now carries the two priority fields:

```
Configuration:

              Pull Mode: true
             Ack Policy: Explicit
         Priority Policy: overflow
          Priority Groups: [regions]
```

The threshold lives on the pull request, not on the consumer. A
near-region worker pulls plainly. A far-region worker adds `min_pending`
— deliver only when the consumer has backed up past that many waiting
messages. (`min_ack_pending` is the sibling threshold, measured against
unacknowledged messages instead; either one being met triggers
delivery.)

The natscli `nats consumer next` command issues a plain pull and has no
flag for these thresholds, so the overflow pull is shown from a client
library:

<div class="nats-example" data-type="learn-jetstream-priority-groups-overflowPull" data-languages="cli,js,go,python,java,rust,csharp"></div>

The near-region worker, pulling without a threshold, drains the stream
as fast as it processes. The far-region worker wakes only when the
backlog crosses its `min_pending` line, takes the overflow, and goes
quiet again once the near worker catches up.

:::note Standby failover is designed but not yet shipped
ADR-42 describes a `failover` field on the overflow policy — a timer
that lets a standby region step in after a few seconds with no nearby
pulls, even below the threshold. As of NATS Server 2.14 the server
silently ignores `failover`. Treat it as planned, not working, and do
not build on it until a later server release.
:::

## The pinned_client policy

The overflow policy spreads work under load. The **pinned_client**
policy does the opposite: it funnels all work to one client and keeps a
standby ready to take over.

Picture an order pipeline that must process strictly in arrival order.
Two clients run for resilience, but only one may work at a time, or the
ordering breaks. You want one active client and one waiting in the
wings.

The server picks one waiting pull and **pins** it. That client becomes
the active recipient. Every other client's pull stays parked as a
standby. If the pinned client stops pulling — it crashed, or it went
quiet longer than the pin timeout allows — the server pins a standby
instead.

Create a pinned consumer:

```bash
nats consumer add ORDERS sequencer --pinned-groups ordered --pinned-ttl 90s --ack explicit --pull --defaults
```

Two flags do the work. `--pinned-groups ordered` sets the policy to
`pinned_client` and names the group `ordered`. `--pinned-ttl 90s` sets
how long the server waits for a pull from the pinned client before it
gives up and pins someone else.

The pin timeout has to sit comfortably above the pull's `expires` value.
The pinned client needs time to pull, get its batch or time out, process,
then pull again — all before the timeout fires and costs it the pin. The
server's default timeout is two minutes; keep `expires` under a minute
and the cycle fits.

Here is how a client earns and keeps the pin:

<div class="nats-example" data-type="learn-jetstream-priority-groups-pinnedClient" data-languages="cli,js,go,python,java,rust,csharp"></div>

The handshake is header-driven. When the server pins a client, the first
message it delivers carries a `Nats-Pin-Id` header. The client reads that
ID and echoes it on every later pull. The server keeps serving the client
that presents the matching ID, and parks everyone else.

The client gives up the pin in one of two ways. If it falls silent past
the timeout, the server pins a standby and the old client's next pull —
still carrying the now-stale ID — comes back with a `423` status. The
client clears its stored ID and pulls plain again, rejoining the standby
pool. The exact `423` rules and the pinned/unpinned advisories are in the
[Consumer API reference](/reference/jetstream/api/consumer/info).

The other way is an operator forcing a switch. `nats consumer unpin`
clears the current pin and makes the server choose again:

```bash
nats consumer unpin ORDERS sequencer ordered
```

The command takes the stream, the consumer, and the group name. It
reports the client it dropped:

```
Unpinned client <client-id> from Priority Group ORDERS > sequencer > ordered
```

To check who is pinned without forcing a change, read the consumer's
state. `nats consumer info ORDERS sequencer` shows the live pin in its
`State` block:

```
State:

          Priority Groups: ordered: pinned <client-id> at 2026-06-02T10:14:22Z
```

A group with no active client reads `No client`. To list every fully
pinned consumer in one shot, `nats consumer find ORDERS --pinned`.

:::note Client support varies
The pinned-client handshake — storing `Nats-Pin-Id`, echoing it, handling
the `423` — is implemented in the Go and Java clients today. Other clients
expose the configuration fields but may not yet drive the client-side
pinning loop. Check your client's reference before relying on it.
:::

A third policy, `prioritized`, also exists — pulls carry a `0`–`9`
priority and the server serves lower numbers first — but `overflow` and
`pinned_client` cover the common cases, so this page stops there. The
full set of priority-group options — every field including
`prioritized`, the `423` protocol, the `PriorityGroupState` shape, and
the advisories — is documented in
[Reference → Consumer API](/reference/jetstream/api/consumer/info) and in
[ADR-42](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-42.md).

## Pitfalls

Priority groups have a small surface, but a few traps catch people who
read the happy path and stop there.

**One group per consumer.** A consumer acts on exactly one priority
group today. The `--overflow-groups` and `--pinned-groups` flags take a
comma list, so passing two looks legal — and the server accepts it — but
it silently uses only the first group and ignores the rest. Multiple
groups per consumer is reserved for a future server release. To split
work by region or tier now, run separate consumers on the same stream,
each with its own group, rather than reaching for multiple groups on
one.

<div class="nats-example" data-type="learn-jetstream-priority-groups-oneGroup" data-languages="cli,js,go,python,java,rust,csharp"></div>

**`failover` is designed, not shipped.** As the overflow section noted,
the `failover` timer from ADR-42 is silently ignored by NATS Server 2.14
— no field parses it, and no error tells you. The trap for developers:
a pull that relies on `failover` to step in below the threshold simply
never fires. Use only `min_pending` and `min_ack_pending` for now, and
treat `failover` as planned.

**The pin is not a lock.** The server can switch the pinned client while
that client still believes it holds the pin — a long-running handler can
finish work the server already reassigned. Do not treat the pin as
exclusive ownership. A pull that carries a now-stale `Nats-Pin-Id` comes
back with a `423`; clear the stored ID and pull plain to rejoin the
standby pool. If processing must never double up, lean on explicit acks
and idempotent handlers, not on the pin alone.

**A quiet pinned client keeps the pin.** The pin only resets when the
pinned client pulls again within `--pinned-ttl`. A client that holds the
pin but stops pulling — blocked on a slow handler, say — keeps every
other client parked until the timeout fires. Keep each pull's `expires`
comfortably under the pin timeout so the client always pulls again in
time to renew. The cluster mechanics behind which node serves these
pulls are covered in [clustering](/learn/clustering).

## Where you are

You now have:

- The `shipping` consumer and its worker pool from the last page.
- An understanding that priority groups steer which client on a pull
  consumer gets served, governed by a named group plus a policy.
- The `overflow` policy demonstrated — a standby region that pulls only
  above a `min_pending` threshold.
- The `pinned_client` policy demonstrated — one active client, the
  `Nats-Pin-Id` handshake, and failover to a standby on timeout or
  `nats consumer unpin`.

## What is next

A consumer does not have to be running at all. The next page pauses a
consumer — stops it delivering for a set window — and shows when that is
the right tool.

## See also

- [Reference → Consumer API](/reference/jetstream/api/consumer/info) —
  the priority-group config fields, the `prioritized` policy,
  `PriorityGroupState`, the `423` protocol, and the pinned/unpinned
  advisories.
- [ADR-42](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-42.md) — the design of pull consumer priority
  groups.
- [9. A pool of workers](/learn/jetstream/worker-pool) — the even
  work-sharing this page steers away from.
