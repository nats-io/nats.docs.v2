---
id: raft-and-leaders
title: "Raft and leaders"
sidebar_position: 3
description: How a NATS cluster reaches agreement — RAFT groups, leaders and followers, and the election that picks a leader on a quorum of votes
---

# Raft and leaders

The [previous page](/learn/clustering/forming-a-cluster) left you with a live
three-server cluster `east` (`n1-east`, `n2-east`, and `n3-east`) that
discovered itself from one seed route. The servers know about each other and
forward messages, but they don't yet agree on any shared state.

Plain `orders.created` traffic needs no agreement: a publish lands on one
server, gets forwarded, and is gone. Stored data is different. When the
`ORDERS` stream keeps three copies of every order, the three servers holding
those copies must agree on which orders exist and in what order, even while
one of them is down.

This page is about that agreement. It introduces two ideas: a **RAFT group**
is a set of servers that keep an identical log by consensus, and a **leader
election** is how a group picks the one server that drives the log.

## RAFT groups

NATS reaches agreement with **RAFT**, a consensus algorithm. A **RAFT group**
is a fixed set of servers (its **peers**) that maintain a single shared log
that all of them agree on. One peer is the **leader**; the rest are
**followers**. The leader is the only peer that accepts new entries; it copies
each entry to the followers, and the group advances together.

A cluster runs many RAFT groups at once, layered.

The first is the **meta group**: one cluster-wide RAFT group whose peers are
the servers themselves. Its log holds the cluster's *assignments* rather than your
data: which streams exist, how many replicas each has, and which
servers hold them. Its leader is the **meta leader**, the server that decides
where new streams and consumers are placed. Every server in `east` is a peer of
the meta group.

The rest are **per-asset groups**: every replicated stream gets its own RAFT
group, and so does every replicated consumer. The `ORDERS` stream running with
three copies is one RAFT group whose three peers are the three servers holding
those copies. Its leader, the **stream leader**, is the server that accepts
writes to `ORDERS` and replicates them.

So `east` holding one replicated `ORDERS` stream runs at least two RAFT groups
at once: the meta group across all three servers, and the `ORDERS` stream group
across its three peers. They're independent. The meta leader and the `ORDERS`
stream leader may be the same server or different servers, and a change to one
doesn't move the other.

You can see both. The meta group appears in the JetStream report (a system
command, so it needs the `SYS` user from the previous page):

```bash
nats server report jetstream --user sys --password sys
```

The report's second table is the `RAFT Meta Group Information`, and its
`Leader` column marks the meta leader:

```
│ Connection Name │ ID       │ Leader │ Current │ Online │ Active │ Lag │
├─────────────────┼──────────┼────────┼─────────┼────────┼────────┼─────┤
│ n1-east         │ N0TeytwJ │ yes    │ true    │ true   │ 0s     │ 0   │
│ n2-east         │ cJ6ynrck │        │ true    │ true   │ 940ms  │ 0   │
│ n3-east         │ h4QkFOiR │        │ true    │ true   │ 940ms  │ 0   │
```

All three servers are peers, `n1-east` is the meta leader, and each peer has
a short `ID` the RAFT layer uses instead of the server name.

The next page studies what `R=3` means for a write; here we only need the
stream's RAFT group to exist, so create `ORDERS` now:

```bash
nats stream add ORDERS --subjects 'orders.>' --replicas 3 --defaults
```

The create output (and `nats stream info ORDERS` from then on) describes the
stream's RAFT group in its `Cluster Information` block:

```
Cluster Information:
                         Name: east
                Cluster Group: S-R3F-jF1m3dMO
                       Leader: n2-east (5ms)
                      Replica: n1-east, current, seen 424µs ago
                      Replica: n3-east, current, seen 5ms ago
```

