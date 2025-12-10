---
title: Subjects
description: Understanding NATS subject-based messaging and wildcards
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import { WildcardComparison } from '@site/src/components/NatsFlow';

# Subjects

NATS implements a subject-based messaging system where publishers and subscribers communicate through named channels called subjects. This provides a location-transparent, interest-based communication pattern that automatically routes messages across distributed NATS servers.

## What is a Subject?

A subject is a string of characters that forms a name which publishers and subscribers use to find each other. It acts as the address for message routing within NATS. Subjects are case-sensitive and can contain any UTF-8 characters except whitespace, tabs and line breaks. It's a good practice to use alphanumeric characters along with `-` (dash) and `_` (underscore) for readability.

<div class="nats-flow" data-scenario="publishSubscribe" data-width="600" data-height="350"></div>

In the animation above, `events.data` is the subject - it's the named channel that connects the publisher to all subscribers without any direct addressing.

## Subject Hierarchies

The `.` (dot) character creates a subject hierarchy, enabling logical grouping of related subjects. This hierarchical namespace helps organize your messaging architecture:

```
orders.new
orders.processed
orders.shipped
weather.us.east
weather.us.west
weather.eu.north
```

## Wildcards

NATS provides two wildcards for flexible subscription patterns. While publishers always send to a fully specified subject, subscribers can use wildcards to receive messages from multiple subjects.

<div class="nats-flow" data-scenario="subjectsWildcardAnimated" data-width="700" data-height="450"></div>

The subscriber with pattern `weather.*.east` receives messages from matching subjects (green and blue paths) but not from non-matching subjects (red path). The `*` wildcard matches exactly one token.

### Single Token Wildcard (`*`)

The `*` wildcard matches exactly one token. For example:

- `weather.*.east` matches:
  - `weather.us.east`
  - `weather.eu.east`

- `orders.*.shipped` matches:
  - `orders.retail.shipped`
  - `orders.wholesale.shipped`

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```bash
# Subscribe using single token wildcard
nats sub "weather.*.east"

# Publish to specific subjects
nats pub weather.us.east "Temperature: 72F"
nats pub weather.eu.east "Temperature: 18C"
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
import { connect } from "nats";

const nc = await connect();

// Subscribe with single token wildcard
const sub = nc.subscribe("weather.*.east");
(async () => {
  for await (const msg of sub) {
    console.log(`Received on ${msg.subject}: ${msg.string()}`);
  }
})();

// Publish to specific subjects
nc.publish("weather.us.east", "Temperature: 72F");
nc.publish("weather.eu.east", "Temperature: 18C");
```

</TabItem>
<TabItem value="go" label="Go">

```go
nc, _ := nats.Connect(nats.DefaultURL)
defer nc.Close()

// Subscribe with single token wildcard
sub, _ := nc.Subscribe("weather.*.east", func(m *nats.Msg) {
    fmt.Printf("Received on %s: %s\n", m.Subject, string(m.Data))
})

// Publish to specific subjects
nc.Publish("weather.us.east", []byte("Temperature: 72F"))
nc.Publish("weather.eu.east", []byte("Temperature: 18C"))
```

</TabItem>
<TabItem value="python" label="Python">

```python
import asyncio
import nats

async def main():
    nc = await nats.connect()

    # Subscribe with single token wildcard
    async def message_handler(msg):
        print(f"Received on {msg.subject}: {msg.data.decode()}")

    await nc.subscribe("weather.*.east", cb=message_handler)

    # Publish to specific subjects
    await nc.publish("weather.us.east", b"Temperature: 72F")
    await nc.publish("weather.eu.east", b"Temperature: 18C")

    await asyncio.sleep(1)
    await nc.close()

asyncio.run(main())
```

</TabItem>
<TabItem value="java" label="Java">

```java
Connection nc = Nats.connect();

// Subscribe with single token wildcard
Dispatcher d = nc.createDispatcher((msg) -> {
    System.out.printf("Received on %s: %s%n",
        msg.getSubject(), new String(msg.getData()));
});
d.subscribe("weather.*.east");

// Publish to specific subjects
nc.publish("weather.us.east", "Temperature: 72F".getBytes());
nc.publish("weather.eu.east", "Temperature: 18C".getBytes());
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust
use async_nats;

#[tokio::main]
async fn main() -> Result<(), async_nats::Error> {
    let client = async_nats::connect("nats://localhost:4222").await?;

    // Subscribe with single token wildcard
    let mut sub = client.subscribe("weather.*.east").await?;

    tokio::spawn(async move {
        while let Some(msg) = sub.next().await {
            println!("Received on {}: {}",
                msg.subject,
                String::from_utf8_lossy(&msg.payload));
        }
    });

    // Publish to specific subjects
    client.publish("weather.us.east", "Temperature: 72F".into()).await?;
    client.publish("weather.eu.east", "Temperature: 18C".into()).await?;

    Ok(())
}
```

