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

Queue groups are your go-to solution for distributing work across multiple workers. Think of it like a team of people processing tasks from a shared inbox - each task goes to exactly one person, but everyone shares the workload.

The pattern is simple: multiple subscribers use the same queue group name when subscribing to a subject. NATS then ensures each message is delivered to only one member of that group, chosen randomly. This gives you instant load balancing without any external infrastructure.

**Common use cases:**
- Background job processing (email sending, image resizing, data imports)
- API request handling across multiple service instances
- Event processing pipelines where each event needs single processing
- Batch operations that can be parallelized

<div class="nats-example" data-type="queue-groups-basic" data-languages="cli,go,rust"></div>

## Dynamic Scaling

One of the most powerful features of queue groups is dynamic scaling without configuration changes. You can add or remove workers at any time - even while the system is running - and NATS automatically adjusts the distribution.

When you add a new worker, it immediately starts receiving messages. When a worker shuts down or crashes, NATS stops routing messages to it within milliseconds. There's no configuration to update, no load balancer to reconfigure, and no coordination protocol to implement.

This makes queue groups perfect for auto-scaling scenarios. Your orchestration system (Kubernetes, ECS, etc.) can spin up new workers based on metrics like CPU usage or queue depth, and they'll instantly participate in message processing.

**Real-world scenarios:**
- **Traffic spikes**: Add workers during peak hours, remove them during off-hours
- **Gradual rollouts**: Start new version workers alongside old ones, gradually shift traffic
- **Cost optimization**: Scale down to zero workers when idle, scale up on demand
- **Testing in production**: Add a single test worker to receive real traffic safely

<div class="nats-example" data-type="queue-groups-dynamic-scaling" data-languages="cli,go,rust"></div>

## Queue Groups with Request-Reply

Queue groups shine in request-reply patterns because they let you build horizontally scalable services without a service mesh or API gateway. Each request goes to exactly one available service instance, giving you automatic load balancing and high availability.

When a client sends a request, NATS routes it to one random member of the queue group. That member processes the request and sends back a reply. If you have 10 service instances in the queue group, NATS naturally distributes requests across all 10.

The beauty is in the simplicity: your service code doesn't need to know about other instances, handle leader election, or coordinate work. Just subscribe with a queue group name and start responding to requests.

**Perfect for:**
- Microservices APIs (authentication, payments, user management)
- RPC-style services where each request needs exactly one response
- Services with expensive operations (database queries, external API calls)
- Stateless services that can handle requests independently

<div class="nats-example" data-type="queue-groups-request-reply" data-languages="cli,go,rust"></div>

## Mixed Subscribers

Queue groups can coexist with regular subscribers on the same subject, enabling powerful hybrid patterns. Regular subscribers receive every message (traditional pub-sub), while queue group members share the load (distributed processing).

This combination lets you separate concerns cleanly: use queue groups for operational work that needs to happen exactly once, and regular subscribers for observational tasks that need to see everything.

**Common patterns:**
- **Audit logging**: Regular subscriber records all events while queue group processes them
- **Monitoring**: Regular subscriber tracks metrics and health while workers handle requests
- **Multi-stage processing**: Queue group does primary processing, regular subscribers do secondary analysis
- **Debugging**: Temporarily add a regular subscriber to observe traffic without affecting processing

For example, you might have a `orders.created` subject where:
- A queue group named `"order-fulfillment"` handles order processing (only one worker processes each order)
- A regular subscriber feeds a real-time analytics dashboard (sees all orders)
- Another regular subscriber archives orders to cold storage (sees all orders)

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
