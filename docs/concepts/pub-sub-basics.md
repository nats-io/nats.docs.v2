---
id: pub-sub-basics
title: Basics of Pub/Sub
sidebar_position: 2
---

# Basics of Publish-Subscribe

The publish-subscribe pattern is the foundation of NATS messaging. It enables decoupled, scalable communication between applications.

## Core Concepts

### What is Publish-Subscribe?

Publish-Subscribe (pub/sub) is a messaging pattern where:
- **Publishers** send messages without knowing who will receive them
- **Subscribers** receive messages without knowing who sent them
- **Subjects** act as the addressing mechanism

```
Publisher → Subject → Subscriber(s)
```

This decoupling provides tremendous flexibility in building distributed systems.

## How It Works in NATS

### 1. Publishing Messages

Publishers send messages to a **subject** - a simple string that acts as an address:

```javascript
// Publish a message to the 'weather.updates' subject
nc.publish('weather.updates', 'Temperature: 72°F');
```

Key points:
- Publishers don't wait for acknowledgments (fire-and-forget)
- Messages are delivered to all active subscribers
- If no subscribers exist, the message is discarded

### 2. Subscribing to Messages

Subscribers express interest in subjects to receive messages:

```javascript
// Subscribe to weather updates
const sub = nc.subscribe('weather.updates');

// Process incoming messages
for await (const msg of sub) {
  console.log(`Received: ${msg.string()}`);
}
```

### 3. Subject Hierarchies

NATS subjects support hierarchical naming using dots (`.`) as delimiters:

```
weather.us.california.sandiego
weather.us.california.losangeles
weather.eu.france.paris
```

This creates logical namespaces for organizing messages.

## Wildcards

NATS provides two wildcard characters for flexible subscriptions:

### Single Token Wildcard (`*`)
Matches exactly one token in the subject:

```javascript
// Subscribes to all US weather updates
nc.subscribe('weather.us.*');

// Matches:
// ✓ weather.us.california
// ✓ weather.us.newyork
// ✗ weather.us.california.sandiego (too many tokens)
```

### Multi-Token Wildcard (`>`)
Matches one or more tokens at the end of the subject:

```javascript
// Subscribes to all weather updates
nc.subscribe('weather.>');

// Matches:
// ✓ weather.us
// ✓ weather.us.california
// ✓ weather.us.california.sandiego
```

## Practical Examples

### Example 1: Simple Event Broadcasting

```javascript
// Event Publisher
function userLoggedIn(userId) {
  nc.publish('user.login', JSON.stringify({
    userId: userId,
    timestamp: Date.now()
  }));
}

// Event Subscriber (Analytics Service)
const sub = nc.subscribe('user.login');
for await (const msg of sub) {
  const event = JSON.parse(msg.string());
  console.log(`User ${event.userId} logged in`);
  // Update analytics...
}
```

### Example 2: Distributed Logging

```javascript
// Application components publish logs
nc.publish('logs.error', 'Database connection failed');
nc.publish('logs.info', 'Service started successfully');
nc.publish('logs.debug', 'Processing request ID: 12345');

// Centralized logger subscribes to all log levels
const sub = nc.subscribe('logs.>');
for await (const msg of sub) {
  // Write to file, send to monitoring service, etc.
  saveToLogFile(msg);
}
```

### Example 3: Multi-Region Data Distribution

```javascript
// Regional sensors publish data
nc.publish('sensors.us.west.temp', '72');
nc.publish('sensors.eu.north.temp', '15');
nc.publish('sensors.asia.east.temp', '28');

// Subscribe to all temperature sensors globally
nc.subscribe('sensors.>.temp', (msg) => {
  updateGlobalDashboard(msg);
});

// Subscribe to specific region
nc.subscribe('sensors.us.>', (msg) => {
  updateUSRegionDashboard(msg);
});
```

## Pub/Sub Patterns

### Fan-Out
One publisher, multiple subscribers - perfect for event notification:

```
                ┌──► Subscriber A
Publisher ──────┼──► Subscriber B
                └──► Subscriber C
```

### Fan-In
Multiple publishers, one subscriber - ideal for aggregation:

```
Publisher A ──┐
Publisher B ──┼────► Subscriber
Publisher C ──┘
```

### Topic Routing
Using subjects to route messages to specific handlers:

