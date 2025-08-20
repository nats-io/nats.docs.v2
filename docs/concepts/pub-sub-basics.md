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
- **Subscribers** receive messages without knowing who sent them
- **Subjects** act as the addressing mechanism

```
Publisher → Subject → Subscriber(s)
```

This decoupling provides tremendous flexibility in building distributed systems.

## How It Works in NATS

### 1. Publishing Messages

Publishers send messages to a **subject** - a simple string that acts as an address:


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

This creates logical namespaces for organizing messages.

## Wildcards

NATS provides two wildcard characters for flexible subscriptions:

### Single Token Wildcard (`*`)
Matches exactly one token in the subject:

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```
# Subscribes to all US weather updates
nats sub 'weather.us.*'

# Matches:
# ✓ weather.us.california
# ✓ weather.us.newyork
# ✗ weather.us.california.sandiego (too many tokens)
```

</TabItem>
<TabItem value="js" label="JavaScript/TypeScript">

```javascript
// Subscribes to all US weather updates
nc.subscribe('weather.us.*');

// Matches:
// ✓ weather.us.california
// ✓ weather.us.newyork
// ✗ weather.us.california.sandiego (too many tokens)
```

</TabItem>
<TabItem value="go" label="Go">

```go
// Subscribes to all US weather updates
nc.Subscribe("weather.us.*", handler)

// Matches:
// ✓ weather.us.california
// ✓ weather.us.newyork
// ✗ weather.us.california.sandiego (too many tokens)
```

</TabItem>
<TabItem value="python" label="Python">

```python
# Subscribes to all US weather updates
await nc.subscribe("weather.us.*", cb=handler)

# Matches:
# ✓ weather.us.california
# ✓ weather.us.newyork
# ✗ weather.us.california.sandiego (too many tokens)
```

</TabItem>
<TabItem value="java" label="Java">

```java
// Subscribes to all US weather updates
d.subscribe("weather.us.*");

// Matches:
// ✓ weather.us.california
// ✓ weather.us.newyork
// ✗ weather.us.california.sandiego (too many tokens)
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust
// Subscribes to all US weather updates
let mut sub = client.subscribe("weather.us.*").await?;

// Matches:
// ✓ weather.us.california
// ✓ weather.us.newyork
// ✗ weather.us.california.sandiego (too many tokens)
```

</TabItem>
<TabItem value="csharp" label="C#/.NET">

```csharp
// Subscribes to all US weather updates
await foreach (var msg in nats.SubscribeAsync<string>("weather.us.*"))
{
    // Matches:
    // ✓ weather.us.california
    // ✓ weather.us.newyork
    // ✗ weather.us.california.sandiego (too many tokens)
}
```

</TabItem>
</Tabs>

### Multi-Token Wildcard (`>`)
Matches one or more tokens at the end of the subject:

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```
# Subscribes to all weather updates
nats sub 'weather.>'

# Matches:
# ✓ weather.us
# ✓ weather.us.california
# ✓ weather.us.california.sandiego
```

</TabItem>
<TabItem value="js" label="JavaScript/TypeScript">

```javascript
// Subscribes to all weather updates
nc.subscribe('weather.>');

// Matches:
// ✓ weather.us
// ✓ weather.us.california
// ✓ weather.us.california.sandiego
```

</TabItem>
<TabItem value="go" label="Go">

```go
// Subscribes to all weather updates
nc.Subscribe("weather.>", handler)

// Matches:
// ✓ weather.us
// ✓ weather.us.california
// ✓ weather.us.california.sandiego
```

</TabItem>
<TabItem value="python" label="Python">

```python
# Subscribes to all weather updates
await nc.subscribe("weather.>", cb=handler)

# Matches:
# ✓ weather.us
# ✓ weather.us.california
# ✓ weather.us.california.sandiego
```

</TabItem>
<TabItem value="java" label="Java">

```java
// Subscribes to all weather updates
d.subscribe("weather.>");

// Matches:
// ✓ weather.us
// ✓ weather.us.california
// ✓ weather.us.california.sandiego
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust
// Subscribes to all weather updates
let mut sub = client.subscribe("weather.>").await?;

// Matches:
// ✓ weather.us
// ✓ weather.us.california
// ✓ weather.us.california.sandiego
```

</TabItem>
<TabItem value="csharp" label="C#/.NET">

```csharp
// Subscribes to all weather updates
await foreach (var msg in nats.SubscribeAsync<string>("weather.>"))
{
    // Matches:
    // ✓ weather.us
    // ✓ weather.us.california
    // ✓ weather.us.california.sandiego
}
```

