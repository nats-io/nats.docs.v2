---
id: priority-groups
title: "Priority groups"
sidebar_position: 11
description: Steer which client on a pull consumer gets messages, and when
---

# Priority groups

The [worker pool](/learn/jetstream/worker-pool) shared work evenly. Every
worker on the `shipping` consumer pulled, and the server delivered messages
to whichever worker asked.

Some workloads need a different split. You might want one client to
handle all the work until it fails, or a far-away client to stay idle
unless the near ones fall behind. Even work sharing can't do either of
those.

**Priority groups** let a pull consumer ask for those behaviors. They're
designed in [ADR-42](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-42.md). This page covers all three
policies the server offers.

## What a priority group is

A priority group is a name on a pull consumer, plus a policy that
decides how the server hands out messages for that name.

You set two fields when you create the consumer:

- **`PriorityGroups`**: the list of group names the consumer supports.
  Today a consumer uses exactly one group; naming more than one is
  accepted but only the first takes effect (see Pitfalls).
- **`PriorityPolicy`**: the rule the server applies, one of `overflow`,
  `pinned_client`, or `prioritized`.

Two of the three policies, overflow and pinned_client, need the consumer to
acknowledge its messages, so those examples use `--ack explicit`. They decide
what to do from counts the server keeps per client: overflow looks at how many
messages are waiting and unacknowledged, pinned_client at which client is
still pulling, and the server only keeps those counts when the consumer acks.
Prioritized just sorts pulls by a number and needs no acks.

Once a consumer has a policy, every pull must name its group. A pull that
leaves the group out is rejected with `Bad Request - Priority Group missing`.
The group on the pull and the group on the consumer must match.

So a priority group is a name on the consumer, a policy that governs it,
and pulls that join the group by name. The rest of this page covers the
three policies and the problem each one solves.

## The overflow policy

Two regions can both process orders. `us-east` is close to the stream and
cheap to serve. `us-west` works too, but every message it pulls crosses
the country, costs more, and arrives slower. You want `us-west` to stay
idle unless `us-east` falls behind.

The **overflow** policy does this. Workers in `us-east` pull with no
threshold, so they always get messages. Workers in `us-west` pull with a
`min_pending` threshold: the server answers their pull only when the
consumer has at least that many messages waiting. Below the threshold
their pull gets nothing, the same as if the stream were empty.

<div class="nats-flow" data-scenario="priorityOverflowAnimated" data-width="640" data-height="340"></div>

Create an overflow consumer on the `ORDERS` stream from a config file:

```bash
nats consumer add ORDERS dispatch --config overflow-consumer.json
```

where `overflow-consumer.json` sets the policy and its single group:

```json
{
  "durable_name": "dispatch",
  "ack_policy": "explicit",
  "priority_policy": "overflow",
  "priority_groups": ["regions"]
}
```

The intended shorthand is `nats consumer add ORDERS dispatch --overflow-groups
regions --ack explicit --pull`, but through natscli v0.4.x that flag sets the
policy without attaching the group, so the server rejects the create with error
`10159`. Use `--config` until the fix ships. The pinned and prioritized creates
later on this page use their flags normally.

Confirm the consumer:

```bash
nats consumer info ORDERS dispatch
```

The configuration now carries the two priority fields:

```
Configuration:

              Pull Mode: true
             Ack Policy: Explicit
        Priority Policy: Overflow
        Priority Groups: regions
```

The threshold goes on the pull request, not on the consumer. A
near-region worker pulls with no threshold. A far-region worker adds
`min_pending`: deliver only when the consumer has backed up past that many
waiting messages. `min_ack_pending` is a related threshold, counted
against unacknowledged messages instead; meeting either one triggers
delivery.

The `nats consumer next` command issues a plain pull and has no flag for
these thresholds, so the overflow pull below comes from a client library:

<div class="nats-example" data-type="learn-jetstream-priority-groups-overflowPull" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

