---
title: Request-Reply
description: Synchronous communication pattern in NATS
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Request-Reply

Request-Reply is a communication pattern that brings synchronous communication to NATS's asynchronous messaging system. It allows a client to send a request and wait for a response, building RPC-style interactions on top of the core publish-subscribe mechanism.

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

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```
# Terminal 1: Set up a service that responds to time requests
nats reply time 'echo "The time is $(date)"'

# Terminal 2: Make a request
nats request time ""

# Output: The time is Wed Nov 15 10:23:45 PST 2023
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
import { connect, StringCodec } from "nats";

const nc = await connect();
const sc = StringCodec();

// Set up a service
nc.subscribe("time", {
  callback: (err, msg) => {
    if (err) {
      console.error(err);
      return;
    }
    const time = new Date().toISOString();
    msg.respond(sc.encode(time));
  }
});

// Make a request
try {
  const response = await nc.request("time", sc.encode(""), {
    timeout: 1000
  });
  console.log(`Response: ${sc.decode(response.data)}`);
} catch (err) {
  console.error(`Request failed: ${err.message}`);
}
```

</TabItem>
<TabItem value="go" label="Go">

```go
nc, _ := nats.Connect(nats.DefaultURL)
defer nc.Close()

// Set up a service
nc.Subscribe("time", func(m *nats.Msg) {
    time := time.Now().Format(time.RFC3339)
    m.Respond([]byte(time))
})

// Make a request
msg, err := nc.Request("time", nil, 1*time.Second)
if err != nil {
    log.Fatal(err)
}
fmt.Printf("Response: %s\n", string(msg.Data))
```

</TabItem>
<TabItem value="python" label="Python">

```python
import asyncio
import nats
from datetime import datetime

async def main():
    nc = await nats.connect()

    # Set up a service
    async def time_handler(msg):
        time = datetime.now().isoformat()
        await msg.respond(time.encode())

    await nc.subscribe("time", cb=time_handler)

    # Make a request
    try:
        response = await nc.request("time", b"", timeout=1)
        print(f"Response: {response.data.decode()}")
    except asyncio.TimeoutError:
        print("Request timed out")

    await nc.close()

asyncio.run(main())
```

</TabItem>
<TabItem value="java" label="Java">

```java
Connection nc = Nats.connect();

// Set up a service
Dispatcher dispatcher = nc.createDispatcher((msg) -> {
    String time = Instant.now().toString();
    nc.publish(msg.getReplyTo(), time.getBytes());
});
dispatcher.subscribe("time");

// Make a request
try {
    Message response = nc.request("time", null, Duration.ofSeconds(1));
    System.out.println("Response: " + new String(response.getData()));
} catch (InterruptedException | ExecutionException | TimeoutException e) {
    System.err.println("Request failed: " + e.getMessage());
}
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust
use async_nats;
use chrono::Utc;

#[tokio::main]
async fn main() -> Result<(), async_nats::Error> {
    let client = async_nats::connect("nats://localhost:4222").await?;

    // Set up a service
    let mut sub = client.subscribe("time").await?;
    let service_client = client.clone();

    tokio::spawn(async move {
        while let Some(msg) = sub.next().await {
            let time = Utc::now().to_rfc3339();
            let _ = msg.respond(time.into()).await;
        }
    });

    // Make a request
    match client.request("time", "".into()).await {
        Ok(response) => {
            println!("Response: {}", String::from_utf8_lossy(&response.payload));
        }
        Err(e) => {
            eprintln!("Request failed: {}", e);
        }
    }

    Ok(())
}
```

</TabItem>
<TabItem value="csharp" label="C#">

```csharp
await using var nc = new NatsConnection();

// Set up a service
var subscription = Task.Run(async () =>
{
    await foreach (var msg in nc.SubscribeAsync<string>("time"))
    {
        await msg.ReplyAsync(DateTimeOffset.Now.ToString());
    }
});

// Make a request
try
{
    var response = await nc.RequestAsync<string, string>("time", "",
        cancellationToken: new CancellationTokenSource(1000).Token);
    Console.WriteLine($"Response: {response.Data}");
}
catch (OperationCanceledException)
{
    Console.WriteLine("Request timed out");
}
```

</TabItem>
</Tabs>

## Handling Timeouts

Timeouts are crucial in request-reply to prevent indefinite waiting. All NATS clients support configurable timeouts:

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```
# Request with 2 second timeout
nats request time "" --timeout 2s

# If no response within 2 seconds, returns error
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
try {
  const response = await nc.request("service", data, {
    timeout: 2000, // 2 seconds
  });
  console.log("Got response:", sc.decode(response.data));
} catch (err) {
  if (err.code === "TIMEOUT") {
    console.error("Request timed out");
  } else {
    console.error("Request failed:", err.message);
  }
}
```