`Name` is the cluster the group lives in. `Cluster Group` is the RAFT group's
generated name: `S` for stream, `R3` for three peers, `F` for file storage,
then a random suffix — yours will differ. `Leader` is the stream leader, with
how long it's held the role in parentheses. Each `Replica` line shows a
follower peer, whether it's `current` (caught up), and how recently it was
heard from. In our run the meta leader is `n1-east` while the stream leader is
`n2-east`: the two groups elected independently.

For a live view of a group's RAFT state, use the `/raftz` monitoring endpoint.
It answers on the HTTP monitor port, which the previous page's configs don't
set, so start `n1-east` with one: `nats-server -c n1-east.conf -m 8222`. Bare
`/raftz` returns only the meta group; to see a stream group, filter by the
account that owns the stream (`$G`, the default account, URL-encodes as
`%24G`):

```bash
# trimmed to the fields we care about
curl -s 'http://127.0.0.1:8222/raftz?acc=%24G'
```

```json
{
  "$G": {
    "S-R3F-jF1m3dMO": {
      "id": "N0TeytwJ",
      "state": "FOLLOWER",
      "size": 3,
      "quorum_needed": 2,
      "leader": "cJ6ynrck",
      "term": 1,
      "voted_for": "cJ6ynrck",
      "peers": {
        "cJ6ynrck": { "name": "n2-east", "known": true },
        "h4QkFOiR": { "name": "n3-east", "known": true }
      }
    }
  }
}
```

This is `n1-east`'s own view of the `ORDERS` group: its `state` is `FOLLOWER`,
and `leader` holds the peer ID of `n2-east`. `size` and `quorum_needed` are
the consensus math (three peers, two needed); `term` and `voted_for` belong to
elections, next. The full field set is documented in
[Reference → /raftz](/reference/system/monitor/raftz). We only need the group,
the leader, and the term here.

## Leader election

A group has one leader at a time. While the leader is healthy, it sends a
periodic **heartbeat** to its followers (by default about once a second), and
as long as that heartbeat arrives, the followers stay followers and do nothing
but accept the leader's entries.

The interesting case is when the heartbeat stops, because the leader crashed,
hung, or got cut off by the network. The followers can't tell *why* the
heartbeat stopped, only that it did. So they don't wait forever. Each follower
runs an **election timer**, and if no heartbeat arrives before it fires, that
follower assumes the leader is gone and starts an **election** to replace it.

An election needs one more idea: the **term**, a number that counts elections
and only ever goes up. Every entry and every vote is stamped with a term, so
the group can always tell a stale message from a current one. A leader from an
older term is automatically obsolete the moment a newer term exists.

When a follower's election timer fires, it becomes a **candidate**, the third
RAFT role. It increments the term to one higher than any it's seen, votes for
itself, and asks every other peer to vote for it in this new term.

Each peer grants its vote if it hasn't already voted in this term and the
candidate's log is at least as up to date as its own. A peer votes for at most
one candidate per term, which is what stops two leaders from emerging at once.

The candidate becomes the leader the instant it collects a **quorum** of
votes: a majority of the group's peers, `(N+1)/2`. For the three-peer `ORDERS`
group that's two: the candidate's own vote plus one more. With the majority in
hand, the new leader immediately starts sending heartbeats, the other peers
return to being followers, and the group is whole again under the new term.

<div class="nats-flow" data-scenario="raftElectionAnimated" data-width="600" data-height="350"></div>

The quorum rule is why a majority must survive for a group to elect a leader at
all. A three-peer group keeps a leader as long as two peers are up; lose two and
the survivor can't reach a majority, so it can't become leader and the group
goes leaderless until a peer returns. This is the consensus math behind the
odd-server-count advice the [Topologies chapter](/learn/topologies/jetstream-in-a-cluster)
gives as a deployment choice: an even count buys no extra majority.

## Observing an election

You can observe this directly. Find the current stream leader:

```bash
nats stream info ORDERS | grep Leader
```

```
                       Leader: n2-east (1m23s)
```

