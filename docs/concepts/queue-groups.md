---
title: Queue Groups
description: Built-in load balancing for NATS subscribers
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Queue Groups

Queue groups provide NATS's built-in load balancing feature. When multiple subscribers join the same queue group, NATS ensures that each message is delivered to only one member of the group, automatically distributing the workload across available consumers.

## How Queue Groups Work

In standard publish-subscribe, every subscriber receives every message. With queue groups:

1. **Multiple subscribers register with the same queue name**
2. **NATS randomly selects one member per message**
3. **Selected member receives and processes the message**
4. **Other members don't see that specific message**
5. **Load is automatically balanced across the group**

This happens without any configuration on the server side - it's purely a client-side feature built into the NATS protocol.

## Basic Queue Groups

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```
# Terminal 1: First worker in queue group
nats sub orders.new --queue workers

# Terminal 2: Second worker in same queue group
nats sub orders.new --queue workers

# Terminal 3: Third worker in same queue group
nats sub orders.new --queue workers

# Terminal 4: Publish messages (distributed across workers)
nats pub orders.new "Order 1"
nats pub orders.new "Order 2" 
nats pub orders.new "Order 3"
nats pub orders.new "Order 4"

# Each message goes to exactly one worker
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
import { connect, StringCodec } from "nats";

const nc = await connect();
const sc = StringCodec();

// Create three workers in the same queue group
const workerA = nc.subscribe("orders.new", { queue: "workers" });
(async () => {
  for await (const msg of workerA) {
    console.log(`Worker A processed: ${sc.decode(msg.data)}`);
  }
})();

const workerB = nc.subscribe("orders.new", { queue: "workers" });
(async () => {
  for await (const msg of workerB) {
    console.log(`Worker B processed: ${sc.decode(msg.data)}`);
  }
})();

const workerC = nc.subscribe("orders.new", { queue: "workers" });
(async () => {
  for await (const msg of workerC) {
    console.log(`Worker C processed: ${sc.decode(msg.data)}`);
  }
})();

// Publish messages - automatically load balanced
for (let i = 1; i <= 10; i++) {
  nc.publish("orders.new", sc.encode(`Order ${i}`));
}
```

</TabItem>
<TabItem value="go" label="Go">

```go
nc, _ := nats.Connect(nats.DefaultURL)
defer nc.Close()

// Create three workers in the same queue group
nc.QueueSubscribe("orders.new", "workers", func(m *nats.Msg) {
    fmt.Printf("Worker A processed: %s\n", string(m.Data))
})

nc.QueueSubscribe("orders.new", "workers", func(m *nats.Msg) {
    fmt.Printf("Worker B processed: %s\n", string(m.Data))
})

nc.QueueSubscribe("orders.new", "workers", func(m *nats.Msg) {
    fmt.Printf("Worker C processed: %s\n", string(m.Data))
})

// Publish messages - automatically load balanced
for i := 1; i <= 10; i++ {
    nc.Publish("orders.new", []byte(fmt.Sprintf("Order %d", i)))
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
import asyncio
import nats

async def main():
    nc = await nats.connect()
    
    # Create three workers in the same queue group
    async def worker_a(msg):
        print(f"Worker A processed: {msg.data.decode()}")
    
    async def worker_b(msg):
        print(f"Worker B processed: {msg.data.decode()}")
    
    async def worker_c(msg):
        print(f"Worker C processed: {msg.data.decode()}")
    
    await nc.subscribe("orders.new", queue="workers", cb=worker_a)
    await nc.subscribe("orders.new", queue="workers", cb=worker_b)
    await nc.subscribe("orders.new", queue="workers", cb=worker_c)
    
    # Publish messages - automatically load balanced
    for i in range(1, 11):
        await nc.publish("orders.new", f"Order {i}".encode())
    
    await asyncio.sleep(1)
    await nc.close()

asyncio.run(main())
```

</TabItem>
<TabItem value="java" label="Java">