</TabItem>
</Tabs>

## Practical Examples

### Example 1: Simple Event Broadcasting

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```
# Event Publisher
nats pub user.login '{"userId":"123","timestamp":1234567890}'

# Event Subscriber (in another terminal)
nats sub user.login
```

</TabItem>
<TabItem value="js" label="JavaScript/TypeScript">

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
<TabItem value="python" label="Python">

```python
# Event Publisher
import json
import time

async def user_logged_in(user_id):
    event = {
        "userId": user_id,
        "timestamp": int(time.time())
    }
    await nc.publish("user.login", json.dumps(event).encode())

# Event Subscriber (Analytics Service)
async def login_handler(msg):
    event = json.loads(msg.data.decode())
    print(f"User {event['userId']} logged in")
    # Update analytics...

await nc.subscribe("user.login", cb=login_handler)
```

</TabItem>
<TabItem value="java" label="Java">

```java
// Event Publisher
void userLoggedIn(String userId) {
    JSONObject event = new JSONObject();
    event.put("userId", userId);
    event.put("timestamp", System.currentTimeMillis());
    nc.publish("user.login", event.toString().getBytes());
}

// Event Subscriber (Analytics Service)
Dispatcher d = nc.createDispatcher((msg) -> {
    JSONObject event = new JSONObject(new String(msg.getData()));
    System.out.println("User " + event.getString("userId") + " logged in");
    // Update analytics...
});
d.subscribe("user.login");
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
<TabItem value="csharp" label="C#/.NET">

```csharp
// Event Publisher
public record LoginEvent(string UserId, long Timestamp);

async Task UserLoggedIn(string userId)
{
    var evt = new LoginEvent(userId, DateTimeOffset.Now.ToUnixTimeSeconds());
    await nats.PublishAsync("user.login", evt);
}

// Event Subscriber (Analytics Service)
await foreach (var msg in nats.SubscribeAsync<LoginEvent>("user.login"))
{
    Console.WriteLine($"User {msg.Data.UserId} logged in");
    // Update analytics...
}
```

</TabItem>
</Tabs>

### Example 2: Distributed Logging

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```
# Application components publish logs
nats pub logs.error "Database connection failed"
nats pub logs.info "Service started successfully"
nats pub logs.debug "Processing request ID: 12345"

# Centralized logger subscribes to all log levels
nats sub 'logs.>'
```

</TabItem>
<TabItem value="js" label="JavaScript/TypeScript">

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
<TabItem value="python" label="Python">

```python
# Application components publish logs
await nc.publish('logs.error', b'Database connection failed')
await nc.publish('logs.info', b'Service started successfully')
await nc.publish('logs.debug', b'Processing request ID: 12345')

# Centralized logger subscribes to all log levels
async def log_handler(msg):
    # Write to file, send to monitoring service, etc.
    save_to_log_file(msg)

await nc.subscribe('logs.>', cb=log_handler)
```

</TabItem>
<TabItem value="java" label="Java">

```java
// Application components publish logs
nc.publish("logs.error", "Database connection failed".getBytes());
nc.publish("logs.info", "Service started successfully".getBytes());
nc.publish("logs.debug", "Processing request ID: 12345".getBytes());

// Centralized logger subscribes to all log levels
Dispatcher d = nc.createDispatcher((msg) -> {
    // Write to file, send to monitoring service, etc.
    saveToLogFile(msg);
});
d.subscribe("logs.>");
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
<TabItem value="csharp" label="C#/.NET">

```csharp
// Application components publish logs
await nats.PublishAsync("logs.error", "Database connection failed");
await nats.PublishAsync("logs.info", "Service started successfully");
await nats.PublishAsync("logs.debug", "Processing request ID: 12345");

// Centralized logger subscribes to all log levels
await foreach (var msg in nats.SubscribeAsync<string>("logs.>"))
{
    // Write to file, send to monitoring service, etc.
    SaveToLogFile(msg);
}
```

</TabItem>
</Tabs>

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

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```
# Multiple instances subscribe to the same queue group
nats sub work.tasks --queue=workers

# Only one member of the 'workers' group receives each message
```

</TabItem>
<TabItem value="js" label="JavaScript/TypeScript">

```javascript
// Multiple instances subscribe to the same queue group
nc.subscribe('work.tasks', { queue: 'workers' });

// Only one member of the 'workers' group receives each message
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
<TabItem value="python" label="Python">

```python
# Multiple instances subscribe to the same queue group
await nc.subscribe("work.tasks", queue="workers", cb=handler)

