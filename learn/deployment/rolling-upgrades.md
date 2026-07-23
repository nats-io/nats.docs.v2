---
id: rolling-upgrades
title: "Rolling upgrades"
sidebar_position: 5
description: Roll a new server version through the ORDERS cluster with lame-duck mode and the right upgrade order, keeping the R3 stream available and clients connected
---

# Rolling upgrades

The previous page changed the cluster's config without dropping a
connection. A new server *version* is a harder problem, because the
binary itself has to change, which means the process has to restart. If
a restart is done carelessly, it drops every client on that node and can
leave the `ORDERS` stream a node short of quorum.

This page rolls a new version through `nats-0`, `nats-1`, and `nats-2`
one node at a time, with the cluster staying up the whole way. It needs
two ideas: **lame-duck mode**, the graceful way a single node steps out,
and **upgrade order**, the sequence across the three nodes that protects
the stream.

## Lame-duck mode

A node restart is abrupt. The process stops, and every client connected
to it discovers the loss only when its next write fails. Any stream
replica that node was leading goes leaderless until the cluster elects a
replacement.

Lame-duck mode makes that stop orderly instead of abrupt. A node in
lame-duck mode broadcasts that it is going away, hands off its work,
and lets clients move *before* the process exits. The mechanism is
specified in the server's ADR-5; here you only need what the operator
triggers and what it does.

You enter lame-duck mode by sending the running process the `SIGUSR2`
signal:

```bash
# Signal nats-0 to enter lame-duck mode (run on the node, or via the pod)
kill -SIGUSR2 $(cat /var/run/nats/nats.pid)
```

That one signal kicks off a sequence inside the node:

1. It closes its client listener, so no *new* connection lands on a node
   that's on its way out.
2. It transfers any Raft leadership it holds to another replica, so no
   stream is left leaderless.
3. It shuts down its JetStream assets cleanly, flushing to disk.
4. It broadcasts `INFO ldm:true` to its routes and its connected clients.
   The update drops this node from each client's server pool, so the next
   reconnect lands elsewhere; the client takes no other action on the INFO
   itself.
5. After a short grace period it closes the remaining client connections,
   spread over the lame-duck duration rather than all at once. Each client
   sees its connection close and reconnects to another node through its
   normal reconnect logic.

Only after that does the process exit. By then leadership has transferred
and the clients have moved off as their connections closed, so the stream
never lost a quorum.

Two settings control the timing. `lame_duck_grace_period` (default
`10s`) is how long the node waits before it starts kicking clients.
`lame_duck_duration` (default `2m`, minimum `30s`) is the total window
over which it spreads those kicks. The grace period must be shorter than
the duration.

```conf
# nats-server.conf — lame-duck timing
lame_duck_grace_period: "10s"
lame_duck_duration: "2m"
```