```java
Connection nc = Nats.connect();

// Create three workers in the same queue group
Dispatcher dispatcher = nc.createDispatcher();

dispatcher.subscribe("orders.new", "workers", (msg) -> {
    System.out.println("Worker A processed: " + new String(msg.getData()));
});

dispatcher.subscribe("orders.new", "workers", (msg) -> {
    System.out.println("Worker B processed: " + new String(msg.getData()));
});

dispatcher.subscribe("orders.new", "workers", (msg) -> {
    System.out.println("Worker C processed: " + new String(msg.getData()));
});

// Publish messages - automatically load balanced
for (int i = 1; i <= 10; i++) {
    nc.publish("orders.new", ("Order " + i).getBytes());
}
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust
use async_nats;
use futures::StreamExt;

#[tokio::main]
async fn main() -> Result<(), async_nats::Error> {
    let client = async_nats::connect("nats://localhost:4222").await?;
    
    // Create three workers in the same queue group
    let mut worker_a = client
        .queue_subscribe("orders.new", "workers".to_string())
        .await?;
    
    let mut worker_b = client
        .queue_subscribe("orders.new", "workers".to_string())
        .await?;
    
    let mut worker_c = client
        .queue_subscribe("orders.new", "workers".to_string())
        .await?;
    
    // Spawn tasks to process messages
    tokio::spawn(async move {
        while let Some(msg) = worker_a.next().await {
            println!("Worker A processed: {}", 
                String::from_utf8_lossy(&msg.payload));
        }
    });
    
    tokio::spawn(async move {
        while let Some(msg) = worker_b.next().await {
            println!("Worker B processed: {}", 
                String::from_utf8_lossy(&msg.payload));
        }
    });
    
    tokio::spawn(async move {
        while let Some(msg) = worker_c.next().await {
            println!("Worker C processed: {}", 
                String::from_utf8_lossy(&msg.payload));
        }
    });
    
    // Publish messages - automatically load balanced
    for i in 1..=10 {
        client.publish("orders.new", format!("Order {}", i).into()).await?;
    }
    
    Ok(())
}
```

</TabItem>
<TabItem value="csharp" label="C#">

```csharp
await using var nc = new NatsConnection();

// Create three workers in the same queue group
var workerA = Task.Run(async () =>
{
    await foreach (var msg in nc.SubscribeAsync<string>("orders.new", 
        queueGroup: "workers"))
    {
        Console.WriteLine($"Worker A processed: {msg.Data}");
    }
});

var workerB = Task.Run(async () =>
{
    await foreach (var msg in nc.SubscribeAsync<string>("orders.new", 
        queueGroup: "workers"))
    {
        Console.WriteLine($"Worker B processed: {msg.Data}");
    }
});

var workerC = Task.Run(async () =>
{
    await foreach (var msg in nc.SubscribeAsync<string>("orders.new", 
        queueGroup: "workers"))
    {
        Console.WriteLine($"Worker C processed: {msg.Data}");
    }
});

// Publish messages - automatically load balanced
for (int i = 1; i <= 10; i++)
{
    await nc.PublishAsync("orders.new", $"Order {i}");
}
```

</TabItem>
</Tabs>

## Dynamic Scaling

One of the most powerful features of queue groups is dynamic scaling without configuration changes:

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```
# Start with one worker
nats sub tasks --queue workers

# Load increases - add more workers (in new terminals)
nats sub tasks --queue workers
nats sub tasks --queue workers

# Load decreases - stop workers with Ctrl+C
# Remaining workers automatically take over
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
// Function to create a worker that can be started/stopped
function createWorker(id) {
  const sub = nc.subscribe("tasks", { queue: "workers" });
  
  const process = async () => {
    for await (const msg of sub) {
      console.log(`Worker ${id} processing: ${sc.decode(msg.data)}`);
      // Simulate work
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };
  
  return {
    start: () => process(),
    stop: () => sub.unsubscribe()
  };
}

// Scale up by adding workers
const workers = [];
for (let i = 1; i <= 5; i++) {
  const worker = createWorker(i);
  workers.push(worker);
  worker.start();
}

// Scale down by removing workers
// Just call worker.stop() on any worker
```

</TabItem>
<TabItem value="go" label="Go">

