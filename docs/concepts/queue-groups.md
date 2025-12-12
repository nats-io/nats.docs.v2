---
title: Queue Groups
description: Built-in load balancing for NATS subscribers
---

# Queue Groups

In standard publish-subscribe, every subscriber receives every message. Queue groups change this: when subscribers share a **queue name**, NATS delivers each message to only **one randomly chosen member** of that group.

<div class="nats-flow" data-scenario="queueGroupAnimated" data-width="600" data-height="350"></div>

Watch how each message (animated dot) flows to only one worker, even though all three are subscribed. NATS automatically distributes the load.

## How It Works

Queue groups operate at the subject level - subscribers still filter messages by subject, but NATS adds distribution logic:

1. **Single member**: A lone subscriber in a queue group receives all messages for that subject
2. **Multiple members**: NATS randomly selects one member for each message
3. **Member joins/leaves**: Distribution automatically adjusts without configuration

The queue name is application-defined, not server-configured. Subscribers specify it when subscribing, and NATS handles the rest. If a selected member is slow or unresponsive, subsequent messages go to other members.

## Basic Queue Groups

Multiple subscribers use the same queue group name when subscribing to a subject. NATS ensures each message is delivered to only one member of that group, chosen randomly.

Common use cases: background job processing, API request handling across service instances, event processing pipelines, batch operations.

<div class="nats-example" data-type="queue-groups-basic" data-languages="cli,go,rust"></div>

## Dynamic Scaling

Add or remove workers at any time and NATS automatically adjusts distribution. When a worker joins, it immediately starts receiving messages. When it leaves, NATS stops routing to it within milliseconds.

Perfect for auto-scaling scenarios where orchestration systems (Kubernetes, ECS) spin up new workers based on metrics. Supports gradual rollouts, traffic spike handling, and cost optimization.

<div class="nats-example" data-type="queue-groups-dynamic-scaling" data-languages="cli,go,rust"></div>

## Queue Groups with Request-Reply

Queue groups enable horizontally scalable services without a service mesh or API gateway. Each request goes to exactly one service instance, providing automatic load balancing.

Your service code doesn't need to know about other instances, handle leader election, or coordinate work. Just subscribe with a queue group name and respond to requests.

<div class="nats-example" data-type="queue-groups-request-reply" data-languages="cli,go,rust"></div>

## Mixed Subscribers

Queue groups coexist with regular subscribers on the same subject. Regular subscribers receive every message (pub-sub), while queue group members share the load (work distribution).

Use queue groups for operational work that needs to happen exactly once, and regular subscribers for observational tasks (audit logging, monitoring, analytics).

<div class="nats-example" data-type="queue-groups-mixed-subscribers" data-languages="cli,go,rust"></div>

## Geo-Affinity in Super-Clusters

In globally distributed NATS super-clusters, queue groups exhibit **geo-affinity** - automatically preferring local workers when available.

### How It Works

When you have queue group subscribers distributed across multiple regions:

1. **Local preference**: Messages are delivered to workers in the same cluster/region as the publisher
2. **Automatic failover**: If no local workers are available, NATS routes to workers in other regions
3. **No configuration needed**: This happens automatically based on network topology

### Example Scenario

Consider a queue group named `"order-processors"` with workers in three regions:

| Region | Workers | Publisher Location |
|--------|---------|-------------------|
| **US-East** | 3 workers | ✅ Publisher here |
| **US-West** | 2 workers | - |
| **EU-West** | 2 workers | - |

**Result**: Messages from the US-East publisher are preferentially delivered to the 3 US-East workers. Only if all US-East workers are unavailable will messages route to US-West or EU-West workers.

### Benefits

- **Lower latency**: Local processing is faster
- **Reduced bandwidth**: Fewer cross-region transfers
- **Natural failover**: Automatic global distribution if local workers fail
- **No configuration**: Works out of the box in super-clusters

## Best Practices

### Naming Conventions

Queue groups follow similar naming conventions as subjects. Here are some common patterns:


```
# Service-based naming
api.auth.workers
api.payments.workers
api.notifications.workers

# Environment-based naming
prod.order-processors
staging.order-processors
dev.order-processors

# Version-based naming
service.v1.workers
service.v2.workers
```

### Worker Design

1. **Idempotent processing**: Messages might be redelivered
2. **Graceful shutdown**: Drain messages before stopping
3. **Error handling**: Failed messages should be handled appropriately
4. **Health checks**: Monitor worker health and availability

### Scaling Strategy

1. **Start small**: Begin with few workers
2. **Monitor metrics**: Track queue depth and processing time
3. **Scale based on load**: Add workers when queue grows
4. **Auto-scaling**: Use metrics to automatically scale

### Monitoring

Track these metrics for queue groups:
- Message processing rate
- Queue depth (with JetStream)
- Worker count
- Processing latency
- Error rates

## Related Concepts

- [Subjects](./subjects) - Understanding subject-based messaging
- [Request-Reply](./request-reply) - Synchronous communication patterns
- [Publish-Subscribe](./pub-sub-basics) - One-to-many messaging

## Try It Yourself

Create a simple work distribution system:

<div class="nats-example" data-type="queue-groups-try-it" data-languages="cli"></div>
