---
id: where-next
title: "Where to go next"
sidebar_position: 7
description: Recap the deployment runbook and collect every page's production checklist in one place
---

# Where to go next

You started this chapter with a cluster design: the three-node
`east` cluster the Topologies chapter designed, carrying the R3 `ORDERS`
stream. You end it with that same cluster sized, running on Kubernetes,
reconfigurable without downtime, upgradable without losing the stream,
and locked down with TLS on every link. Those steps take a cluster
design and produce a running system.

This page introduces no new material. It collects the runbook you built
into one place and points you at the chapters and Reference that take it
further.

## The five operational steps

Every page in this chapter advanced the same cluster through one
operational step, and the order they run in matters.

You **size** it first. A node uses four resources (CPU, memory, disk,
and file descriptors), and an R3 stream counts three times against the
`ORDERS` account limits. Sizing means reading those limits before you
commit to a PVC, rather than estimating them after the disk fills.

You **deploy** it second. The NATS Helm chart stands the cluster up as a
StatefulSet whose three pods, `nats-0`/`nats-1`/`nats-2`, are the same
`n1-east`/`n2-east`/`n3-east` nodes from Topologies. The NACK controller
turns the `ORDERS` stream and its consumers into declarative CRDs.

You **configure** it third. An include splits the config into
per-account and per-region files, and a SIGHUP reloads the reloadable
keys in place without a restart or a client reconnect. The reloader
sidecar turns a ConfigMap edit into that SIGHUP.

You **upgrade** it fourth. Lame-duck mode lets a node drain its clients
and transfer Raft leadership before it stops, and the upgrade order
(non-leaders first, the meta-leader last, quorum protected by a
PodDisruptionBudget) keeps the R3 ORDERS stream available the whole way.

You **harden** it fifth. TLS goes on every link, the `ACME` credentials
mount as files, a locked-down systemd unit strips the process of every
capability it doesn't need, and the monitor port closes to everything
but localhost.

The five steps are size, deploy, configure, upgrade, and harden, and
everything else in this chapter is a detail of one of those five.

## Where the exhaustive details are documented

The chapter is unversioned and concept-first. The exact keys, defaults,
and ranges live in **Reference**, which is versioned and exhaustive. When
you need the precise type of a config field or the full list of TLS or
JetStream limit options, that's where to look.

The full set of server configuration options lives in
[Reference → Configuration](/reference/config). The handoff phrases
throughout this chapter ("we only cover the keys this deployment needs")
all point into it.

## Sibling deep dives

This chapter is the runbook, and five other chapters continue from where
it ends. Each of those chapters covers a separate job, so the cluster you
built here carries straight into them.

The [Topologies deep dive](/learn/topologies) covers the **shape**. It's
where the three-node `east` cluster came from, and where you go to choose
a different shape (a super-cluster across regions, or leaf nodes at the
edge) before you size and deploy it.

The [Clustering & Replication deep dive](/learn/clustering) covers the
**Raft mechanics** this chapter only triggers. When a rolling upgrade
transfers leadership, [raft-and-leaders](/learn/clustering/raft-and-leaders)
explains how the meta-leader is elected and how R3 stays consistent
through the change.

The [Security deep dive](/learn/security) covers the **auth model** behind
the credentials this chapter mounts. This chapter turns TLS on and points
the server at a creds file;
[operator-mode](/learn/security/operator-mode) is where you design the
operator `ACME`, the accounts, and the JWTs that the creds file carries.

The [Monitoring deep dive](/learn/monitoring) covers **what to watch** once
the cluster is live. This chapter exposes `/healthz` and runs
`nats server report` as one-off operational checks;
[monitoring-endpoints](/learn/monitoring/monitoring-endpoints) is where
you turn those signals into ongoing alerting.

The [Backup & Recovery deep dive](/learn/backup-recovery) covers
**disaster recovery** (snapshotting the ORDERS stream and restoring it),
the one production concern this chapter's hardening doesn't cover.

## Where you are

This is the end of the chapter. The Acme ORDERS cluster is now sized,
deployed as a StatefulSet, split into includes you can reload live,
upgradable through lame-duck mode, and hardened with TLS and a
locked-down systemd unit. This page introduces no new scenario state; the
cluster is running exactly as you left it on the hardening page.

You now have the whole runbook: take a topology shape, size its resources,
stand it up declaratively, change it without downtime, roll it forward
safely, and lock it down. That runbook is the minimum baseline for
operating any NATS cluster in production, not only this one.

