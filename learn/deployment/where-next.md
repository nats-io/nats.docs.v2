---
id: where-next
title: "7. Where to go next"
sidebar_position: 7
description: Recap the deployment runbook and collect every page's production checklist in one place
---

# 7. Where to go next

You started this chapter with a cluster shape on paper — the three-node
`east` cluster the Topologies chapter designed, carrying the R3 `ORDERS`
stream. You end it with that same cluster sized, running on Kubernetes,
reconfigurable without downtime, upgradable without losing the stream,
and locked down with TLS on every link. That is the whole arc: a shape
turned into a running system.

This page does not teach anything new. It collects the runbook you built
into one place and points you at the chapters and Reference that take it
further.

## The whole game in five steps

Every page in this chapter advanced the same one cluster through one
operational step. If you remember nothing else, remember the order.

You **size** it first. A node spends four resources — CPU, memory, disk,
and file descriptors — and an R3 stream counts three times against the
`ORDERS` account limits. Sizing is reading those limits before you commit
to a PVC, not guessing at them after the disk fills.

You **deploy** it second. The NATS Helm chart stands the cluster up as a
StatefulSet whose three pods, `nats-0`/`nats-1`/`nats-2`, are the same
`n1-east`/`n2-east`/`n3-east` nodes from Topologies. The NACK controller
turns the `ORDERS` stream and its consumers into declarative CRDs.

You **configure** it third. An include splits the config into
per-account and per-region files, and a SIGHUP reloads the reloadable
keys in place — no restart, no client reconnect. The reloader sidecar
turns a ConfigMap edit into that SIGHUP.

You **upgrade** it fourth. Lame-duck mode lets a node drain its clients
and transfer Raft leadership before it stops, and the upgrade order —
non-leaders first, the meta-leader last, quorum protected by a
PodDisruptionBudget — keeps the R3 ORDERS stream available the whole way.

You **harden** it fifth. TLS goes on every link, the `ACME` credentials
mount as files, a locked-down systemd unit strips the process of every
capability it does not need, and the monitor port closes to everything
but localhost.

Size, deploy, configure, upgrade, harden. Everything else in this
chapter is a detail of one of those five.

## Where the details live now

The chapter is unversioned and concept-first. The exact keys, defaults,
and ranges live in **Reference**, which is versioned and exhaustive. When
you need the precise type of a config field or the full list of TLS or
JetStream limit options, that is where to look.

The full set of server configuration options is documented in
[Reference → Configuration](/reference/config). The handoff phrases
throughout this chapter — "we only cover the keys this deployment needs"
— all point into it.

## Sibling deep dives

This chapter is the runbook. It deliberately stops at the seam of five
other chapters and hands each its own job, so the cluster you built here
carries straight into them.

The [Topologies deep dive](/learn/topologies) owns the **shape**. It is
where the three-node `east` cluster came from, and where you go to choose
a different shape — a super-cluster across regions, or leaf nodes at the
edge — before you size and deploy it.

The [Clustering & Replication deep dive](/learn/clustering) owns the
**Raft mechanics** this chapter only triggers. When a rolling upgrade
transfers leadership, [raft-and-leaders](/learn/clustering/raft-and-leaders)
explains how the meta-leader is elected and how R3 stays consistent
through the change.

The [Security deep dive](/learn/security) owns the **auth model** behind
the credentials this chapter mounts. This chapter turns TLS on and points
the server at a creds file;
[operator-mode](/learn/security/operator-mode) is where the operator
`ACME`, the accounts, and the JWTs that the creds file carries are designed.

The [Monitoring deep dive](/learn/monitoring) owns **what to watch** once
the cluster is live. This chapter exposes `/healthz` and runs
`nats server report` as one-off operational checks;
[monitoring-endpoints](/learn/monitoring/monitoring-endpoints) is where
those signals become an alerting discipline.

The [Backup & Recovery deep dive](/learn/backup-recovery) owns
**disaster recovery** — snapshotting the ORDERS stream and restoring it —
which is the one production concern this chapter's hardening does not
cover.

## Where you are

This is the end of the chapter. The Acme ORDERS cluster is now sized,
deployed as a StatefulSet, split into includes you can reload live,
upgradable through lame-duck mode, and hardened with TLS and a
locked-down systemd unit. No new scenario state is introduced here — the
cluster is running exactly as you left it on the hardening page.