```javascript
// Different handlers for different event types
nc.subscribe('orders.created', handleNewOrder);
nc.subscribe('orders.shipped', handleShipment);
nc.subscribe('orders.cancelled', handleCancellation);
```

## Best Practices

### 1. Subject Naming Conventions
Create a clear hierarchy that reflects your domain:
```
<domain>.<entity>.<action>
app.user.created
app.order.processed
app.payment.completed
```

### 2. Message Serialization
Use consistent serialization across your system:
```javascript
// Standardize on JSON for complex data
const publish = (subject, data) => {
  nc.publish(subject, JSON.stringify(data));
};

const subscribe = (subject, handler) => {
  nc.subscribe(subject, (msg) => {
    const data = JSON.parse(msg.string());
    handler(data);
  });
};
```

### 3. Error Handling
Always handle potential subscription errors:
```javascript
const sub = nc.subscribe('important.events');

(async () => {
  try {
    for await (const msg of sub) {
      await processMessage(msg);
    }
  } catch (err) {
    console.error('Subscription error:', err);
    // Implement retry logic or alerting
  }
})();
```

### 4. Subscription Lifecycle
Clean up subscriptions when no longer needed:
```javascript
// Unsubscribe after processing 10 messages
const sub = nc.subscribe('limited.events', { max: 10 });

// Or manually unsubscribe
const sub = nc.subscribe('temp.events');
// ... later ...
sub.unsubscribe();
```

## Advanced Features

### Queue Groups
Automatically load balance messages across subscribers:

```javascript
// Multiple instances subscribe to the same queue group
nc.subscribe('work.tasks', { queue: 'workers' });

// Only one member of the 'workers' group receives each message
```

### Request-Reply
Built on pub/sub but adds synchronous communication:

```javascript
// Responder
nc.subscribe('time.request', (msg) => {
  msg.respond(new Date().toISOString());
});

// Requester
const response = await nc.request('time.request');
console.log('Server time:', response.string());
```

## Performance Considerations

### Message Size
- NATS has a default max message size of 1MB (configurable)
- For large data, consider using object stores or passing references

### Subscription Count
- NATS efficiently handles millions of subscriptions
- Use wildcards to reduce subscription overhead

### Delivery Guarantees
- Core NATS provides **at-most-once** delivery
- For guaranteed delivery, use JetStream

## Common Pitfalls and Solutions

### Pitfall 1: Message Loss
**Problem**: Messages published before subscribers connect are lost.
**Solution**: Use JetStream for persistence or implement a replay mechanism.

### Pitfall 2: Subject Explosion
**Problem**: Creating too many unique subjects.
**Solution**: Use wildcards and hierarchical naming to consolidate.

### Pitfall 3: Blocking Subscribers
**Problem**: Slow subscriber blocks message processing.
**Solution**: Process messages asynchronously or use queue groups.

## Try It Yourself

Here's a complete example to get you started:

```javascript
const NATS = require('nats');

async function demo() {
  // Connect to NATS
  const nc = await NATS.connect({ servers: 'localhost:4222' });
  
  // Create a subscriber
  const sub = nc.subscribe('demo.>');
  
  // Process messages asynchronously
  (async () => {
    for await (const msg of sub) {
      console.log(`[${msg.subject}]: ${msg.string()}`);
    }
  })();
  
  // Publish some messages
  nc.publish('demo.hello', 'Hello NATS!');
  nc.publish('demo.greeting', 'Welcome to pub/sub');
  nc.publish('demo.test.nested', 'Hierarchical subjects work!');
  
  // Give messages time to process
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Cleanup
  await nc.close();
}

demo().catch(console.error);
```

## Next Steps

Now that you understand pub/sub basics:

1. **[Getting Started](../getting-started)** - Build your first NATS application
2. **[Request-Reply Pattern](https://docs.nats.io/nats-concepts/core-nats/reqreply)** - Learn synchronous communication
3. **[Queue Groups](https://docs.nats.io/nats-concepts/core-nats/queue)** - Implement load balancing
4. **[JetStream](https://docs.nats.io/jetstream)** - Add persistence to your messaging

## Summary

The publish-subscribe pattern in NATS provides:
- **Decoupled communication** between services
- **Flexible routing** through subjects and wildcards
- **Scalable architecture** for distributed systems
- **Simple API** that's easy to understand and use

Master pub/sub, and you've mastered the heart of NATS messaging!