```go
// Worker that can be dynamically added/removed
type Worker struct {
    ID   string
    sub  *nats.Subscription
    done chan bool
}

func NewWorker(nc *nats.Conn, id string) *Worker {
    w := &Worker{ID: id, done: make(chan bool)}
    
    w.sub, _ = nc.QueueSubscribe("tasks", "workers", func(m *nats.Msg) {
        fmt.Printf("Worker %s processing: %s\n", id, string(m.Data))
        // Simulate work
        time.Sleep(100 * time.Millisecond)
    })
    
    return w
}

func (w *Worker) Stop() {
    w.sub.Unsubscribe()
    close(w.done)
}

// Dynamic scaling
workers := make([]*Worker, 0)

// Scale up
for i := 1; i <= 5; i++ {
    worker := NewWorker(nc, fmt.Sprintf("%d", i))
    workers = append(workers, worker)
}

// Scale down
if len(workers) > 0 {
    workers[0].Stop()
    workers = workers[1:]
}
```

</TabItem>
</Tabs>

## Queue Groups with Request-Reply

Queue groups are perfect for building scalable services with request-reply:

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```
# Terminal 1: Service instance 1
nats reply api.users.get --queue api 'echo "User data from instance 1"'

# Terminal 2: Service instance 2  
nats reply api.users.get --queue api 'echo "User data from instance 2"'

# Terminal 3: Service instance 3
nats reply api.users.get --queue api 'echo "User data from instance 3"'

# Terminal 4: Make requests (load balanced across instances)
nats request api.users.get ""
nats request api.users.get ""
nats request api.users.get ""
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
// Create multiple service instances with queue group
async function createServiceInstance(instanceId) {
  nc.subscribe("api.calculate", { queue: "api-workers" }, {
    callback: async (err, msg) => {
      if (err) return;
      
      // Parse request
      const request = JSON.parse(sc.decode(msg.data));
      
      // Process request
      const result = request.a + request.b;
      
      // Send response
      msg.respond(sc.encode(JSON.stringify({
        result: result,
        processedBy: instanceId
      })));
      
      console.log(`Instance ${instanceId} processed request`);
    }
  });
}

// Start multiple service instances
for (let i = 1; i <= 3; i++) {
  createServiceInstance(i);
}

// Make requests - automatically load balanced
for (let i = 0; i < 10; i++) {
  const response = await nc.request("api.calculate", 
    sc.encode(JSON.stringify({ a: i, b: i * 2 })));
  
  const result = JSON.parse(sc.decode(response.data));
  console.log(`Result: ${result.result}, processed by: ${result.processedBy}`);
}
```

</TabItem>
<TabItem value="go" label="Go">

```go
// Service instance with queue group for load balancing
func createServiceInstance(nc *nats.Conn, instanceID string) {
    nc.QueueSubscribe("api.calculate", "api-workers", func(m *nats.Msg) {
        // Parse request
        var request map[string]int
        json.Unmarshal(m.Data, &request)
        
        // Process request
        result := request["a"] + request["b"]
        
        // Send response
        response := map[string]interface{}{
            "result": result,
            "processedBy": instanceID,
        }
        responseData, _ := json.Marshal(response)
        m.Respond(responseData)
        
        fmt.Printf("Instance %s processed request\n", instanceID)
    })
}

// Start multiple service instances
for i := 1; i <= 3; i++ {
    createServiceInstance(nc, fmt.Sprintf("instance-%d", i))
}

// Make requests - automatically load balanced
for i := 0; i < 10; i++ {
    request := map[string]int{"a": i, "b": i * 2}
    requestData, _ := json.Marshal(request)
    
    msg, _ := nc.Request("api.calculate", requestData, time.Second)
    
    var response map[string]interface{}
    json.Unmarshal(msg.Data, &response)
    fmt.Printf("Result: %v, processed by: %s\n", 
        response["result"], response["processedBy"])
}
```

</TabItem>
</Tabs>

## Mixed Subscribers