</TabItem>
<TabItem value="go" label="Go">

```go
// Request with custom timeout
msg, err := nc.Request("service", data, 2*time.Second)
if err != nil {
    if err == nats.ErrTimeout {
        log.Println("Request timed out")
    } else {
        log.Fatal(err)
    }
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
try:
    response = await nc.request("service", data, timeout=2.0)
    print(f"Got response: {response.data.decode()}")
except asyncio.TimeoutError:
    print("Request timed out after 2 seconds")
```

</TabItem>
</Tabs>

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

By default, the `request()` method returns after receiving the first response. To collect multiple responses from the scatter-gather pattern, use manual inbox subscription (shown in examples below):

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```
# Terminal 1: First service
nats reply service 'echo "Response from service 1"'

# Terminal 2: Second service
nats reply service 'echo "Response from service 2"'

# Terminal 3: Make request (receives one random response)
nats request service ""
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
// Multiple services on same subject
nc.subscribe("calc.add", {
  callback: (err, msg) => {
    const nums = JSON.parse(sc.decode(msg.data));
    const sum = nums.a + nums.b;
    msg.respond(sc.encode(JSON.stringify({ result: sum, server: "A" })));
  }
});

nc.subscribe("calc.add", {
  callback: (err, msg) => {
    const nums = JSON.parse(sc.decode(msg.data));
    const sum = nums.a + nums.b;
    msg.respond(sc.encode(JSON.stringify({ result: sum, server: "B" })));
  }
});

// Request will get one response (randomly from A or B)
const response = await nc.request("calc.add",
  sc.encode(JSON.stringify({ a: 5, b: 3 })));
console.log("Response:", sc.decode(response.data));
```

</TabItem>
<TabItem value="go" label="Go">

```go
// Multiple responders - only first response is returned
nc.Subscribe("calc.add", func(m *nats.Msg) {
    result := processCalculation(m.Data)
    m.Respond(append(result, []byte(" from A")...))
})

nc.Subscribe("calc.add", func(m *nats.Msg) {
    result := processCalculation(m.Data)
    m.Respond(append(result, []byte(" from B")...))
})

// Gets one response
msg, _ := nc.Request("calc.add", data, time.Second)
fmt.Printf("Got response: %s\n", msg.Data)
```

</TabItem>
</Tabs>

## No Responders Detection

NATS will detect when no services are available to handle a request. When there are no subscribers for the request subject, NATS server will return a "no responders" error immediately:

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```
# Request to a subject with no subscribers
nats request no.such.service "test"

# Error: no responders available for request
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
try {
  const response = await nc.request("no.such.service", data);
} catch (err) {
  if (err.code === "503") {
    console.error("No responders available");
  }
}
```

</TabItem>
<TabItem value="go" label="Go">

```go
msg, err := nc.Request("no.such.service", data, time.Second)
if err == nats.ErrNoResponders {
    log.Println("No services available to handle request")
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
try:
    response = await nc.request("no.such.service", b"test")
except nats.errors.NoRespondersError:
    print("No services available to handle request")
```

</TabItem>
</Tabs>

## Request with Headers

NATS supports headers in request-reply, enabling metadata exchange:

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```
# Send request with headers
nats request service "data" -H "X-Request-ID:123" -H "X-Priority:high"
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
// Send request with headers
const h = headers();
h.append("X-Request-ID", "123");
h.append("X-Priority", "high");

const response = await nc.request("service", sc.encode("data"), {
  headers: h,
  timeout: 1000
});
```

</TabItem>
<TabItem value="go" label="Go">

```go
// Create message with headers
msg := nats.NewMsg("service")
msg.Header.Add("X-Request-ID", "123")
msg.Header.Add("X-Priority", "high")
msg.Data = []byte("data")

// Send request with headers
response, err := nc.RequestMsg(msg, time.Second)
if err == nil {
    fmt.Printf("Response: %s\n", response.Data)
    fmt.Printf("Response ID: %s\n", response.Header.Get("X-Response-ID"))
}
```

</TabItem>
</Tabs>

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

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```bash
# Terminal 1: Calculator service
nats reply calc.add '
  read input
  echo "$input" | awk "{print \$1 + \$2}"
'

# Terminal 2: Make calculations
echo "5 3" | nats request calc.add -
echo "10 7" | nats request calc.add -
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
// Simple calculator service
nc.subscribe("calc.add", {
  callback: (err, msg) => {
    const nums = JSON.parse(sc.decode(msg.data));
    const result = nums.a + nums.b;
    msg.respond(sc.encode(result.toString()));
  }
});

// Make calculation requests
const result = await nc.request("calc.add",
  sc.encode(JSON.stringify({ a: 5, b: 3 })));
console.log(`5 + 3 = ${sc.decode(result.data)}`);
```

</TabItem>
</Tabs>
