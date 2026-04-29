---
title: Topologies
description: How NATS scales from one server to a global mesh
sidebar_position: 6
---

# Topologies

NATS uses one protocol whether you run a single server or a global mesh. Servers connect into shapes — clusters for HA, superclusters across regions, leaf nodes for edge or account isolation — and clients see one logical NATS regardless of the shape behind it.

**When you'd use which:** single server for dev and small deployments; cluster for HA and JetStream replication within a site; supercluster for geo-distribution; leaf nodes for edge, IoT, hybrid cloud, or extending into another account.

```bash
# minimal cluster: each server points at the others as routes
nats-server -p 4222 -cluster nats://0.0.0.0:6222 \
  -routes nats://node2:6222,nats://node3:6222
```

[Deep dive: Deployment & Topologies →](/deployment/overview)
