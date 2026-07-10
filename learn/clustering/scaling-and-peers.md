---
id: scaling-and-peers
title: "Scaling and peer management"
sidebar_position: 6
description: Add a peer with catchup, remove one safely, and keep quorum while you grow or shrink the ORDERS group
---

# Scaling and peer management

The `ORDERS` stream runs at `R=3` on `n1-east`, `n2-east`, and
`n3-east`, placed where the [Placement](/learn/clustering/placement)
page put it. That peer set isn't frozen. You can bring a new server
into the cluster and move a replica onto it, or retire a server and move
its replica off, without taking the stream down or losing the agreement
the rest of this chapter built.

This page changes the membership of a Raft group while it keeps serving.
A **peer** here is a Raft-group member, as it has been since
[Raft and leaders](/learn/clustering/raft-and-leaders): one server's
role inside the `ORDERS` group. Changing that set is **peer
management**, and it comes in two halves: **peer add** with catchup, and
**peer remove** with migration. Peer management changes *which* servers
hold the replicas; the replica count itself stays whatever the stream
config says (changing `R` is
[stream edit territory](/learn/clustering/replication-and-r3)).

<div class="nats-flow" data-scenario="peerScalingAnimated" data-width="600" data-height="350"></div>

The animation shows both halves: a fourth server joins, streams the
entries it's missing, and only then counts toward quorum; later one
peer is removed and drops its Raft subscriptions while the rest carry
on.

## Peer add: a new peer catches up before it counts

When a server becomes a peer of the `ORDERS` group, the group commits
the change as a membership-change entry, the same way it commits a
message: proposed by the leader, replicated to a quorum. From that
moment the new peer is a member.

It isn't a useful one yet, because a brand-new peer holds none of the
stream's history. It can't confirm a write that builds on entries it
doesn't have, and it can't answer for data it never stored.

So the new peer **catches up** first. Catchup is how a behind or new
peer streams the entries it's missing: the leader feeds it the log from
where it's short, the peer applies each entry into its stream store,
and its lag shrinks toward zero. Lag here is a count of log entries,
not messages, so it tracks your message count closely without matching
it exactly. Until the lag is gone, the new peer is an observer: present
in the set and replicating, but sitting out elections and not relied on
for quorum.

This observer step is what makes the move safe. Migrating a replica of
an `R=3` group onto `n4-east` doesn't put a half-empty copy in the
voting path the instant it joins. The group keeps committing on the
peers that already have the data while `n4-east` fills in behind them.
Only once it reports no lag does it carry the same weight as the
others.

## Add a fourth server and migrate a replica onto it

`n4-east` gets the same config shape as the other three, from
[Forming a cluster](/learn/clustering/forming-a-cluster), with the next
free ports — client 4232 and route 6232 (4225-4227 and 6225-6227 belong
to the `west` cluster in the Topologies chapter):

```conf title="n4-east.conf"
server_name: n4-east
listen: 127.0.0.1:4232
http_port: 8232

jetstream {
  store_dir: "./js/n4-east"
}

accounts { SYS: { users: [ { user: sys, password: sys } ] } }
system_account: SYS

cluster {
  name: east
  listen: 127.0.0.1:6232
  routes: [
    nats://127.0.0.1:6222
  ]
}
```

Start it and gossip does the rest, exactly as it did for the first
three:

```bash
nats-server -c n4-east.conf &
nats server list --user sys --password sys
```

```
╭────────────────────────────────────────────────────────────────────╮
│                          Server Overview                           │
├─────────┬─────────┬─────────┬─────┬───────┬──────┬────────┬────────┤
│ Name    │ Cluster │ Version │ JS  │ Conns │ Subs │ Routes │ Uptime │
├─────────┼─────────┼─────────┼─────┼───────┼──────┼────────┼────────┤
│ n1-east │ east    │ 2.14.0  │ yes │ 1     │ 280  │     12 │ 27.62s │
│ n3-east │ east    │ 2.14.0  │ yes │ 0     │ 280  │     12 │ 27.62s │
│ n2-east │ east    │ 2.14.0  │ yes │ 0     │ 280  │     12 │ 27.62s │
│ n4-east │ east    │ 2.14.0  │ yes │ 0     │ 280  │     12 │ 3.03s  │
╰─────────┴─────────┴─────────┴─────┴───────┴──────┴────────┴────────╯
```

`Routes` climbed from 8 to 12: three remote servers now, four pooled
connections each. `n4-east` is in the cluster and available to
JetStream, but it holds nothing. `ORDERS` still lives on its original
three peers.

