---
id: pub-sub-basics
title: Basics of Pub/Sub
sidebar_position: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Basics of Publish-Subscribe

The publish-subscribe pattern is the foundation of NATS messaging. It enables decoupled, scalable communication between applications.

## Core Concepts

### What is Publish-Subscribe?

Publish-Subscribe (pub/sub) is a messaging pattern where:
- **Publishers** send messages without knowing who will receive them
- **Subscribers** receive messages without needing to know who sent them
- **Subjects** act as the addressing mechanism


This decoupling provides tremendous flexibility in building distributed systems.

<div class="nats-flow" data-scenario="publishSubscribeAnimated" data-width="600" data-height="350"></div>

Watch how messages flow as subscribers join. With no subscribers, messages reach the server but aren't delivered. As subscribers connect, each receives a copy of every message.

## How It Works in NATS

### 1. Publishing Messages

Publishers send messages to a [subject](./subjects) - a simple string that acts as an address:


<div class="nats-example" data-type="basics-publish" data-languages="cli,go,rust"></div>

Key points:
- Publishers don't wait for acknowledgments (fire-and-forget)
- Messages are delivered to all active subscribers
- If no subscribers exist, the message is discarded

### 2. Subscribing to Messages

Subscribers express interest in subjects to receive messages:

<div class="nats-example" data-type="basics-subscribe" data-languages="cli,go,rust"></div>

### 3. Subject Hierarchies

NATS subjects support hierarchical naming using dots (`.`) as delimiters:

```
weather.us.california.sandiego
weather.us.california.losangeles
weather.eu.france.paris
```

This creates logical namespaces for organizing messages. For a deep dive into subjects, hierarchies, wildcards, and advanced patterns, see [Subjects](./subjects).

## Practical Examples

### Example 1: Simple Event Broadcasting

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```bash
# Event Publisher
nats pub user.login '{"userId":"123","timestamp":1234567890}'

# Event Subscriber (in another terminal)
nats sub user.login
```

</TabItem>
<TabItem value="go" label="Go">

```go
// Event Publisher
type LoginEvent struct {
    UserID    string `json:"userId"`
    Timestamp int64  `json:"timestamp"`
}

func userLoggedIn(userId string) {
    event := LoginEvent{
        UserID:    userId,
        Timestamp: time.Now().Unix(),
    }
    data, _ := json.Marshal(event)
    nc.Publish("user.login", data)
}

// Event Subscriber (Analytics Service)
nc.Subscribe("user.login", func(msg *nats.Msg) {
    var event LoginEvent
    json.Unmarshal(msg.Data, &event)
    log.Printf("User %s logged in", event.UserID)
    // Update analytics...
})
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct LoginEvent {
    user_id: String,
    timestamp: i64,
}

// Event Publisher
async fn user_logged_in(user_id: String) -> Result<(), async_nats::Error> {
    let event = LoginEvent {
        user_id,
        timestamp: chrono::Utc::now().timestamp(),
    };
    let data = serde_json::to_string(&event)?;
    client.publish("user.login", data.into()).await?;
    Ok(())
}

// Event Subscriber (Analytics Service)
let mut sub = client.subscribe("user.login").await?;
while let Some(msg) = sub.next().await {
    let event: LoginEvent = serde_json::from_slice(&msg.payload)?;
    println!("User {} logged in", event.user_id);
    // Update analytics...
}
```

</TabItem>
</Tabs>

### Example 2: Distributed Logging

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```bash
# Application components publish logs
nats pub logs.error "Database connection failed"
nats pub logs.info "Service started successfully"
nats pub logs.debug "Processing request ID: 12345"

# Centralized logger subscribes to all log levels
nats sub 'logs.>'
```

</TabItem>
<TabItem value="go" label="Go">

```go
// Application components publish logs
nc.Publish("logs.error", []byte("Database connection failed"))
nc.Publish("logs.info", []byte("Service started successfully"))
nc.Publish("logs.debug", []byte("Processing request ID: 12345"))

// Centralized logger subscribes to all log levels
nc.Subscribe("logs.>", func(msg *nats.Msg) {
    // Write to file, send to monitoring service, etc.
    saveToLogFile(msg)
})
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust
// Application components publish logs
client.publish("logs.error", "Database connection failed".into()).await?;
client.publish("logs.info", "Service started successfully".into()).await?;
client.publish("logs.debug", "Processing request ID: 12345".into()).await?;

// Centralized logger subscribes to all log levels
let mut sub = client.subscribe("logs.>").await?;
while let Some(msg) = sub.next().await {
    // Write to file, send to monitoring service, etc.
    save_to_log_file(&msg).await;
}
```

