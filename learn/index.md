---
id: index
title: Learn
sidebar_position: 1
description: Long-form deep dives into NATS subsystems
---

# Learn

This section holds the long-form deep dives in the NATS documentation.
Each deep dive walks through one subsystem from first encounter to
working confidence, building up a single running scenario, the Acme
`ORDERS` platform, step by step.

Deep dives sit between two other layers of the docs:

- **[Concepts](/concepts/intro/)** Short primers and Getting
  Started. Read those first if you're new to NATS.
- **[Reference](/reference/)** Exhaustive, versioned catalog of
  every configuration option, header, and wire-protocol detail. Deep
  dives link out to Reference for the full surface area, since Reference
  is a catalog rather than a teaching resource.

Every deep dive follows the same pattern: it uses one running scenario,
introduces at most two new concepts per page, provides runnable examples
in CLI and the client libraries, and links out to Reference for the
remaining detail.

## Develop

Build applications with NATS.

- **[Core NATS](/learn/core-nats/)** the foundation:
  connections, publish-subscribe, subjects and wildcards,
  request-reply, queue groups, scatter-gather, headers, and
  server-side subject mapping.
- **[Services](/learn/services/)** the micro request-reply
  framework: endpoints, groups, discovery, observability, and scaling.
- **[JetStream](/learn/jetstream/)** the persistence layer:
  streams, consumers, and the acknowledgment loop, built up from a
  single `ORDERS` stream.
- **[Resilient Clients](/learn/resilient-clients/)**
  production-grade connections: reconnection, drain, slow consumers,
  request-reply resilience, and TLS plus auth.
- **[Key-Value Store](/learn/key-value/)** buckets,
  watches, history and revisions, TTLs, and how KV sits on top of a
  stream.
- **[Object Store](/learn/object-store/)** chunked blobs over
  JetStream, with metadata, links, and listing.

## Operate

Run, scale, and secure NATS.

- **[Topologies](/learn/topologies/)** Topological shapes: a single
  server growing into a cluster, a super-cluster, and leaf nodes at the
  edge.
- **[Security](/learn/security/)** authentication, authorization,
  and accounts: centralized and decentralized auth, TLS, and auth
  callout.
- **[Clustering & Replication](/learn/clustering/)** the
  mechanism under a cluster: routes and gossip, RAFT and leaders, `R=3`
  quorum, placement, and peer management.
- **[Monitoring & Observability](/learn/monitoring/)** the
  monitoring endpoints, JetStream health, advisories and events, and
  Prometheus with dashboards.
- **[Backup & Recovery](/learn/backup-recovery/)** stream
  snapshots, mirrors for disaster recovery, a recovery runbook, and
  backing up identity.
- **[Deployment & Upgrades](/learn/deployment/)**
  production: sizing, Kubernetes, config management, rolling upgrades,
  and hardening.
- **[MQTT](/learn/mqtt/)** running `nats-server` as the MQTT
  broker for your devices: topic-to-subject conversion, QoS, sessions
  and retained messages, and MQTT users on a cluster.
- **[WebSocket](/learn/websocket/)** the NATS protocol over a
  WebSocket transport: browser clients, origin checking and cookie
  credentials, TLS behind a proxy, and leaf nodes over port 443.

## Where to start

If you're new to NATS, start with the
[Core NATS deep dive](/learn/core-nats/); it's the foundation every
other chapter builds on. If you're already comfortable with the basics
and here for persistence, go straight to the
[JetStream deep dive](/learn/jetstream/).