# Only one member of the 'workers' group receives each message
```

</TabItem>
<TabItem value="java" label="Java">

```java
// Multiple instances subscribe to the same queue group
d.subscribe("work.tasks", "workers");

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
<TabItem value="csharp" label="C#/.NET">

```csharp
// Multiple instances subscribe to the same queue group
await foreach (var msg in nats.SubscribeAsync<string>("work.tasks", queueGroup: "workers"))
{
    // Process work task
}

// Only one member of the 'workers' group receives each message
```

</TabItem>
</Tabs>

### Request-Reply
Built on pub/sub but adds synchronous communication:

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```
# Responder (Terminal 1)
nats reply time.request "$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Requester (Terminal 2)
nats request time.request "" --timeout=2s
```

</TabItem>
<TabItem value="js" label="JavaScript/TypeScript">

```javascript
// Responder
nc.subscribe('time.request', (msg) => {
  msg.respond(new Date().toISOString());
});

// Requester
const response = await nc.request('time.request');
console.log('Server time:', response.string());
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
<TabItem value="python" label="Python">

```python
# Responder
async def time_handler(msg):
    await msg.respond(datetime.now().isoformat().encode())

await nc.subscribe("time.request", cb=time_handler)

# Requester
response = await nc.request("time.request", b"", timeout=2)
print(f"Server time: {response.data.decode()}")
```

</TabItem>
<TabItem value="java" label="Java">

```java
// Responder
Dispatcher d = nc.createDispatcher((msg) -> {
    nc.publish(msg.getReplyTo(),
        Instant.now().toString().getBytes());
});
d.subscribe("time.request");

// Requester
Message response = nc.request("time.request", null,
    Duration.ofSeconds(2));
System.out.println("Server time: " + new String(response.getData()));
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
<TabItem value="csharp" label="C#/.NET">

```csharp
// Responder
await foreach (var msg in nats.SubscribeAsync<string>("time.request"))
{
    await msg.ReplyAsync(DateTime.UtcNow.ToString("O"));
}

// Requester
var response = await nats.RequestAsync<string, string>("time.request", "");
Console.WriteLine($"Server time: {response.Data}");
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
<TabItem value="js" label="JavaScript/TypeScript">

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
<TabItem value="python" label="Python">

```python
import asyncio
import nats

async def demo():
    # Connect to NATS
    nc = await nats.connect("localhost:4222")

    # Message handler
    async def message_handler(msg):
        subject = msg.subject
        data = msg.data.decode()
        print(f"[{subject}]: {data}")

    # Create a subscriber
    await nc.subscribe("demo.>", cb=message_handler)

    # Publish some messages
    await nc.publish("demo.hello", b"Hello NATS!")
    await nc.publish("demo.greeting", b"Welcome to pub/sub")
    await nc.publish("demo.test.nested", b"Hierarchical subjects work!")

    # Give messages time to process
    await asyncio.sleep(1)

    # Cleanup
    await nc.close()

if __name__ == '__main__':
    asyncio.run(demo())
```

</TabItem>
<TabItem value="java" label="Java">

```java
import io.nats.client.*;
import java.time.Duration;

public class Demo {
    public static void main(String[] args) throws Exception {
        // Connect to NATS
        Connection nc = Nats.connect("nats://localhost:4222");

        // Create a subscriber
        Dispatcher d = nc.createDispatcher((msg) -> {
            System.out.printf("[%s]: %s\n",
                msg.getSubject(),
                new String(msg.getData()));
        });
        d.subscribe("demo.>");

        // Publish some messages
        nc.publish("demo.hello", "Hello NATS!".getBytes());
        nc.publish("demo.greeting", "Welcome to pub/sub".getBytes());
        nc.publish("demo.test.nested", "Hierarchical subjects work!".getBytes());

        // Give messages time to process
        Thread.sleep(1000);

        // Cleanup
        nc.close();
    }
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
<TabItem value="csharp" label="C#/.NET">

```csharp
using NATS.Client.Core;

// Connect to NATS
await using var nats = new NatsConnection();

// Create a subscriber (runs in background)
var subscription = Task.Run(async () =>
{
    await foreach (var msg in nats.SubscribeAsync<string>("demo.>"))
    {
        Console.WriteLine($"[{msg.Subject}]: {msg.Data}");
    }
});

// Publish some messages
await nats.PublishAsync("demo.hello", "Hello NATS!");
await nats.PublishAsync("demo.greeting", "Welcome to pub/sub");
await nats.PublishAsync("demo.test.nested", "Hierarchical subjects work!");

// Give messages time to process
await Task.Delay(1000);
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