</TabItem>
</Tabs>

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
Using subjects to route messages to specific handlers based on their topic.

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
Use consistent serialization across your system (JSON for complex data, protobuf for performance, etc.).

### 3. Error Handling
Always handle potential subscription errors with proper error handling and retry logic.

### 4. Subscription Lifecycle
Clean up subscriptions when no longer needed to prevent resource leaks.

## Advanced Features

### Queue Groups
Automatically load balance messages across subscribers:

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```bash
# Multiple instances subscribe to the same queue group
nats sub work.tasks --queue=workers

# Only one member of the 'workers' group receives each message
```

</TabItem>
<TabItem value="go" label="Go">

```go
// Multiple instances subscribe to the same queue group
nc.QueueSubscribe("work.tasks", "workers", func(msg *nats.Msg) {
    // Process work task
})

// Only one member of the 'workers' group receives each message
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust
// Multiple instances subscribe to the same queue group
let mut sub = client.queue_subscribe("work.tasks", "workers").await?;

// Only one member of the 'workers' group receives each message
```

</TabItem>
</Tabs>

### Request-Reply
Built on pub/sub but adds synchronous communication:

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```bash
# Responder (Terminal 1)
nats reply time.request "$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Requester (Terminal 2)
nats request time.request "" --timeout=2s
```

</TabItem>
<TabItem value="go" label="Go">

```go
// Responder
nc.Subscribe("time.request", func(msg *nats.Msg) {
    msg.Respond([]byte(time.Now().Format(time.RFC3339)))
})

// Requester
response, _ := nc.Request("time.request", nil, 2*time.Second)
fmt.Printf("Server time: %s\n", string(response.Data))
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust
// Responder
let mut sub = client.subscribe("time.request").await?;
while let Some(msg) = sub.next().await {
    if let Some(reply) = msg.reply {
        client.publish(reply, chrono::Utc::now().to_rfc3339().into()).await?;
    }
}

// Requester
let response = client.request("time.request", "".into()).await?;
println!("Server time: {}", String::from_utf8_lossy(&response.payload));
```

</TabItem>
</Tabs>

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

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```
# Terminal 1 - Create a subscriber for all demo messages
nats sub 'demo.>'

# Terminal 2 - Publish some messages
nats pub demo.hello "Hello NATS!"
nats pub demo.greeting "Welcome to pub/sub"
nats pub demo.test.nested "Hierarchical subjects work!"
```

</TabItem>
<TabItem value="go" label="Go">

```go
package main

import (
    "fmt"
    "log"
    "time"
    "github.com/nats-io/nats.go"
)

func main() {
    // Connect to NATS
    nc, err := nats.Connect("localhost:4222")
    if err != nil {
        log.Fatal(err)
    }
    defer nc.Close()

    // Create a subscriber
    nc.Subscribe("demo.>", func(msg *nats.Msg) {
        fmt.Printf("[%s]: %s\n", msg.Subject, string(msg.Data))
    })

    // Publish some messages
    nc.Publish("demo.hello", []byte("Hello NATS!"))
    nc.Publish("demo.greeting", []byte("Welcome to pub/sub"))
    nc.Publish("demo.test.nested", []byte("Hierarchical subjects work!"))

    // Give messages time to process
    time.Sleep(1 * time.Second)
}
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust
use async_nats;
use futures::StreamExt;
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() -> Result<(), async_nats::Error> {
    // Connect to NATS
    let client = async_nats::connect("localhost:4222").await?;

    // Create a subscriber
    let mut subscriber = client.subscribe("demo.>").await?;

    // Spawn task to process messages
    tokio::spawn(async move {
        while let Some(msg) = subscriber.next().await {
            println!("[{}]: {}",
                msg.subject,
                String::from_utf8_lossy(&msg.payload));
        }
    });

    // Publish some messages
    client.publish("demo.hello", "Hello NATS!".into()).await?;
    client.publish("demo.greeting", "Welcome to pub/sub".into()).await?;
    client.publish("demo.test.nested", "Hierarchical subjects work!".into()).await?;

    // Give messages time to process
    sleep(Duration::from_secs(1)).await;

    Ok(())
}
```

</TabItem>
</Tabs>

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