Queue groups can coexist with regular subscribers. This enables patterns like:
- Audit logging (regular subscriber sees all messages)
- Monitoring (regular subscriber tracks all activity)
- Processing (queue group handles the work)

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```
# Terminal 1: Audit logger (sees all messages)
nats sub "orders.>" 

# Terminal 2: Worker 1 in queue group
nats sub "orders.new" --queue workers

# Terminal 3: Worker 2 in queue group  
nats sub "orders.new" --queue workers

# Terminal 4: Publish messages
nats pub orders.new "Order 123"
# Audit logger sees it
# One worker processes it
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
// Audit logger - receives all messages
nc.subscribe("orders.>", {
  callback: (err, msg) => {
    console.log(`[AUDIT] ${msg.subject}: ${sc.decode(msg.data)}`);
  }
});

// Metrics collector - receives all messages
nc.subscribe("orders.>", {
  callback: (err, msg) => {
    updateMetrics(msg.subject);
  }
});

// Workers in queue group - load balanced
nc.subscribe("orders.new", { queue: "workers" }, {
  callback: async (err, msg) => {
    console.log(`[WORKER A] Processing: ${sc.decode(msg.data)}`);
    await processOrder(msg.data);
  }
});

nc.subscribe("orders.new", { queue: "workers" }, {
  callback: async (err, msg) => {
    console.log(`[WORKER B] Processing: ${sc.decode(msg.data)}`);
    await processOrder(msg.data);
  }
});

// Publish order
nc.publish("orders.new", sc.encode("Order 123"));
// Audit and metrics see it, one worker processes it
```

</TabItem>
<TabItem value="go" label="Go">

```go
// Audit logger - receives all messages
nc.Subscribe("orders.>", func(m *nats.Msg) {
    log.Printf("[AUDIT] %s: %s", m.Subject, string(m.Data))
})

// Metrics collector - receives all messages  
nc.Subscribe("orders.>", func(m *nats.Msg) {
    updateMetrics(m.Subject)
})

// Workers in queue group - load balanced
nc.QueueSubscribe("orders.new", "workers", func(m *nats.Msg) {
    fmt.Printf("[WORKER A] Processing: %s\n", string(m.Data))
    processOrder(m.Data)
})

nc.QueueSubscribe("orders.new", "workers", func(m *nats.Msg) {
    fmt.Printf("[WORKER B] Processing: %s\n", string(m.Data))
    processOrder(m.Data)
})

// Publish order
nc.Publish("orders.new", []byte("Order 123"))
// Audit and metrics see it, one worker processes it
```

</TabItem>
</Tabs>

## Geo-Affinity in Super-Clusters

In globally distributed NATS super-clusters, queue groups exhibit geo-affinity - preferring local processing when possible:

```
┌─────────────────────────────────────────────┐
│            Global Super-Cluster             │
├──────────────┬──────────────┬──────────────┤
│   US-East    │   US-West    │   EU-West    │
│              │              │              │
│  Workers:    │  Workers:    │  Workers:    │
│  - Queue: Q  │  - Queue: Q  │  - Queue: Q  │
│              │              │              │
│  Publisher   │              │              │
│      ↓       │              │              │
│   Message    │              │              │
│      ↓       │              │              │
│ Local Worker │              │              │
│  (Preferred) │              │              │
└──────────────┴──────────────┴──────────────┘
```

Messages are preferentially delivered to queue group members in the same cluster/region, only routing to remote regions if no local workers are available.

## JetStream Work Queues

JetStream provides persistent work queues with the `WorkQueuePolicy`:

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```
# Create a work queue stream
nats stream add WORK_QUEUE \
  --subjects "work.tasks" \
  --retention work \
  --storage file \
  --replicas 3

# Create pull consumer for workers
nats consumer add WORK_QUEUE WORKERS \
  --pull \
  --ack-policy explicit \
  --max-deliver 3

# Workers pull and process tasks
nats consumer next WORK_QUEUE WORKERS --count 1
nats consumer next WORK_QUEUE WORKERS --count 1
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
// Create JetStream work queue
const jsm = await nc.jetstreamManager();
await jsm.streams.add({
  name: "WORK_QUEUE",
  subjects: ["work.tasks"],
  retention: "workqueue",  // Work queue retention
  storage: "file",
  num_replicas: 3
});

// Create consumer for workers
await jsm.consumers.add("WORK_QUEUE", {
  durable_name: "WORKERS",
  ack_policy: "explicit",
  max_deliver: 3
});

// Workers pull tasks
const js = nc.jetstream();
const consumer = await js.consumers.get("WORK_QUEUE", "WORKERS");

// Worker processing loop
while (true) {
  const messages = await consumer.fetch({ max_messages: 1 });
  
  for await (const msg of messages) {
    console.log(`Processing task: ${msg.data}`);
    await processTask(msg.data);
    await msg.ack();
  }
}
```