The near-region worker, pulling without a threshold, empties the backlog
as fast as it processes. The far-region worker gets messages only when the
backlog crosses its `min_pending` threshold, takes the overflow, and goes
idle again once the near worker catches up.

## The pinned_client policy

The overflow policy spreads work under load. The **pinned_client** policy
sends all work to one client and keeps a standby ready to take over.

Consider an order pipeline that must process messages strictly in arrival
order. Two clients run so that one can take over if the other fails, but
only one may work at a time, or the ordering breaks. You want one active
client and one standby.

The server picks one waiting pull and **pins** it. That client becomes the
one that receives messages. Every other client's pull waits as a standby.
If the pinned client stops pulling, because it crashed or went quiet
longer than the pin timeout allows, the server pins a standby instead.

<div class="nats-flow" data-scenario="priorityPinnedAnimated" data-width="640" data-height="360"></div>

Create a pinned consumer:

```bash
nats consumer add ORDERS sequencer --pinned-groups ordered --pinned-ttl 90s --ack explicit --pull --defaults
```

Two flags do the work. `--pinned-groups ordered` sets the policy to
`pinned_client` and names the group `ordered`. `--pinned-ttl 90s` sets
how long the server waits for a pull from the pinned client before it
gives up and pins someone else.

The pin timeout must sit comfortably above the pull's `expires` value. The
pinned client needs time to pull, get its batch or time out, process, then
pull again, all before the timeout fires and costs it the pin. The
server's default timeout is two minutes; keep `expires` under a minute and
the whole cycle fits.

The pinned client earns and keeps the pin like this:

<div class="nats-example" data-type="learn-jetstream-priority-groups-pinnedClient" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

The client and server agree on the pin through a header. When the server
pins a client, the first message it delivers carries a `Nats-Pin-Id`
header. The client reads that ID and sends it back on every later pull.
The server keeps serving the client that presents the matching ID and
parks the others.

The client gives up the pin in one of two ways. If it falls silent past
the timeout, the server pins a standby, and the old client's next pull,
still carrying the now-stale ID, comes back with a `423` status. The
client clears its stored ID and pulls without it, joining the standby
pool again. The `423` rules and the pinned and unpinned advisories are in
the [Consumer API reference](/reference/jetstream/api/consumer/info).

The other way is an operator forcing a switch. `nats consumer unpin`
clears the current pin and makes the server choose again:

```bash
nats consumer unpin ORDERS sequencer ordered -f
```

The command takes the stream, the consumer, and the group name; `-f` skips
the confirmation prompt. It reports the client it dropped:

```
Unpinned client <client-id> from Priority Group ORDERS > sequencer > ordered
```

To check who's pinned without forcing a change, read the consumer's
state. `nats consumer info ORDERS sequencer` shows the live pin in its
`State` block:

```
State:

          Priority Groups: ordered: pinned <client-id> at 2026-06-02 12:14:22
```

A group with no active client reads `No client`. To list every fully
pinned consumer at once, run `nats consumer find ORDERS --pinned`.

:::note Client support varies
The pinned-client steps (storing `Nats-Pin-Id`, sending it back, handling
the `423`) run in the Go, Java, JavaScript/TypeScript, and .NET clients today.
Rust and Python let you set the configuration fields but don't yet run the
client-side pinning loop. Check your client's reference before relying on it.
:::

## The prioritized policy

The overflow policy makes a standby wait for a backlog to build. Sometimes you
want the opposite: hand work to the next region the instant the closer one
stops asking, with no threshold and no delay.

`us-east` is close and cheap but resource-constrained. Whenever it has
capacity it should take the work; when it doesn't, `us-west` should pick up
right away, and `eu-west` only when neither US region is pulling. That's a
hierarchy, not a threshold.