Set the duration to comfortably cover how long your clients take to
reconnect *and* how long JetStream needs to move leadership off this
node. A duration shorter than the rebalance drops clients before the
stream has caught up. We'll come back to that trap in
[Pitfalls](#pitfalls).

On Kubernetes you don't send the signal by hand. The NATS Helm chart
wires lame-duck mode into the pod's `preStop` hook, so a normal
`kubectl rollout restart` triggers it for you:

```yaml
# Pod preStop hook (set by the NATS Helm chart) — enter lame-duck before exit
lifecycle:
  preStop:
    exec:
      command:
        - "nats-server"
        - "-sl=ldm=/var/run/nats/nats.pid"
```

The `-sl=ldm=...` form reads the pid file, signals the running server to
enter lame-duck mode, and returns — identical to the `SIGUSR2` you sent
above. Kubernetes then sends SIGTERM, which the server ignores while it's
draining, so the drain is protected only by
`terminationGracePeriodSeconds`: when that expires the kubelet sends
SIGKILL. The chart defaults `lame_duck_duration` to `30s` and
`terminationGracePeriodSeconds` to `60s`. If you raise the duration, raise
the grace period above `lame_duck_duration` plus shutdown overhead too, or
the kubelet SIGKILLs the node mid-drain.

## Upgrade order

Lame-duck mode makes *one* node leave gracefully. Rolling a new version
across all three depends on the *order* you take them in, and that order
follows a specific rule.

One node in the cluster is the **meta-leader**: the Raft leader for the
cluster's own metadata, the node that coordinates where streams and
consumers live. The other two are non-leaders. Stepping the meta-leader
down forces a metadata election, and while that election runs, stream and
consumer *operations* (create, update, leadership moves) pause until a new
leader wins — typically about 5 to 10 seconds with default timeouts if the
node was killed outright, or roughly a second if it handed leadership off
first.

So the rule is: **upgrade the non-leaders first, and the meta-leader
last.** By the time you reach the meta-leader, the other two nodes are
already on the new version and ready to take over, so the one unavoidable
metadata election is short and happens once.

Before you start, read the cluster's current shape and confirm the stream
is at full R3:

<div class="nats-example" data-type="learn-deployment-rolling-upgrades-streamReplicas" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

That output shows the `ORDERS` stream's own Raft leader and each replica's
status — the per-node "current" gate you'll use between steps. The
**meta-leader** is a separate Raft group and may sit on a different node;
find it with `nats server report jetstream`, which marks the node leading
the cluster's metadata:

```bash
nats server report jetstream
```

The walkthrough below assumes `nats-1` is the meta-leader. The procedure
for each node is the same three steps:

```bash
# For each NON-leader node (nats-0, then nats-2):
# 1. Enter lame-duck mode and let it drain.
kill -SIGUSR2 $(cat /var/run/nats/nats.pid)   # on nats-0

# 2. Restart the process on the new server version.
systemctl restart nats-server                  # picks up the new binary

# 3. Wait until the stream reports this node as a "current" replica again
#    before moving to the next node — re-run nats stream info ORDERS.
```

Step 3 is the gate that controls when you proceed. A restarted node isn't
done until its `ORDERS` replica has caught up, because taking the next node
down while this one is still syncing leaves the stream one healthy replica
short.

Take the meta-leader (`nats-1`) **last**, with the same three steps. When
it enters lame-duck mode it transfers metadata leadership to one of the
two already-upgraded nodes, the brief election runs once, and the whole
cluster is on the new version.

There's one more guardrail on Kubernetes. A `PodDisruptionBudget` (PDB)
caps how many pods may be down at once. With `minAvailable: 2`, Kubernetes
won't voluntarily evict two of the three pods together, so a node drain
can never cost the R3 stream its quorum:

```yaml
# pod-disruption-budget.yaml — never let the cluster drop below 2 nodes
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: nats
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: nats
```

The flow below shows the whole sequence for one node: the signal, the
`INFO ldm:true` broadcast, the leadership transfer, the client reconnect,
and the rejoin on the new version.

<div class="nats-flow" data-scenario="lameDuckUpgradeAnimated" data-width="600" data-height="350"></div>

The two keys this page touches, `lame_duck_duration` and
`lame_duck_grace_period`, are the only ones you must set for a safe roll.
The full set of server configuration options is documented in
[Reference → Configuration](/reference/config). We only cover the keys
this deployment needs here.

## Client reconnection during the upgrade

A node leaving in lame-duck mode requires no action from a correctly
configured client. The `INFO ldm:true` broadcast tells the client the
node is going away (and fires an optional lame-duck callback if the app
registered one); the client keeps running on its existing connection, and
because the node stops accepting new connections, no client dials it
again.
When the server later closes that connection during the staggered kick,
the client's normal reconnect logic dials another node in the cluster,
resubscribes, and resumes.

You can watch this happen. Subscribe `warehouse` to `orders.created` in
one terminal, publish an order from `order-svc` in another, and roll a
node mid-stream. The subscriber logs a reconnect and keeps printing
messages; the published order still lands in the `ORDERS` stream, because
the two nodes still up hold a quorum:

<div class="nats-example" data-type="learn-deployment-rolling-upgrades-requestDuringUpgrade" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

This is why the order and the timing matter: get them right and a
version upgrade has no observable effect on `warehouse`, `notifications`,
and `analytics`.

## Pitfalls

A few traps turn a clean rolling upgrade into an outage. All of them
come back to this page's two ideas: lame-duck timing and upgrade order.

**A `lame_duck_duration` shorter than the rebalance drops clients early.**
If you set the duration to `30s` but JetStream needs `45s` to move the
`ORDERS` leadership and resync replicas off the node, the node kicks its
clients and exits while the stream is still catching up. Measure how long
a real drain takes on your cluster first, then set the duration above it
with margin, rather than defaulting to the minimum value.

**Upgrading the meta-leader without draining it stalls stream ops until a
new leader is elected.** Restart the meta-leader directly and the cluster
has no metadata leader until the election timeout fires and a follower
wins — about 5 to 10 seconds with default timeouts — and during that
window every stream and consumer operation stalls. Draining it first
transfers leadership in roughly a second instead. Always enter lame-duck
mode so leadership transfers *before* the process stops, and always do the
non-leaders first so the meta-leader's one election is short. Check which
node leads before you touch anything, and re-check after each node, so
you never take down two replicas at once:

<div class="nats-example" data-type="learn-deployment-rolling-upgrades-streamReplicas" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

**Evicting pods without a PDB can drain all three at once.** A node
drain, a cluster autoscaler, or a careless `kubectl delete` can take two
or three pods together if nothing stops it, and two nodes down costs the
R3 stream its quorum. Set a `PodDisruptionBudget` with `minAvailable: 2`
so Kubernetes refuses to voluntarily evict past one pod. Don't rely on
doing the steps slowly by hand — make the budget enforce it.

**A reconnect storm comes from abrupt kills, not from lame-duck.** Clients
take no action on the `INFO ldm:true` broadcast itself — lame-duck mode
staggers the connection closes over the duration precisely so their
reconnects spread out instead of arriving as one burst that could
overwhelm the two nodes still up. The storm risk is what you get *without*
that: killing a node outright, or setting a duration so short the spread
collapses. Keep the duration comfortable, and roll one node at a time,
finishing one and letting it rejoin before starting the next.

## Where you are

The `ORDERS` cluster can now take a new server version without losing the
stream or dropping a client:

- Each node leaves through lame-duck mode: `SIGUSR2` (or the K8s
  `preStop` hook) makes it broadcast `INFO ldm:true`, transfer leadership,
  flush JetStream, and move clients before exiting.
- You roll the non-leaders first and the meta-leader last, gating on
  each node returning as a `current` replica.
- A `PodDisruptionBudget` of `minAvailable: 2` keeps the R3 stream's
  quorum safe even under involuntary eviction.

Clients reconnect on their own, so `warehouse`, `notifications`, and
`analytics` continue through the upgrade without code changes.

## What's next

The cluster is sized, deployed, configurable, and upgradable. The last
operational step is **hardening** it: TLS on every link, the `ACME`
credentials mounted, a locked-down systemd unit, and the monitor port
closed to the internet.

Continue to [Hardening](/learn/deployment/hardening).

## See also

- [Clustering → Raft and leaders](/learn/clustering/raft-and-leaders) —
  how leadership transfer and re-election actually work underneath.
- [Surviving node loss](/learn/jetstream/surviving-node-loss) — why an R3
  stream survives one node leaving, and what a quorum buys you.
- [Core NATS → Connection lifecycle](/learn/core-nats/connection-lifecycle) —
  the client's side of lame-duck mode: what the notice means and how the
  client ends up on another node.