Ours is `n2-east`; kill whichever server yours reports. There are two ways to
take it down, and they behave differently.

First, stop it cleanly: Ctrl-C its terminal, or `kill` its process. Ask again
right away (block trimmed to the leader and replica lines):

```
                       Leader: n3-east (378ms)
                      Replica: n1-east, current, seen 378ms ago
                      Replica: n2-east, outdated, OFFLINE, not seen, 4 operations behind
```

There's already a new leader. A cleanly stopped server tells the group it's
leaving on the way down, so the followers skip the heartbeat wait: `n3-east`
was leader 0.38 seconds after the `kill`. A clean stop never shows you the
election timer. Restart `n2-east` before the next step; its `Replica` line
returns to `current` once it catches up.

Now crash the new leader `n3-east` instead — `kill -9` ends the process
before it can tell anyone:

```bash
kill -9 <pid-of-n3-east>
```

This time the followers only see missing heartbeats, so they have to wait out
their election timers, which fire between four and nine seconds after the last
heartbeat. The winner's log shows both moments:

```
[50342] 2026/07/07 12:51:08.027229 [INF] 127.0.0.1:57944 - rid:17 - Router connection closed: Client Closed - Remote: n3-east
[50342] 2026/07/07 12:51:14.560576 [INF] JetStream cluster new stream leader for '$G > ORDERS'
```

The gap was 6.5 seconds, inside the four-to-nine-second window. The survivors
held a quorum (two of three), so `ORDERS` is writable again without `n3-east`:

```
                       Leader: n2-east (4.02s)
                      Replica: n1-east, current, seen 19ms ago
                      Replica: n3-east, outdated, not seen, 5 operations behind
```

The term advanced too: `/raftz` now reports the group at `"term": 3` — it was
1 at creation, and each election bumped it. Restart `n3-east` and the group is
whole again.

## Moving a leader manually

Sometimes you want to move leadership without killing anything, say to drain
a server before maintenance. A **stepdown** is a leader voluntarily yielding
its role so the group elects a new one.

For a stream leader, ask the stream's group to step down:

```bash
nats stream cluster step-down ORDERS
```

```
12:52:11 Requesting leader step down of "n2-east" for stream "ORDERS" in a 3 peer cluster group
12:52:11 New leader elected "n3-east"
```

The command waits for the election and reports the winner. The meta group has
its own stepdown, scoped to the whole cluster. It's a system command:

```bash
nats server cluster step-down --user sys --password sys
```

```
12:52:24 Requesting leader step down of "n1-east" in a 3 peer RAFT group
12:52:24 New leader elected "n2-east"
```

That moved the *meta* leader from `n1-east` to `n2-east`, and the `ORDERS`
stream leader stayed where it was. Use the stream form to move a single
stream, the server form to move cluster-wide assignment duty.

## When the meta leader dies

The two stepdowns above left `n2-east` as meta leader and `n3-east` as the
`ORDERS` stream leader. Crash the meta leader and watch what stops working:

```bash
kill -9 <pid-of-n2-east>
```

One second later, publish an order. It works, because the `ORDERS` group and
its leader `n3-east` don't need the meta group to accept a write:

```bash
nats pub --jetstream orders.created '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
```

```
12:54:22 Published 91 bytes to "orders.created"
12:54:22 Stored in Stream: ORDERS Sequence: 1
```

Now try an *assignment* — anything that needs the meta leader to decide, like
creating a stream:

```bash
nats stream add INVOICES --subjects 'invoices.>' --replicas 3 --defaults --timeout 3s
```

```
nats: error: could not create Stream: context deadline exceeded
```

While the meta group elects, every assignment pauses: stream and consumer
creates, edits, and deletes. Existing leaders keep serving, and plain NATS
traffic never notices. The pause is one ordinary election long:

