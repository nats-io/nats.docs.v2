---
id: index
title: "Decisions"
description: "One page per design question, each with a default answer and a table of when to deviate"
---
# Decisions

Every page here answers one question you'll face while designing a NATS system. Read the summary for the default, then the table for your case.

## Pages

| Question | Default answer |
| --- | --- |
| [Core NATS or JetStream?](/architecture/decisions/core-or-jetstream) | Decide per subject whether a missed message has consequences; if it doesn't, stay on core NATS |
| [Which consumer type?](/architecture/decisions/consumer-type) | Pull consumers by default; ordered consumers for single-reader scans; push only for legacy or specific delivery needs |
| [What replication factor?](/architecture/decisions/replication-factor) | R3 for anything you can't afford to lose, R1 for disposable or re-creatable data, never R2 |
| [How many streams, and what goes in each?](/architecture/decisions/stream-layout) | Group by retention and access pattern, not by tenant or entity; use subjects for structure inside a stream |
| [Key-Value, stream, or Object Store?](/architecture/decisions/kv-stream-or-object-store) | Streams for events, Key-Value for latest state with history, Object Store for blobs above the payload limit |
| [Cluster, super-cluster, or leaf nodes?](/architecture/decisions/cluster-supercluster-or-leaf) | One cluster per low-latency zone, gateways between zones, leaf nodes at the edge or behind a boundary |
| [How many accounts?](/architecture/decisions/accounts-and-tenancy) | One account per trust boundary; tenants, environments, and teams are boundaries, services inside one team usually aren't |
| [Which auth model?](/architecture/decisions/auth-model) | Config-file auth for a single team, operator mode for many teams or tenants, auth callout when identity lives elsewhere |