The **prioritized** policy serves pulls in priority order. Each pull carries a
`priority` from `0` to `9`, and the server hands messages to the lowest number
present first; pulls at the same priority share round-robin. So `us-east`
pulls at priority `0`, `us-west` at `1`, and `eu-west` at `2`: work goes to
`us-east` whenever it's asking, falls to `us-west` the moment `us-east` isn't,
and reaches `eu-west` only when neither is pulling.

<div class="nats-flow" data-scenario="priorityPrioritizedAnimated" data-width="640" data-height="360"></div>

Create a prioritized consumer:

```bash
nats consumer add ORDERS dispatch --prioritized-groups regions --pull --defaults
```

`--prioritized-groups regions` sets the policy to `prioritized` and names the
single group `regions`. Unlike the other two policies, prioritized keeps no
per-client counts, so it doesn't require explicit acks.

This reuses the `dispatch` name from the overflow example on purpose: overflow
and prioritized are two ways to run the same regional-dispatch consumer, so you
pick one. The server does let you switch a live consumer's policy, though
`nats consumer edit` has no flag for it; you'd pass a full config with
`--config`.

The priority rides on the pull request, the same place overflow's thresholds
go, so `nats consumer next` can't set it and the pull comes from a client
library:

<div class="nats-example" data-type="learn-jetstream-priority-groups-prioritizedPull" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

This is the immediate counterpart to overflow. Overflow waits for the backlog
to cross a threshold before a standby gets anything, which avoids churn but
makes far regions wait. Prioritized shifts work the moment a higher-priority
puller goes quiet, with no delay, at the cost of some flip-flop as work moves
between regions.

The full set of priority-group options, the `423` protocol, the
`PriorityGroupState` fields, and the advisories live in
[Reference → Consumer API](/reference/jetstream/api/consumer/info) and in
[ADR-42](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-42.md).

## Pitfalls

Priority groups have a small surface, but a few details are easy to miss.

**One group per consumer.** A consumer uses exactly one priority group
today. The `--overflow-groups` and `--pinned-groups` flags take a comma
list, so passing two looks legal, and the server accepts it, but it uses
only the first group and ignores the rest. Multiple groups per consumer is
planned for a future server release. To split work by region or tier now,
run separate consumers on the same stream, each with its own group.

<div class="nats-example" data-type="learn-jetstream-priority-groups-oneGroup" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

**The pin does not give one client sole ownership.** The server can switch
the pinned client while that client still believes it holds the pin, so a
long-running handler can finish work the server already gave to someone
else. A pull that carries a now-stale `Nats-Pin-Id` comes back with a
`423`; clear the stored ID and pull without it to join the standby pool
again. If the same message must never be processed twice, use explicit
acks and handlers that are safe to run more than once, not the pin alone.

**A quiet pinned client keeps the pin.** The pin only resets when the
pinned client pulls again within `--pinned-ttl`. A client that holds the
pin but stops pulling, for example because it's stuck on a slow handler,
keeps every other client parked until the timeout fires. Keep each pull's
`expires` comfortably under the pin timeout so the client always pulls
again in time to renew. Which node in a cluster serves these pulls is
covered in [clustering](/learn/clustering).

## Where you are

A priority group is always one group plus a policy that decides how the server
hands out pulls: reach for `overflow` to spill work to a standby only under
load, `pinned_client` for one active worker with a standby ready to take over,
and `prioritized` for an immediate, lowest-first hierarchy across regions.

## What's next

A consumer doesn't have to be running at all. The next page pauses a
consumer, stopping it from delivering for a set window, and shows when
that's the right tool.

## See also

- [Reference → Consumer API](/reference/jetstream/api/consumer/info) —
  the priority-group config fields, `PriorityGroupState`, the `423`
  protocol, and the pinned/unpinned advisories.
- [ADR-42](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-42.md) — the design of pull consumer priority
  groups.
- [A pool of workers](/learn/jetstream/worker-pool) — the even
  work-sharing this page steers away from.