```
[50556] 2026/07/07 12:54:21.234474 [INF] 127.0.0.1:6223 - rid:20 - Router connection closed: Client Closed - Remote: n2-east
[50556] 2026/07/07 12:54:26.070536 [INF] JetStream cluster new metadata leader: n1-east/east
```

4.8 seconds in our run, and the failed `stream add` succeeds on retry. The
report confirms the move and shows the dead server falling behind:

```
│ Connection Name │ ID       │ Leader │ Current │ Online │ Active │ Lag │
├─────────────────┼──────────┼────────┼─────────┼────────┼────────┼─────┤
│ n1-east         │ N0TeytwJ │ yes    │ true    │ true   │ 0s     │ 0   │
│ n2-east         │ cJ6ynrck │        │ false   │ true   │ 0s     │ 11  │
│ n3-east         │ h4QkFOiR │        │ true    │ true   │ 298ms  │ 0   │
```

Restart `n2-east` to bring the cluster back to three healthy peers, and remove
the test stream with `nats stream rm INVOICES -f`.

## Pitfalls

Each pitfall below is scoped to this page's two concepts: groups and
elections.

**An election takes seconds, not milliseconds.** After a crash, the election
timer fires between four and nine seconds after the last heartbeat,
deliberately staggered so two followers don't become candidates at the exact
same instant — 6.5 seconds in the run above. During that window the `Leader`
line is empty, writes are refused, and a query may block until a leader
answers. That window is expected behavior. Don't build a client that
treats a brief "no leader" as a fatal error. Have it retry, since a new leader
arrives within seconds:

```bash
# During the election window, the leader line is briefly empty:
nats stream info ORDERS | grep Leader
#                        Leader:
# Re-run a few seconds later and the new leader appears:
nats stream info ORDERS | grep Leader
#                        Leader: n2-east (3.93s)
```

The window only exists for a crash: a cleanly stopped leader hands off in
well under a second.

**Stepdown moves leadership, but does not pick the successor.** `nats stream
cluster step-down` makes the current leader yield, and by default the *next*
leader is chosen by a normal quorum election among the remaining peers — the
command reports whoever won, as the captures above show. There's a
`--preferred` flag, but it's a hint tied to placement, not a lock; it's
covered on [Placement](/learn/clustering/placement). Run a bare stepdown to
move leadership *off* a server, not onto one, and read the `New leader
elected` line to learn who actually won.

**The meta leader and a stream leader are different groups.** Losing the meta
leader doesn't lose the `ORDERS` stream leader, and vice versa; they're
separate RAFT groups with separate elections. You saw it above: with the meta
leader dead, publishes to `ORDERS` kept landing while `stream add` timed out.
Don't assume the stream is unavailable when only the meta leader moved, or the
reverse. Check the right group: `nats server report jetstream` for the meta
leader, `nats stream info ORDERS` for the stream leader.

## Where you are

Your cluster now has names for its moving parts:

- The meta group spans all three servers and holds the cluster's
  assignments; its meta leader decides placement.
- The `ORDERS` stream exists with three replicas: its own RAFT group of
  three peers with its own stream leader, independent of the meta leader.
- You've crashed a stream leader and watched a 6.5-second election replace
  it, moved both kinds of leader on purpose with stepdown, and crashed the
  meta leader to see assignments pause while stream traffic continued.

What you haven't done yet is follow a single write through the group: how an
order gets onto all three peers and is decided safe.

## What's next

The next page traces exactly that: one `orders.created` write from the
leader's log to a quorum of peers, where it **commits**, and the consistency
you get from `R=3`: [Replication and R=3](/learn/clustering/replication-and-r3).

## See also

- [Reference → /raftz](/reference/system/monitor/raftz) — the RAFT group
  monitoring endpoint and its full field set.
- [Surviving node loss](/learn/jetstream/surviving-node-loss) — the one-page
  operator view of replicas riding through a server loss.
- [Topologies → JetStream in a cluster](/learn/topologies/jetstream-in-a-cluster) —
  where the odd-server-count and shape choices live.