</TabItem>
<TabItem value="csharp" label="C#">

```csharp
await using var nc = new NatsConnection();

// Subscribe with single token wildcard
await foreach (var msg in nc.SubscribeAsync<string>("weather.*.east"))
{
    Console.WriteLine($"Received on {msg.Subject}: {msg.Data}");
}

// Publish to specific subjects
await nc.PublishAsync("weather.us.east", "Temperature: 72F");
await nc.PublishAsync("weather.eu.east", "Temperature: 18C");
```

</TabItem>
</Tabs>

### Multi-Token Wildcard (`>`)

The `>` wildcard matches one or more tokens and can only appear at the end of a subject. For example:

- `weather.>` matches:
  - `weather.us`
  - `weather.us.east`
  - `weather.eu.north.helsinki`

- `orders.>` matches all subjects starting with `orders.`

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```bash
# Subscribe to all weather updates
nats sub "weather.>"

# These all match the subscription
nats pub weather.us "US weather update"
nats pub weather.us.east "East coast update"
nats pub weather.eu.north.finland "Finland weather"
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
// Subscribe to all weather updates
const sub = nc.subscribe("weather.>");
(async () => {
  for await (const msg of sub) {
    console.log(`Received on ${msg.subject}: ${msg.string()}`);
  }
})();

// All these match the subscription
nc.publish("weather.us", "US weather update");
nc.publish("weather.us.east", "East coast update");
nc.publish("weather.eu.north.finland", "Finland weather");
```

</TabItem>
<TabItem value="go" label="Go">

```go
// Subscribe to all weather updates
sub, _ := nc.Subscribe("weather.>", func(m *nats.Msg) {
    fmt.Printf("Received on %s: %s\n", m.Subject, string(m.Data))
})

// All these match the subscription
nc.Publish("weather.us", []byte("US weather update"))
nc.Publish("weather.us.east", []byte("East coast update"))
nc.Publish("weather.eu.north.finland", []byte("Finland weather"))
```

</TabItem>
<TabItem value="python" label="Python">

```python
# Subscribe to all weather updates
async def handler(msg):
    print(f"Received on {msg.subject}: {msg.data.decode()}")

await nc.subscribe("weather.>", cb=handler)

# All these match the subscription
await nc.publish("weather.us", b"US weather update")
await nc.publish("weather.us.east", b"East coast update")
await nc.publish("weather.eu.north.finland", b"Finland weather")
```

</TabItem>
<TabItem value="java" label="Java">

```java
// Subscribe to all weather updates
Dispatcher d = nc.createDispatcher((msg) -> {
    System.out.printf("Received on %s: %s%n",
        msg.getSubject(), new String(msg.getData()));
});
d.subscribe("weather.>");

// All these match the subscription
nc.publish("weather.us", "US weather update".getBytes());
nc.publish("weather.us.east", "East coast update".getBytes());
nc.publish("weather.eu.north.finland", "Finland weather".getBytes());
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust
// Subscribe to all weather updates
let mut sub = client.subscribe("weather.>").await?;

tokio::spawn(async move {
    while let Some(msg) = sub.next().await {
        println!("Received on {}: {}",
            msg.subject,
            String::from_utf8_lossy(&msg.payload));
    }
});

// All these match the subscription
client.publish("weather.us", "US weather update".into()).await?;
client.publish("weather.us.east", "East coast update".into()).await?;
client.publish("weather.eu.north.finland", "Finland weather".into()).await?;
```

</TabItem>
<TabItem value="csharp" label="C#">

```csharp
// Subscribe to all weather updates
await foreach (var msg in nc.SubscribeAsync<string>("weather.>"))
{
    Console.WriteLine($"Received on {msg.Subject}: {msg.Data}");
}

// All these match the subscription
await nc.PublishAsync("weather.us", "US weather update");
await nc.PublishAsync("weather.us.east", "East coast update");
await nc.PublishAsync("weather.eu.north.finland", "Finland weather");
```