You hold the whole runbook: take a topology shape, size its resources,
stand it up declaratively, change it without downtime, roll it forward
safely, and lock it down. That runbook is the floor for operating any
NATS cluster in production, not just this one.

## Production checklist

Every page in this chapter closed with a Pitfalls section. This collects
the action items from all of them in one place — a last pass before you
trust the cluster with real orders. Each group links back to the page
that explains the why.

### Sizing & resources — see [Pitfalls](/learn/deployment/sizing-and-resources#pitfalls)

- [ ] Set `max_file_store` to a size the disk can actually hold; an oversized limit lets JetStream error mid-publish instead of failing fast. Test small (`10GB`) and watch `df -h`.
- [ ] Keep `max_payload` at or below `max_pending`; a `max_payload` larger than `max_pending` refuses the server start. Hold `max_pending` at `≥ 10×` your peak message size.
- [ ] Raise the file-descriptor limit before the process starts (`ulimit -n 800000`); a big cluster spends about two FDs per stream plus routes and gossip and exhausts the default cap.
- [ ] Upgrade operator-mode clusters atomically — all nodes to v2.10+, never a rolling upgrade; pre-v2.10 servers do not enforce JWT account limits, so a mixed-version cluster enforces them inconsistently.
- [ ] Read the live limits with `nats account info` before sizing, so you plan against the limits the server actually enforces.

### Kubernetes — see [Pitfalls](/learn/deployment/kubernetes#pitfalls)

- [ ] Use `volumeClaimTemplates` (the Helm default) so each PVC binds before its StatefulSet replica starts; an unbound PVC leaves the pod Pending.
- [ ] Run the config reloader sidecar; a ConfigMap edit does not reload the server on its own.
- [ ] Raise the readiness failure threshold so the probe does not flap not-ready during a healthy JetStream rebalance.
- [ ] Never mix `nats` CLI mutations with control-loop CRDs; the NACK controller reverts manual changes in about thirty seconds.
- [ ] Confirm the CRD-created stream is R3 with `nats stream info ORDERS` from nats-box before trusting the declarative path.

### Config management — see [Pitfalls](/learn/deployment/config-management#pitfalls)

- [ ] Write include paths as absolute paths; an include resolves relative to the config file's directory, not the working directory.
- [ ] Fit a SIGHUP inside the graceful window; a reload during a rebalance can interrupt leadership transfer.
- [ ] Monitor TLS cert expiry as you rotate it; a rotation without monitoring leaves old connections hung on an expired cert.
- [ ] Trim oversized streams by hand after lowering `max_file`; a reload changes the ceiling, not the contents, so new writes fail until an admin trims.
- [ ] Dry-run every config change with `nats-server -c nats.conf -t` before you reload it.

### Rolling upgrades — see [Pitfalls](/learn/deployment/rolling-upgrades#pitfalls)

- [ ] Measure rebalance time before setting `lame_duck_duration`; a duration shorter than the rebalance drops clients before replicas sync.
- [ ] Transfer leadership before killing the meta-leader; upgrading it directly blocks stream ops for thirty to sixty seconds. Do non-leaders first.
- [ ] Set a PodDisruptionBudget with `minAvailable: 2`; without it an eviction can drain all three pods and lose quorum.
- [ ] Stagger lame-duck start across ordinals; firing it on every node at once triggers a reconnect storm.
- [ ] Read replicas and leader with `nats stream info ORDERS` before and after the upgrade to confirm the stream stayed R3.

### Hardening — see [Pitfalls](/learn/deployment/hardening#pitfalls)

- [ ] Keep TLS certs under `ReadWritePaths` (e.g. `/var/lib/nats`) or mount `/etc/nats-certs` explicitly; `ProtectSystem=strict` blocks a cert reload otherwise.
- [ ] Set `MemoryMax`/`GOMEMLIMIT` at or above the JetStream max store; a limit below it fails the server start silently.
- [ ] Open cluster port 6222 between nodes; a firewall that blocks it leaves nodes unable to form quorum and showing as orphans.
- [ ] Bind the monitor port 8222 to localhost; exposed to the internet it leaks version, client count, and memory.
- [ ] Connect with `--creds` and `--tlsca` and publish one order to prove auth and TLS are live before you call the cluster hardened.

## See also

- [Reference → Configuration](/reference/config) — every config key, flag,
  default, and limit, versioned and exhaustive.
- [Topologies deep dive](/learn/topologies) — the shape this chapter runs.
- [Monitoring deep dive](/learn/monitoring) — what to watch once the
  cluster is live.
