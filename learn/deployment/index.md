---
id: index
title: "Deployment & Upgrades Deep Dive"
sidebar_position: 1
description: Take the Acme ORDERS cluster to production — size it, deploy it, configure it live, upgrade it safely, and harden it
---

# Deployment & Upgrades Deep Dive

The [Topologies deep dive](/learn/topologies) designed a shape: a
three-node NATS cluster, `east`, carrying the `ORDERS` stream. This
chapter takes that exact cluster and runs it in production.

Topologies covered the *shapes*: one server, a cluster, a super-cluster,
leaf nodes. This chapter covers the *operations* that turn a shape into
a running system. Those operations are the resources a node needs, the
manifests that stand it up, the SIGHUP that reloads its config without
dropping a connection, the lame-duck mode that upgrades it without losing
the stream, and the systemd flags that restrict its access.

This is the runbook rather than the theory. Each page names the
mechanism, gives the exact command or manifest you run, and links the
*why* out to the chapter that covers it.

<div class="nats-flow" data-scenario="lameDuckUpgradeAnimated" data-width="600" data-height="350"></div>

## By the end you'll have

A production runbook for the same Acme ORDERS cluster you've followed
through every other Learn chapter:

- A **sizing baseline** for the workload: the four resources a node
  spends (CPU, memory, disk, file descriptors), and how an R3 stream
  counts against the `ORDERS` account limits.
- The cluster **running on Kubernetes** as a three-replica StatefulSet
  with pods `nats-0`, `nats-1`, `nats-2` (the same `n1-east`, `n2-east`,
  `n3-east` cluster you designed in Topologies; the Kubernetes page
  spells out that mapping), with the `ORDERS` stream and the `shipping`
  and `analytics` consumers declared as CRDs.
- The ability to **change config live**: split into per-account and
  per-region includes, reloaded with a SIGHUP, with zero downtime and no
  client reconnect.
- A safe **rolling upgrade** procedure that walks a new server version
  through `nats-0..2` while the R3 ORDERS stream stays available and
  clients stay connected.
- A **hardened** cluster: TLS on every link, the `ACME` credentials
  mounted, a locked-down systemd unit, and the monitor port closed to the
  internet.

## Who this is for

You're an operator standing the cluster up for real. You've read the
[Topologies deep dive](/learn/topologies) and know the shapes, and you've
skimmed the [JetStream](/learn/jetstream) and
[Security](/learn/security) deep dives. This chapter reuses the `ORDERS`
stream and the `ACME` operator rather than re-introducing them.

This chapter is deliberately the runbook half. It divides the work with
four sibling chapters, and each owns part of it:

- **Which shape to deploy** is [Topologies](/learn/topologies). This
  chapter assumes the three-node ORDERS cluster shape is already decided.
- **How Raft and replication work underneath** is
  [Clustering](/learn/clustering). This chapter *triggers* a leadership
  transfer during an upgrade; it doesn't explain how Raft elects a
  leader.
- **The auth model** (operators, accounts, users, JWTs) is
  [Security](/learn/security). This chapter *mounts* the credentials and
  *turns on* TLS; the model is taught there.
- **What to watch once it's live** is [Monitoring](/learn/monitoring).
  This chapter *sets up* the cluster; monitoring watches it.

If a sentence here would be at home verbatim in one of those four, it
belongs there, and this chapter links to it instead.

## How to read it

Each page introduces at most two new concepts and carries the same
cluster forward. You [size it](/learn/deployment/sizing-and-resources),
[deploy it](/learn/deployment/kubernetes), [edit its config
live](/learn/deployment/config-management), [upgrade
it](/learn/deployment/rolling-upgrades), and
[harden it](/learn/deployment/hardening). The
node names (`n1-east`/`n2-east`/`n3-east`), the `ORDERS` stream, the
`order-svc` publisher, and the `ACME` operator stay fixed throughout, so
you keep a
mental picture of one Acme system getting production-ready rather than a
new example each time.

Every page covers only the configuration keys this deployment needs. The
full set of server configuration options lives in
[Reference → Configuration](/reference/config); each page points there
for the exhaustive knob list.

## Map

| Page | What you learn |
|---|---|
| [Deployment & Upgrades](/learn/deployment) | What this chapter operates and the order of the runbook |
| [Sizing & resources](/learn/deployment/sizing-and-resources) | The four resources a node spends, and how an R3 stream counts against account limits |
| [Kubernetes](/learn/deployment/kubernetes) | Stand the cluster up as a StatefulSet with the NATS Helm chart, and declare streams as CRDs |
| [Config management](/learn/deployment/config-management) | Split config into includes and reload it live with a SIGHUP: no downtime, no reconnect |
| [Rolling upgrades](/learn/deployment/rolling-upgrades) | Use lame-duck mode and the right upgrade order to roll a new version through the cluster |
| [Hardening](/learn/deployment/hardening) | TLS on every link, mounted credentials, and a locked-down systemd unit |
| [Where to go next](/learn/deployment/where-next) | The production checklist and a map of what's beyond running the cluster |

## Prerequisites

You'll need:

- A running three-node ORDERS cluster, or the willingness to stand one up
  while you read. The [Topologies deep dive](/learn/topologies) builds it
  step by step.
- The `nats` CLI installed and pointed at the cluster, for the inspection
  commands (`nats account info`, `nats server info`, `nats stream info`)
  that anchor each page.
- For the Kubernetes pages, a cluster you can `kubectl` against and `helm`
  installed. The [NATS Helm chart](/learn/deployment/kubernetes) and the
  NACK controller are the canonical path this chapter follows.

Open a terminal and turn to
[Sizing & resources](/learn/deployment/sizing-and-resources).

## See also

- [Topologies deep dive](/learn/topologies) — the shape this chapter runs.
- [Clustering & Replication](/learn/clustering) — the Raft mechanics this
  chapter triggers but doesn't teach.
- [Security deep dive](/learn/security) — the auth model behind the
  credentials this chapter mounts.
