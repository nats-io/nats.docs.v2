---
title: Request-Reply
description: Synchronous communication pattern in NATS
---

# Request-Reply

Request-Reply is a communication pattern that brings synchronous communication to NATS's asynchronous messaging system. It allows a client to send a request and wait for a response, building RPC-style interactions on top of the core publish-subscribe mechanism.

For a runnable, step-by-step treatment, see the [request-reply chapter in the Core NATS deep dive](/learn/core-nats/request-reply).

## How Request-Reply Works

Under the hood, request-reply uses NATS's publish-subscribe with these steps:

1. **Client creates a unique reply subject** (inbox)
2. **Client subscribes to the reply subject**
3. **Client publishes the request** with the reply subject
4. **Service receives the request** and sees the reply subject
5. **Service publishes the response** to the reply subject
6. **Client receives the response**

This pattern is so common that NATS clients provide a simplified `request()` method that handles all these steps automatically.

<div class="nats-flow" data-scenario="requestReply" data-width="800" data-height="350"></div>

In the animation above:
- The **orange arrow** shows the request flowing from client to service
- The **green dashed arrow** shows the reply flowing back
- This demonstrates the bidirectional, synchronous nature of request-reply

## Basic Request-Reply

<div class="nats-example" data-type="request-reply-basic" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

## Handling Timeouts

Timeouts are crucial in request-reply to prevent indefinite waiting. All NATS clients support configurable timeouts:

<div class="nats-example" data-type="request-reply-timeout" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

## Multiple Responders

When multiple services subscribe to the same request subject, NATS supports two distinct patterns depending on whether queue groups are used:

### Pattern 1: All Services Respond (Scatter-Gather)

If each app creates a "service" subscription, all of them will receive the request and **all** can respond. The client can collect multiple responses:

<div class="nats-flow" data-scenario="requestReplyScatterGather" data-width="800" data-height="450"></div>

In this pattern, one request is broadcast to all three services (A, B, C), and all three send responses back. This is useful for:
- Gathering data from multiple sources
- Aggregating results from distributed services
- Querying multiple replicas for consensus

### Pattern 2: One Service Responds (Load Balancing)

With [queue groups](./queue-groups), **only one** service receives the request and responds, providing automatic load balancing for scalability:

<div class="nats-flow" data-scenario="requestReplyQueueGroup" data-width="800" data-height="450"></div>

In this pattern, NATS selects one service from the queue group (Service B in this example) to handle the request. This provides:
- Automatic load distribution across service instances
- Horizontal scalability
- Built-in failover (if one service is down, another handles it)

By default, the `request()` method returns the first response and drops the rest. The example below starts multiple responders and shows the client receiving a single reply. To gather every response, subscribe to a reply inbox directly and read messages until a timeout instead of calling `request()`.

<div class="nats-example" data-type="request-reply-multiple-responders" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

## No Responders Detection

NATS will detect when no services are available to handle a request. When there are no subscribers for the request subject, NATS server will return a "no responders" error immediately:

<div class="nats-example" data-type="request-reply-no-responders" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

## Request with Headers

NATS supports headers in request-reply, enabling metadata exchange:

<div class="nats-example" data-type="request-reply-headers" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

## Best Practices

### Timeout Strategy

- **Set appropriate timeouts**: Too short may miss valid responses, too long blocks unnecessarily
- **Consider network latency**: Add buffer for network round-trip time
- **Implement retry logic**: For transient failures

### Error Handling

- **Always handle timeouts**: Don't assume responses will arrive
- **Check for no responders**: React appropriately when services are unavailable
- **Validate responses**: Ensure response data is valid before processing

### Service Design

- **Idempotent operations**: Requests might be retried
- **Lightweight processing**: Long operations should be async
- **Health checks**: Implement service health endpoints
- **Graceful shutdown**: Drain pending requests before shutting down

### Performance

- **Connection pooling**: Reuse connections for multiple requests
- **Inbox reuse**: Modern clients reuse inbox subjects for efficiency
- **Batch operations**: Group related requests when possible

## Request-Reply vs Publish-Subscribe

Choose request-reply when you need:
- **Synchronous communication**: Wait for a response before continuing
- **Service discovery**: Automatic "no responders" detection
- **Load balancing**: Combined with queue groups
- **RPC-style APIs**: Traditional request-response patterns

Use publish-subscribe when you need:
- **Fire-and-forget**: No response needed
- **Multiple consumers**: All subscribers should receive the message
- **Event streaming**: Continuous flow of events
- **Decoupled systems**: Publishers shouldn't know about subscribers

## Related Concepts

- [Subjects](./subjects) - Understanding subject-based addressing
- [Queue Groups](./queue-groups) - Load balancing for services
- [Publish-Subscribe](./pub-sub-basics) - Asynchronous messaging patterns

## Try It Yourself

Create a simple calculator service:

<div class="nats-example" data-type="request-reply-calculator" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

## Next steps

- [Request-reply in the Core NATS deep dive](/learn/core-nats/request-reply) — runnable, step-by-step walkthrough
- [The Services framework](/learn/services) — build production request-reply services