</TabItem>
</Tabs>

### Mixing Wildcards

You can combine wildcards for more complex patterns:

- `*.*.east.>` matches:
  - `weather.us.east.boston`
  - `traffic.us.east.newyork`

### Wildcard Comparison

Here's a side-by-side comparison showing how `*` and `>` wildcards behave differently:

<WildcardComparison width={800} height={500} />

The visualization demonstrates:
- **Single token wildcard (`*`)**: Matches exactly one token, so `weather.*.east` receives messages from `weather.us.east` and `weather.eu.east`, but not `weather.us.east.boston` (too many tokens)
- **Multi-token wildcard (`>`)**: Matches one or more tokens, so `weather.>` receives all three messages regardless of depth

## Subject Naming Conventions

### Recommended Characters

- **Alphanumeric**: `a-z`, `A-Z`, `0-9`
- **Special**: `-` (dash) and `_` (underscore)
- **Delimiter**: `.` (dot) for hierarchy

### Reserved Characters

- `.` (dot) - Used for hierarchy, cannot be part of a token
- `*` (asterisk) - Wildcard, cannot be in subject names
- `>` (greater than) - Wildcard, cannot be in subject names
- Whitespace - Not allowed in subjects

### Reserved Prefixes

Subjects starting with `$` are reserved for system use:
- `$SYS` - System subjects
- `$JS` - JetStream API subjects
- `$KV` - Key-Value store subjects
- `$O` - Object Store subjects
- `$SRV` - Service API subjects
- `_INBOX` - Auto-generated reply subjects

## Best Practices

### Subject Hierarchy Design

1. **Start general, get specific**: Use the first tokens for broad categorization
   ```
   app.region.service.entity.action
   myapp.us-east.users.profile.update
   ```

2. **Keep it reasonable**: Limit to ~16 tokens and under 256 characters total

3. **Be consistent**: Establish naming conventions early and stick to them

4. **Plan for wildcards**: Design hierarchies that work well with wildcard subscriptions

### Performance Considerations

- **Subjects Interest graph is in-memory and dynamic**: NATS builds a routing table only for subjects with active subscribers, kept entirely in RAM for fast lookups
- **Subjects are essentially free**: Creating new subjects has virtually no overhead - NATS efficiently handles millions of unique subjects.
- **Wildcard matching is optimized**: Subscriptions with wildcards (`*` and `>`) use efficient trie-based matching.

### Security and Filtering

Well-designed subject hierarchies enable:
- Fine-grained access control per user/account
- Efficient message filtering in JetStream streams
- Clean import/export patterns between accounts
- Logical organization for monitoring and debugging

## Location Transparency

One of NATS' key features is location transparency through subject-based addressing:

- Subscriptions automatically propagate across the NATS cluster
- Messages route to all interested subscribers regardless of their location
- No configuration needed for message routing between servers
- Publishers and subscribers don't need to know about each other's location

## Wire Taps and Monitoring

The `>` wildcard enables powerful monitoring capabilities:

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```bash
# Monitor all messages in the system (subject to permissions)
nats sub ">"

# Monitor all orders
nats sub "orders.>"

# Monitor specific service communications
nats sub "myservice.>"
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
// Create a wire tap for monitoring
const monitor = nc.subscribe(">");
(async () => {
  for await (const msg of monitor) {
    console.log(`[MONITOR] ${msg.subject}: ${msg.string()}`);
  }
})();
```

</TabItem>
<TabItem value="go" label="Go">

```go
// Create a wire tap for monitoring
nc.Subscribe(">", func(m *nats.Msg) {
    log.Printf("[MONITOR] %s: %s", m.Subject, string(m.Data))
})
```

</TabItem>
</Tabs>

## Related Concepts

- [Publish-Subscribe Basics](./pub-sub-basics) - Core messaging patterns
- [Request-Reply](./request-reply) - Synchronous communication using subjects
- [Queue Groups](./queue-groups) - Load balancing with subject subscriptions

## Try It Yourself

Experiment with subjects using the NATS CLI:

```bash
# Terminal 1: Subscribe with wildcards
nats sub "demo.>"

# Terminal 2: Publish to various subjects
nats pub demo.test "Hello"
nats pub demo.test.nested "Nested message"
nats pub demo.another.topic "Another topic"
```

Each message published in Terminal 2 will be received by the wildcard subscription in Terminal 1, demonstrating how subject hierarchies and wildcards work together.
