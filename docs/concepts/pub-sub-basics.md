---
id: pub-sub-basics
title: Publish-Subscribe
sidebar_position: 2
description: The foundational messaging pattern in NATS — everything else builds on this
---

# Publish-Subscribe

Everything in NATS starts with publish-subscribe. A publisher sends a message to a subject, and every subscriber listening on that subject gets a copy. This is the foundation everything else builds on.

For a runnable, step-by-step treatment, see the [Core NATS deep dive](/learn/core-nats).

<div class="nats-flow" data-scenario="publishSubscribeAnimated" data-width="600" data-height="350"></div>

Watch how messages flow as subscribers join. With no subscribers, messages reach the server but aren't delivered. As subscribers connect, each one receives a copy of every message.

## How It Works

1. **Publishers** send messages to a [subject](./subjects) — a simple string like `orders.created`
2. **Subscribers** express interest in subjects they care about
3. **NATS delivers** a copy of each message to every matching subscriber
4. **No coupling** — publishers don't know about subscribers, and subscribers don't know about publishers

This decoupling gives you tremendous flexibility. Services can be added, removed, or restarted without coordinating with anyone else.

## Publishing Messages

You publish a message by sending it to a subject:

<div class="nats-example" data-type="basics-publish" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

Key points:
- Publishers don't wait for acknowledgments (fire-and-forget)
- Messages are delivered to all active subscribers
- If no subscribers exist, the message is simply discarded

## Subscribing to Subjects

Subscribers express interest in subjects to receive messages:

<div class="nats-example" data-type="basics-subscribe" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

## When to Use Pub/Sub

Publish-subscribe is ideal when multiple services need to react to the same event:

- **Event broadcasting** — notify services about user signups, order placements, deployments
- **Data distribution** — send updates to multiple dashboards or monitoring services
- **Fan-out notifications** — alert all interested parties about state changes
- **Audit logging** — multiple services independently log the same events

### Real-world example

Imagine an e-commerce system where an order is placed. You publish a single event:

```bash
nats pub orders.created '{"orderId": "123", "total": 99.99}'
```

Multiple services subscribe and each reacts differently:
- **Inventory Service** updates stock levels
- **Email Service** sends a confirmation email
- **Analytics Service** records metrics
- **Shipping Service** prepares the shipment

One publish, four independent reactions — no coordination needed.

## Pub/Sub Patterns

### Fan-Out
One publisher, multiple subscribers — perfect for event notification:

<div class="nats-flow" data-scenario="fanOut" data-width="600" data-height="450"></div>

### Fan-In
Multiple publishers, one subscriber — ideal for aggregation:

<div class="nats-flow" data-scenario="fanIn" data-width="600" data-height="450"></div>

## Subject Hierarchies

NATS subjects support hierarchical naming using dots (`.`) as delimiters:

```text
orders.us.created
orders.eu.created
orders.us.canceled
```

This creates logical namespaces for organizing your messages. You can use wildcards to subscribe across hierarchies — `orders.*.created` catches orders from any region.

For a deep dive into subjects, hierarchies, wildcards, and naming conventions, see [Subjects](./subjects).

## How Delivery Works

- **At-most-once delivery**: Core NATS delivers messages without persistence. If you need guaranteed delivery, that's what [JetStream](jetstream) is for.
- **Active subscribers only**: Only subscribers connected when the message is published will receive it. Messages aren't stored for later.
- **Every subscriber gets a copy**: Subscribing doesn't consume or remove messages — each subscriber independently receives its own copy.
- **Message size**: NATS has a default max message size of 1MB (configurable). For large data, consider using object stores or passing references.
- **Subscription efficiency**: NATS handles millions of subscriptions efficiently. Use wildcards to reduce subscription overhead when possible.

## Try It Yourself

Open two terminals and see pub/sub in action:

```bash
# Terminal 1 — subscribe to all demo messages
nats sub 'demo.>'

# Terminal 2 — publish some messages
nats pub demo.hello "Hello NATS!"
nats pub demo.greeting "Welcome to pub/sub"
nats pub demo.test.nested "Hierarchical subjects work!"
```

You'll see each message arrive in Terminal 1 the instant it's published. Try opening a third terminal with another `nats sub 'demo.>'` — both subscribers will receive every message.

## Next steps

- [Core NATS deep dive](/learn/core-nats) — the full runnable walkthrough
- [Publish-subscribe, step by step](/learn/core-nats/publish-subscribe) — build pub/sub up from scratch
- [Subjects](./subjects) — the addressing system that makes pub/sub flexible
- [Queue Groups](./queue-groups) — same pub/sub, but with built-in load balancing
- [Request-Reply](./request-reply) — pub/sub with a reply subject for synchronous patterns