There's no peer-add command that pushes it into the group. You free a
slot instead: remove one of the current peers, and the **meta leader**
(the cluster-wide Raft leader from
[Raft and leaders](/learn/clustering/raft-and-leaders)) assigns a spare
server — one that's in the cluster but not in this group — into the
vacated place. With `n4-east` as the only spare, the choice is made for
you.

Catchup is only visible when there's history to copy, so first fill the
stream with a backlog:

```bash
nats pub --jetstream orders.created --count 5000 \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
```

The stream now holds about 5,000 orders. In our run `n3-east` held the
stream leadership at this point; yours may still sit where the last
page's step-down put it, and the removal behaves the same either way.
Drop `n2-east` — counterintuitively, this remove *is* the add: it frees
the slot that the meta leader hands to `n4-east`:

<div class="nats-example" data-type="learn-clustering-scaling-and-peers-peerAdd" data-languages="cli"></div>

```
13:41:57 Removing peer "n2-east"
13:41:57 Requested removal of peer "n2-east"
```

Read the group back right away and you catch the catchup mid-flight, in
the same `Cluster` block you've read everything else in:

```bash
nats --server nats://127.0.0.1:4222 stream info ORDERS
```

```
Cluster Information:

                         Name: east
                Cluster Group: S-R3F-jF1m3dMO
                       Leader: n3-east (25.20s)
                      Replica: n1-east, current, seen 202ms ago
                      Replica: n4-east, outdated, seen 195ms ago, 4,853 operations behind
```

`n2-east` is gone, `n4-east` took its slot, and the list still shows
three peers — the replacement swapped in, it didn't append a fourth
entry. `outdated` with an operations-behind count is catchup in
progress. On a local cluster it doesn't stay visible long: those 4,853
entries streamed across in about two seconds, so a second read may show
the count flipped straight to `current`:

```
Cluster Information:

                         Name: east
                Cluster Group: S-R3F-jF1m3dMO
                       Leader: n3-east (29.11s)
                      Replica: n1-east, current, seen 115ms ago
                      Replica: n4-east, current, seen 115ms ago
```

When `n4-east` reads `current` with no lag, it has the full stream and
counts toward quorum like any other peer. On a stream with real volume,
expect the `outdated` phase to last as long as the data takes to copy.

## Peer remove: the slot is refilled, not deleted

You've already run a **peer remove**; now look at what it actually did.
The command names the stream and the peer to drop:

```bash
nats --server nats://127.0.0.1:4222 stream cluster peer-remove ORDERS n4-east
```

```
13:42:19 Removing peer "n4-east"
13:42:19 Requested removal of peer "n4-east"
```

The group commits the removal, and the dropped peer lets go of its Raft
subscriptions for the group. Then the stream **migrates**: the meta
leader looks for a server to take the empty slot, because the stream's
config still asks for three replicas. That command shrank nothing — it
moved `ORDERS` straight back onto `n2-east`, the spare we created a
minute ago, complete with its own catchup:

```
Cluster Information:

                         Name: east
                Cluster Group: S-R3F-jF1m3dMO
                       Leader: n3-east (46.77s)
                      Replica: n1-east, current, seen 1.01s ago
                      Replica: n2-east, outdated, seen 1.01s ago, 4,854 operations behind
```

A few seconds later `n2-east` is `current` and `ORDERS` sits on
`n1-east`, `n2-east`, `n3-east` again, the set it started with. Two
more facts about the migration, both from live runs:

- **Removing the leader works.** The group runs an election first, so
  leadership lands on a peer that stays, then the migration proceeds.
- **The replacement isn't always a good one.** If no *running* spare
  exists, the meta leader assigns a stopped server, and if no server
  exists at all, the removal still commits but the CLI reports
  `nats: error: peer remap failed (10075)` and the group runs on fewer
  peers than `R` asks for. Both cases are in the Pitfalls below.

So a peer remove on its own retires a server *from this group*. To
retire a server from JetStream entirely, there's a meta-level command.

## One server removal at a time

`nats server cluster peer-remove` (note: `server`, not `stream`)
removes a server from the meta group itself — the whole JetStream
layer, not one stream. The meta leader then reassigns every replica
that server held. It's the command for decommissioning a dead machine,
and it needs the system account:

```bash
nats server cluster peer-remove n4-east --user sys --password sys
```

The CLI treats this as destructive. It prints a warning first (a peer
removed at this level is expected not to return, and any `R=1` data it
held is lost) and asks for confirmation; pass `--force` to skip the
prompt in a script. Answer `y` and `n4-east` leaves the meta group.