## Production checklist

Every page in this chapter closed with a Pitfalls section. This collects
the action items from all of them in one place as a last pass before you
run real orders through the cluster. Each group links back to the page
that explains the why.

### Sizing & resources — see [Pitfalls](/learn/deployment/sizing-and-resources#pitfalls)

- [ ] Set `max_file_store` to a size the disk can actually hold; an oversized limit lets JetStream error mid-publish instead of failing fast. Test small (`10GB`) and watch `df -h`.
- [ ] Keep `max_payload` at or below `max_pending`; a `max_payload` larger than `max_pending` refuses the server start. Hold `max_pending` at `≥ 10×` your peak message size.
- [ ] Raise the file-descriptor limit before the process starts (`ulimit -n 800000`); a big cluster spends about two FDs per stream plus routes and gossip and exhausts the default cap.
- [ ] Keep server versions aligned as you roll operator-mode upgrades, so every node reads the same JWT limit fields; account limits change only when you edit and push the account JWT, not on a server reload.
- [ ] Read the live limits with `nats account info` before sizing, so you plan against the limits the server actually enforces.

### Kubernetes — see [Pitfalls](/learn/deployment/kubernetes#pitfalls)

- [ ] Use `volumeClaimTemplates` (the Helm default) so each PVC binds before its StatefulSet replica starts; an unbound PVC leaves the pod Pending.
- [ ] Run the config reloader sidecar; a ConfigMap edit does not reload the server on its own.
- [ ] Raise the readiness failure threshold so the probe doesn't flap not-ready during a healthy JetStream rebalance.
- [ ] Never mix `nats` CLI mutations with a CRD-owned stream; NACK re-creates a deleted stream on its ~30s resync, and in `--control-loop` mode it also reverts manual config edits on about a one-minute cycle.
- [ ] Confirm the CRD-created stream is R3 with `nats stream info ORDERS` from nats-box before trusting the declarative path.

### Config management — see [Pitfalls](/learn/deployment/config-management#pitfalls)

- [ ] Write include paths as absolute paths; an include resolves relative to the config file's directory, not the working directory.
- [ ] Fit a SIGHUP inside the graceful window; a reload during a rebalance can interrupt leadership transfer.
- [ ] Monitor TLS cert expiry as you rotate it; a rotation without monitoring leaves old connections hung on an expired cert.
- [ ] Trim oversized streams by hand after lowering `max_file`; a reload changes the ceiling, not the contents, so new writes fail until an admin trims.
- [ ] Dry-run every config change with `nats-server -c nats.conf -t` before you reload it.

### Rolling upgrades — see [Pitfalls](/learn/deployment/rolling-upgrades#pitfalls)

- [ ] Measure rebalance time before setting `lame_duck_duration`; a duration shorter than the rebalance drops clients before replicas sync.
- [ ] Transfer leadership before killing the meta-leader; upgrading it directly stalls stream ops until a new leader is elected (about 5 to 10 seconds with default timeouts). Do non-leaders first.
- [ ] Set a PodDisruptionBudget with `minAvailable: 2`; without it an eviction can drain all three pods and lose quorum.
- [ ] Stagger lame-duck start across ordinals; firing it on every node at once triggers a reconnect storm.
- [ ] Read replicas and leader with `nats stream info ORDERS` before and after the upgrade to confirm the stream stayed R3.

### Hardening — see [Pitfalls](/learn/deployment/hardening#pitfalls)

- [ ] Keep the JetStream `store_dir` (and the pid/ports-file dirs) inside `ReadWritePaths`; `ProtectSystem=strict` blocks writes there, not the cert reads a reload does.
- [ ] Set `MemoryMax` above the node's real peak usage (memory store plus buffers plus GC headroom); a cap below the working set gets the process OOM-killed under load, not at startup.
- [ ] Open cluster port 6222 between nodes; a firewall that blocks it leaves nodes unable to form quorum and showing as orphans.
- [ ] Bind the monitor port 8222 to localhost; exposed to the internet it leaks version, client count, and memory.
- [ ] Connect with `--creds` and `--tlsca` and publish one order to prove auth and TLS are live before you call the cluster hardened.

## See also

- [Reference → Configuration](/reference/config) — every config key, flag,
  default, and limit, versioned and exhaustive.
- [Topologies deep dive](/learn/topologies) — the shape this chapter runs.
- [Monitoring deep dive](/learn/monitoring) — what to watch once the
  cluster is live.
