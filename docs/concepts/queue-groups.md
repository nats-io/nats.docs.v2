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

<div class="nats-example" data-type="queue-groups-basic" data-languages="cli,go,rust"></div>

## Dynamic Scaling

One of the most powerful features of queue groups is dynamic scaling without configuration changes:

<div class="nats-example" data-type="queue-groups-dynamic-scaling" data-languages="cli,go,rust"></div>

## Queue Groups with Request-Reply

Queue groups are perfect for building scalable services with request-reply:

<div class="nats-example" data-type="queue-groups-request-reply" data-languages="cli,go,rust"></div>

## Mixed Subscribers

Queue groups can coexist with regular subscribers. This enables patterns like:
- Audit logging (regular subscriber sees all messages)
- Monitoring (regular subscriber tracks all activity)
- Processing (queue group handles the work)

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

## Queue Group Naming

Queue group names follow the same rules as subjects:

- **Case sensitive**: `Workers` ≠ `workers`
- **Allowed characters**: Alphanumeric, `-`, `_`
- **No whitespace**: Spaces not permitted
- **Hierarchical**: Can use `.` for organization (e.g., `api.v1.workers`)

## Best Practices

### Naming Conventions

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