This level enforces one membership change at a time. Issue a second
removal while one is still committing and it's refused:

```
nats: error: Could not remove zm8r24qo: cluster member change is in progress (10202)
```

(`zm8r24qo` is the server's peer ID — the same ID `nats server report
jetstream` lists next to each name.) This is deliberate: two
overlapping changes to who's in the voting set are a way for a group to
lose its quorum. Let one finish before you start the next. One more
guard you'll meet: the current meta leader refuses to remove itself
(`nats: error: did not find a replica named n2-east`) — step it down
first, then remove it.

The full set of peer-management and stream-assignment operations is
documented in [Reference](/reference/jetstream/api/meta). We only need
remove, migrate, and the verify step here.

## Pitfalls

Three mistakes are common the first time you resize a live group. All
three come from this page's two concepts: peer add with catchup, and
peer remove with migration.

**A removed peer's replacement can be a dead server.** The meta leader
refills the slot with whatever the cluster has. If the only server not
already in the group is stopped, it gets assigned anyway. This is a
real capture, taken after removing a peer while the last spare was
down:

```
Cluster Information:

                       Leader: n1-east (2m10s)
                      Replica: n3-east, outdated, OFFLINE, not seen, 4,980 operations behind
                      Replica: n4-east, current, seen 395ms ago
```

The group still reports three peers, but only two are alive: your
`R=3` stream is quietly one failure away from losing quorum. Lose one
more live peer and the `Leader` field goes blank — this capture is from
a larger test cluster where exactly that happened:

```
Cluster Information:

                       Leader: 
                      Replica: n2-east, current, seen 5.29s ago
                      Replica: n4-east, outdated, OFFLINE, not seen
                      Replica: n5-east, outdated, OFFLINE, not seen
```

A publish then dies with
`nats: error: nats: no responders available for request`, because no
leader subscribes to the stream's subjects. The handling is a verify
step after every removal: re-read the `Cluster` block and treat any
`OFFLINE` replica as a copy you don't have.

<div class="nats-example" data-type="learn-clustering-scaling-and-peers-peerRemove" data-languages="cli"></div>

If the block shows an empty `Leader` or an `OFFLINE` replica, stop
removing. The fix is to bring a server back, not to remove another
peer.

**A freshly added peer isn't safe until its lag is zero.** While a new
peer catches up it's an observer, not a full member of the quorum. If
you kill another server mid-catchup, you can drop below the peers that
actually hold the data and stall the group. Catchup on a local test
finishes in seconds; on a stream with real volume it takes as long as
copying the data takes. Don't treat a new peer as a working replica
until `nats stream info` shows it `current`.

**Nothing stops you shrinking to a single peer.** When no server is
available to take a removed peer's slot, the removal still commits —
the CLI prints `nats: error: peer remap failed (10075)` and the group
runs smaller. Repeat it and you reach a one-peer group, and that
group *keeps accepting writes*: one peer is a majority of one, so
publishes still return a `PubAck` while the only copy of your data sits
on one server. Check the
`Cluster` block before every removal, and treat `peer remap failed` as
a signal you've run out of servers, not as a step that half-worked.

## Where you are

You can now resize a live Raft group without taking the stream down:

- You started `n4-east` (client port 4232), freed a slot with
  `peer-remove`, and watched the meta leader migrate a replica onto the
  new server: `outdated, 4,853 operations behind`, then `current`.
- You removed `n4-east` again and saw the slot refilled, not deleted:
  `ORDERS` is back on `n1-east`, `n2-east`, and `n3-east`, the same
  three peers it started on.
- You know the meta-level `nats server cluster peer-remove` retires a
  server from all of JetStream, allows one change at a time (`cluster
  member change is in progress`), and won't remove the meta leader.

## What's next

You've walked the whole mechanism: routes form the mesh, Raft groups
agree, a quorum commits each write, placement decides where replicas
live, and peer management grows the set safely. The last page collects
the recap, points to where the exhaustive detail lives, and gathers
every page's Pitfalls into one production checklist.

Continue to [Where to go next](/learn/clustering/where-next).

## See also

- [Raft and leaders](/learn/clustering/raft-and-leaders) — election and
  `step-down`, which a `peer-remove` triggers when it drops the leader.
- [Reference → meta API](/reference/jetstream/api/meta) — the full set
  of peer-management and stream-assignment operations.
- [Backup & recovery](/learn/backup-recovery) — take a backup before a
  risky resize, so a lost replica is recoverable.
