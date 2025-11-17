---
id: index
title: Getting Started
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Getting Started with NATS

Get up and running with NATS in minutes. This guide will walk you through installation, basic setup, and your first NATS application.

## Installation

### Quick Start with Docker

The fastest way to get NATS running:

```
docker run -p 4222:4222 -p 8222:8222 nats:latest
```

This starts NATS Server with:
- Client connections on port 4222
- HTTP monitoring on port 8222

### Install NATS Server

#### macOS
```
brew install nats-server
```

#### Linux
```
curl -L https://github.com/nats-io/nats-server/releases/latest/download/nats-server-linux-amd64.zip -o nats-server.zip
unzip nats-server.zip
sudo cp nats-server /usr/local/bin
```

#### Windows
Download the latest release from [GitHub Releases](https://github.com/nats-io/nats-server/releases).

### Verify Installation

```
nats-server --version
```

## Start NATS Server

### Basic Server
```
nats-server
```

### With Monitoring
```
nats-server -m 8222
```

Visit http://localhost:8222 to see server metrics.

### With JetStream (Persistence)
```
nats-server -js
```

## Install NATS CLI

The NATS CLI tool helps you interact with NATS:

```
# macOS
brew install nats-io/nats-tools/nats

# Linux
curl -L https://github.com/nats-io/natscli/releases/latest/download/nats-linux-amd64.zip -o nats-cli.zip
unzip nats-cli.zip
sudo cp nats /usr/local/bin
```

## Your First NATS Application

### Using the CLI

```
# Subscribe to a subject
nats sub hello &

# Publish a message
nats pub hello "Hello NATS!"
```

### Install Client Libraries

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```
# The NATS CLI is already installed (see above)
# You can use it directly for pub/sub operations
```

</TabItem>
<TabItem value="js" label="JavaScript/TypeScript">

```
npm install nats
```

</TabItem>
<TabItem value="go" label="Go">

```
go get github.com/nats-io/nats.go
```

</TabItem>
<TabItem value="python" label="Python">

```
pip install nats-py
```

</TabItem>
<TabItem value="java" label="Java">

```xml title="Maven"
<dependency>
    <groupId>io.nats</groupId>
    <artifactId>jnats</artifactId>
    <version>2.17.0</version>
</dependency>
```

```gradle title="Gradle"
implementation 'io.nats:jnats:2.17.0'
```

</TabItem>
<TabItem value="rust" label="Rust">

```toml title="Cargo.toml"
[dependencies]
async-nats = "0.33"
tokio = { version = "1", features = ["full"] }
```

</TabItem>
<TabItem value="csharp" label="C#/.NET">

```
dotnet add package NATS.Client.Core
```

</TabItem>
</Tabs>

### Publisher Example

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```
# Publish a single message
nats pub hello "Hello NATS!"

# Publish multiple messages
nats pub hello "Hello NATS!" --count=3

# Publish with headers
nats pub hello "Hello NATS!" -H "X-Custom:value"

# Publish JSON data
echo '{"name":"NATS","type":"messaging"}' | nats pub hello
```

</TabItem>
<TabItem value="js" label="JavaScript/TypeScript">

```javascript title="publisher.js"
const { connect, StringCodec } = require('nats');

(async () => {
  // Connect to NATS
  const nc = await connect({ servers: 'localhost:4222' });
  console.log('Connected to NATS');
  
  // Create encoder
  const sc = StringCodec();
  
  // Publish messages
  nc.publish('hello', sc.encode('Hello NATS!'));
  nc.publish('hello', sc.encode('Welcome to messaging'));
  
  console.log('Messages published');
  
  // Close connection
  await nc.close();
})();
```

</TabItem>
<TabItem value="go" label="Go">

```go title="publisher.go"
package main

import (
    "log"
    "github.com/nats-io/nats.go"
)

func main() {
    // Connect to NATS
    nc, err := nats.Connect("localhost:4222")
    if err != nil {
        log.Fatal(err)
    }
    defer nc.Close()
    
    log.Println("Connected to NATS")
    
    // Publish messages
    nc.Publish("hello", []byte("Hello NATS!"))
    nc.Publish("hello", []byte("Welcome to messaging"))
    
    log.Println("Messages published")
    
    // Flush and close
    nc.Flush()
}
```

</TabItem>
<TabItem value="python" label="Python">

```python title="publisher.py"
import asyncio
import nats

async def main():
    # Connect to NATS
    nc = await nats.connect("localhost:4222")
    print("Connected to NATS")
    
    # Publish messages
    await nc.publish("hello", b"Hello NATS!")
    await nc.publish("hello", b"Welcome to messaging")
    
    print("Messages published")
    
    # Close connection
    await nc.close()

if __name__ == '__main__':
    asyncio.run(main())
```

</TabItem>
<TabItem value="java" label="Java">

```java title="Publisher.java"
import io.nats.client.Connection;
import io.nats.client.Nats;
import java.time.Duration;

public class Publisher {
    public static void main(String[] args) throws Exception {
        // Connect to NATS
        Connection nc = Nats.connect("nats://localhost:4222");
        System.out.println("Connected to NATS");
        
        // Publish messages
        nc.publish("hello", "Hello NATS!".getBytes());
        nc.publish("hello", "Welcome to messaging".getBytes());
        
        System.out.println("Messages published");
        
        // Flush and close
        nc.flush(Duration.ZERO);
        nc.close();
    }
}
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust title="publisher.rs"
use async_nats;

#[tokio::main]
async fn main() -> Result<(), async_nats::Error> {
    // Connect to NATS
    let client = async_nats::connect("localhost:4222").await?;
    println!("Connected to NATS");
    
    // Publish messages
    client.publish("hello", "Hello NATS!".into()).await?;
    client.publish("hello", "Welcome to messaging".into()).await?;
    
    println!("Messages published");
    
    // Flush and close
    client.flush().await?;
    
    Ok(())
}
```

</TabItem>
<TabItem value="csharp" label="C#/.NET">

```csharp title="Publisher.cs"
using NATS.Client.Core;

// Connect to NATS
await using var nats = new NatsConnection();
Console.WriteLine("Connected to NATS");

// Publish messages
await nats.PublishAsync("hello", "Hello NATS!");
await nats.PublishAsync("hello", "Welcome to messaging");

Console.WriteLine("Messages published");
```

</TabItem>
</Tabs>

### Subscriber Example

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```
# Subscribe to a subject
nats sub hello

# Subscribe with queue group for load balancing
nats sub hello --queue=workers

# Subscribe and auto-acknowledge (useful for testing)
nats sub hello --ack

# Subscribe with custom output format
nats sub hello --raw
```

</TabItem>
<TabItem value="js" label="JavaScript/TypeScript">

```javascript title="subscriber.js"
const { connect, StringCodec } = require('nats');

(async () => {
  // Connect to NATS
  const nc = await connect({ servers: 'localhost:4222' });
  console.log('Connected to NATS');
  
  // Create decoder
  const sc = StringCodec();
  
  // Subscribe to 'hello'
  const sub = nc.subscribe('hello');
  console.log('Waiting for messages...');
  
  // Process messages
  for await (const msg of sub) {
    console.log(`Received: ${sc.decode(msg.data)}`);
  }
})();
```

</TabItem>
<TabItem value="go" label="Go">

```go title="subscriber.go"
package main

import (
    "log"
    "runtime"
    "github.com/nats-io/nats.go"
)

func main() {
    // Connect to NATS
    nc, err := nats.Connect("localhost:4222")
    if err != nil {
        log.Fatal(err)
    }
    defer nc.Close()
    
    log.Println("Connected to NATS")
    
    // Subscribe to 'hello'
    nc.Subscribe("hello", func(msg *nats.Msg) {
        log.Printf("Received: %s", string(msg.Data))
    })
    
    log.Println("Waiting for messages...")
    
    // Keep the connection alive
    runtime.Goexit()
}
```

</TabItem>
<TabItem value="python" label="Python">

```python title="subscriber.py"
import asyncio
import nats

async def main():
    # Connect to NATS
    nc = await nats.connect("localhost:4222")
    print("Connected to NATS")
    
    # Message handler
    async def message_handler(msg):
        data = msg.data.decode()
        print(f"Received: {data}")
    
    # Subscribe to 'hello'
    await nc.subscribe("hello", cb=message_handler)
    print("Waiting for messages...")
    
    # Keep the connection alive
    await asyncio.Future()

if __name__ == '__main__':
    asyncio.run(main())
```

</TabItem>
<TabItem value="java" label="Java">

```java title="Subscriber.java"
import io.nats.client.*;

public class Subscriber {
    public static void main(String[] args) throws Exception {
        // Connect to NATS
        Connection nc = Nats.connect("nats://localhost:4222");
        System.out.println("Connected to NATS");
        
        // Subscribe to 'hello'
        Dispatcher d = nc.createDispatcher((msg) -> {
            String message = new String(msg.getData());
            System.out.printf("Received: %s\n", message);
        });
        
        d.subscribe("hello");
        System.out.println("Waiting for messages...");
        
        // Keep the connection alive
        Thread.sleep(Long.MAX_VALUE);
    }
}
```

</TabItem>
<TabItem value="rust" label="Rust">

```rust title="subscriber.rs"
use async_nats;
use futures::StreamExt;

#[tokio::main]
async fn main() -> Result<(), async_nats::Error> {
    // Connect to NATS
    let client = async_nats::connect("localhost:4222").await?;
    println!("Connected to NATS");
    
    // Subscribe to 'hello'
    let mut subscriber = client.subscribe("hello").await?;
    println!("Waiting for messages...");
    
    // Process messages
    while let Some(msg) = subscriber.next().await {
        println!("Received: {}", 
            String::from_utf8_lossy(&msg.payload));
    }
    
    Ok(())
}
```

</TabItem>
<TabItem value="csharp" label="C#/.NET">

```csharp title="Subscriber.cs"
using NATS.Client.Core;
using System.Text;

// Connect to NATS
await using var nats = new NatsConnection();
Console.WriteLine("Connected to NATS");

// Subscribe to 'hello'
await foreach (var msg in nats.SubscribeAsync<string>("hello"))
{
    Console.WriteLine($"Received: {msg.Data}");
}
```

</TabItem>
</Tabs>

### Running the Examples

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```
# Terminal 1 - Start subscriber
nats sub hello

# Terminal 2 - Publish messages
nats pub hello "Hello NATS!"
nats pub hello "Welcome to messaging"

# Request-Reply pattern
# Terminal 1 - Start replier
nats reply hello "Hi there!"

# Terminal 2 - Send request
nats request hello "Anyone there?" --timeout=2s
```

</TabItem>
<TabItem value="js" label="JavaScript/TypeScript">

```
# Terminal 1 - Start subscriber
node subscriber.js

# Terminal 2 - Run publisher
node publisher.js
```

</TabItem>
<TabItem value="go" label="Go">

```
# Terminal 1 - Start subscriber
go run subscriber.go

# Terminal 2 - Run publisher
go run publisher.go
```

</TabItem>
<TabItem value="python" label="Python">

```
# Terminal 1 - Start subscriber
python subscriber.py

# Terminal 2 - Run publisher
python publisher.py
```

</TabItem>
<TabItem value="java" label="Java">

```
# Terminal 1 - Start subscriber
javac -cp ".:jnats-2.17.0.jar" Subscriber.java
java -cp ".:jnats-2.17.0.jar" Subscriber

# Terminal 2 - Run publisher
javac -cp ".:jnats-2.17.0.jar" Publisher.java
java -cp ".:jnats-2.17.0.jar" Publisher
```

</TabItem>
<TabItem value="rust" label="Rust">

```
# Terminal 1 - Start subscriber
cargo run --bin subscriber

# Terminal 2 - Run publisher
cargo run --bin publisher
```

</TabItem>
<TabItem value="csharp" label="C#/.NET">

```
# Terminal 1 - Start subscriber
dotnet run --project Subscriber

# Terminal 2 - Run publisher
dotnet run --project Publisher
```

</TabItem>
</Tabs>

## Next Steps

Congratulations! You've successfully:
- ✅ Installed NATS Server
- ✅ Published and subscribed to messages
- ✅ Built your first NATS application

### What to explore next:

1. **[Request-Reply Pattern](../concepts/request-reply)** - Synchronous communication
2. **[Queue Groups](../concepts/queue-groups)** - Load balancing
3. **[Subjects](../concepts/subjects)** - Understanding subject-based messaging
4. **[Pub/Sub Basics](../concepts/pub-sub-basics)** - Core messaging patterns

### Client Libraries

NATS has official clients for:
- [Go](https://github.com/nats-io/nats.go)
- [Java](https://github.com/nats-io/nats.java)
- [JavaScript/TypeScript](https://github.com/nats-io/nats.js)
- [Python](https://github.com/nats-io/nats.py)
- [Rust](https://github.com/nats-io/nats.rs)
- [C](https://github.com/nats-io/nats.c)
- [.NET](https://github.com/nats-io/nats.net)

### Resources

- [NATS by Example](https://natsbyexample.com) - Interactive examples
- [GitHub Examples](https://github.com/nats-io/nats-examples) - Sample applications
- [Slack Community](https://natsio.slack.com) - Get help from the community