</TabItem>
<TabItem value="go" label="Go">

```go
// Create JetStream work queue
js, _ := nc.JetStream()

// Add work queue stream
js.AddStream(&nats.StreamConfig{
    Name:      "WORK_QUEUE",
    Subjects:  []string{"work.tasks"},
    Retention: nats.WorkQueuePolicy,  // Work queue retention
    Storage:   nats.FileStorage,
    Replicas:  3,
})

// Create consumer for workers
js.AddConsumer("WORK_QUEUE", &nats.ConsumerConfig{
    Durable:    "WORKERS",
    AckPolicy:  nats.AckExplicitPolicy,
    MaxDeliver: 3,
})

// Worker processing loop
sub, _ := js.PullSubscribe("work.tasks", "WORKERS")

for {
    msgs, _ := sub.Fetch(1, nats.MaxWait(time.Second))
    
    for _, msg := range msgs {
        fmt.Printf("Processing task: %s\n", string(msg.Data))
        processTask(msg.Data)
        msg.Ack()
    }
}
```

</TabItem>
</Tabs>

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

## Queue Groups vs Other Patterns

### Queue Groups vs Pub-Sub
- **Pub-Sub**: All subscribers receive all messages
- **Queue Groups**: Only one member receives each message

### Queue Groups vs JetStream Consumers
- **Queue Groups**: Memory-based, no persistence
- **JetStream**: Persistent, with replay and exactly-once semantics

### Queue Groups vs Traditional Message Queues
- **Traditional Queues**: Require broker configuration
- **Queue Groups**: No configuration, purely client-side

## Common Use Cases

### Microservices Load Balancing
```javascript
// Each service instance joins the same queue
nc.subscribe("service.orders", { queue: "order-service" }, handler);
```

### Task Processing
```javascript
// Workers pull from task queue
nc.subscribe("tasks.process", { queue: "task-workers" }, processTask);
```

### Event Processing
```javascript
// Event processors share the load
nc.subscribe("events.>", { queue: "event-processors" }, handleEvent);
```

### API Gateway
```javascript
// Multiple gateway instances for high availability
nc.subscribe("api.>", { queue: "api-gateway" }, routeRequest);
```

## Related Concepts

- [Subjects](./subjects) - Understanding subject-based messaging
- [Request-Reply](./request-reply) - Synchronous communication patterns
- [Publish-Subscribe](./pub-sub-basics) - One-to-many messaging

## Try It Yourself

Create a simple work distribution system:

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```bash
# Terminal 1: Start first worker
nats sub tasks.process --queue workers

# Terminal 2: Start second worker  
nats sub tasks.process --queue workers

# Terminal 3: Send tasks
for i in {1..10}; do
  nats pub tasks.process "Task $i"
  sleep 0.5
done

# Watch tasks distributed between workers
```

</TabItem>
<TabItem value="javascript" label="JavaScript">

```javascript
// Simple task distribution demo
const nc = await connect();
const sc = StringCodec();

// Create workers
for (let w = 1; w <= 3; w++) {
  nc.subscribe("tasks", { queue: "workers" }, {
    callback: (err, msg) => {
      console.log(`Worker ${w} processing: ${sc.decode(msg.data)}`);
    }
  });
}

// Send tasks
for (let t = 1; t <= 10; t++) {
  nc.publish("tasks", sc.encode(`Task ${t}`));
  await new Promise(r => setTimeout(r, 100));
}
```

</TabItem>
</Tabs>