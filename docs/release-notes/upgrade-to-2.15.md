---
title: Upgrade to NATS 2.15
sidebar_label: Upgrade to 2.15
description: What changes when you move a NATS deployment from 2.14.x to 2.15 — new features, upgrade considerations, and downgrade steps.
---

# Upgrade to NATS 2.15

This guide is tailored for existing NATS users upgrading from NATS version v2.14.x to v2.15.x. This will read as a summary with links to specific documentation pages to learn more about the feature or improvement.

**Important:** Due to the desired state changes in the metalayer, we highly recommend upgrading from at least v2.14.7 to v2.15.x for the smoothest upgrade experience (see upgrade considerations below).

For the complete changelog, see the [v2.15.0 release notes on GitHub](https://github.com/nats-io/nats-server/releases/tag/v2.15.0). For the story behind the release, see the [announcement post](https://nats.io/blog/nats-server-2.15-release/).

## Features

### Operations

* **Desired state metalayer:** The metalayer has been reworked to use desired state reconciliation for all stream and consumer scaling, moving, adding peers, removing peers etc. making it safer and more reliable. More information is available in [ADR-62](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-62.md). See also the upgrade considerations below.
* **Evacuate endpoints:** Stream and consumer assets can now be more easily migrated off a specific server in bulk, for example, before decommissioning a node. There are separate endpoints to allow: all assets to be evacuated off a server, a single stream and its consumers to be evacuated, and a single consumer to be evacuated, ensuring highest flexibility during operations. When evacuating, assets keep their existing replica count and new replica nodes will be assigned automatically. More information is available in [ADR-62](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-62.md).
* **Metalayer rescue for disaster recovery:** The server now has a supported way of temporarily lowering the quorum needed for the metalayer to allow peer-removing dead nodes during a disaster recovery scenario. However, this kind of reconfiguration is unsafe and should only be used as a last resort; it is not to be used as a substitute for managing the cluster’s peers properly. More information is available in [ADR-61](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-61.md).
* **Domain-prefixed JS API in system account:** Systems that bridge the system account onto connected leafnodes on different domains can now manage them while directly connected to the hub by specifying the JetStream domain to act on.
* **Streams now have a default limit of 1000 consumers:** To prevent unbounded consumer creation on a stream, a default limit of 1000 consumers per stream is applied. An explicit value for `max_consumers` can be specified in the stream config or account limits to allow for more consumers on a single stream, or by increasing the default, see below.

### Streams

* **Stream backup and restore v2:** New stream backup format that stores the messages in a format that can be parsed and manipulated using the NATS CLI, rather than the on-disk format. This now also allows backing up and restoring memory-based streams. More information is available in [ADR-63](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-63.md).
* **Cancel stream move endpoint:** A stream that is midway through moving from cluster A to B can now be reliably canceled through the cancel move endpoints. More information is available in [ADR-62](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-62.md).
* **Detect source stream recreation:** Recreating a stream that is being sourced by another stream would previously stop the sourcing until it had reached the previously sourced highest sequence. The server can now detect that a sourced stream was recreated, automatically restarting sourcing of the new messages from the correct sequence number.
* **Stream source indexing:** Stream sources now keep a separate index that persists the highest sourced sequence for a particular source. Apart from exposing this in the stream info, it’s also used to prevent expensive backward scans (for example during leader changes) to find out this highest sourced sequence.
* **Shorter wait for durable source/mirror consumer resets:** When using a durable consumer for sourcing/mirroring the heartbeat of this consumer can now short-circuit the exponential recreation backoff, allowing the sourcing/mirroring to pick back up more quickly.

## Improvements

* **Sync performance changes for replicated streams:** Replicated streams now batch more aggressively, greatly improving performance especially on setups using `sync:always` since it now syncs messages as a group instead of for every single message.
* **The `js_raft_delete_range`  feature is now enabled by default:** When mirroring a stream with huge delete gaps the server now proposes a single delete range instead of individual message deletes (see upgrade considerations below).
* **The `no_advertise` option for leafnodes no longer includes the hub’s own listener:** Previously the server would include its own listener address even when `no_advertise` was set. This is no longer the case, relying only on configured URLs.
* **Leafnode isolation using `request_isolation`, or with hub-enforced `isolate`, now works correctly across cluster nodes:** Previously, east-west interest isolation only worked correctly when all leafnode connections were connected to a single hub node. With this change, isolation between leafnodes connecting to different cluster nodes is also correctly enforced, useful in particular for reducing protocol traffic across large fleets of leafnodes that require only north-south communication.

## Upgrade considerations

### Desired state metalayer

**Important:** Due to these changes in the metalayer, we highly recommend upgrading from at least v2.14.7 to v2.15.x for the smoothest upgrade experience.

The 2.15 release completely reworks what happens when scaling or moving streams and consumers, as well as how peer additions and removals are handled, making them all significantly more reliable. The servers now implement a complete desired state reconciliation loop: peer additions and removals are handled at the correct time by the asset leader during moves, ensuring high availability throughout the migration.

The v2.14.7 (and higher) releases contain compatibility code making them compatible with 2.15’s desired state model. Servers that still run on 2.14 will not run 2.15’s desired state to completion, but they will persist its models. If you’d perform stream/consumer scales or moves during the upgrade, expect those operations to stall until the upgrade to 2.15 completes. Take note however that replicated streams and consumers will remain available without interruption as usual, it’s purely converging to the desired/updated peer set by scaling or moving a stream that may take longer than usual.

Generally we recommend to not issue any stream or consumer updates that can trigger scales or moves (if it is possible to postpone them) until after the upgrade has completed across all cluster nodes. Stream and consumer creation and deletion does not need to be deferred and can continue as usual, even through mixed versions.

### Streams now have a default limit of 1000 consumers

The 2.15 release adds a default limit of 1000 consumers per stream to prevent situations where applications accidentally creating an unbounded number of consumers can cause wider system instability. This default can easily be raised or lowered either by specifying `max_consumers` in the stream config or within the account limits. With this change, it will be necessary to plan for a high expected number of consumers (including, for example, KV watchers) on a given stream ahead of time.

The default limit can also be adjusted by specifying the `default_max_consumers` setting in the server config. To restore pre-2.15 behaviour with no default per-stream consumer limit, it can also be set to `-1` meaning ‘unlimited’.

```
jetstream {
  limits {
    default_max_consumers: 1000
  }
}
```

### Feature flags

The only feature flag that switches its default in 2.15 is `js_raft_delete_range`. When mirroring a stream with huge delete gaps into a replicated stream, this would result in individual message deletes for every single message that was deleted. With this feature flag enabled the server instead proposes a single delete range, which is more efficient. Support for this operation has already been available throughout 2.14, so you don’t need to make any changes to your system and this flag is safely enabled when upgrading to 2.15. However, this may cause problems when upgrading to 2.15 directly from 2.12 or earlier.

The `js_ack_fc_v2` flag keeps its 2.14 default in 2.15, which is the v1 acknowledgement and flow control reply subject format. The default changes to the v2 format in 2.16. If you have account imports/exports or subject permissions containing the `$JS.ACK.<stream>.>` or `$JS.FC.<stream>.>` (or more granular) subjects, you need to update them before upgrading to 2.16. See [domain-aware acknowledgement and flow control subjects](/release-notes/upgrade-to-2.14#domain-aware-acknowledgement-and-flow-control-subjects) in the 2.14 upgrade guide for the details.

## Downgrade considerations

### Desired state metalayer

**Important:** Due to these changes in the metalayer, we only recommend downgrading to v2.14.7 or higher.

As mentioned above, a server running 2.14 does not run 2.15’s desired state to completion, i.e. a scale or move started on 2.15 will not complete at all after the downgrade to 2.14. If you do not perform any new stream/consumer updates after that, which would overwrite 2.15’s desired state, then upgrading back to 2.15 again will re-evaluate and complete these changes. If this is not your intention, you can send a “no-op” stream or consumer update with the exact same config, which will remove desired state information from the configuration and revert to running under the pre-2.15 behaviour.

### Streams now have a default limit of 1000 consumers

If you had manually overwritten the `default_max_consumers` setting in the server config, you’ll need to remove it when downgrading to 2.14. However, a stream or account limit will continue to be enforced as normal.

### Feature flags

The feature flag `js_raft_delete_range` was disabled by default but supported throughout version 2.14. There’s no need to adjust the feature flags during this downgrade, but you can decide to opt-in manually on 2.14.

```
feature_flags {
  js_raft_delete_range: true
}
```
