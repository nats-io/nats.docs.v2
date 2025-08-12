---
id: index
title: Getting Started
sidebar_position: 1
---

# Getting Started with NATS

Get up and running with NATS in minutes. This guide will walk you through installation, basic setup, and your first NATS application.

## Installation

### Quick Start with Docker

The fastest way to get NATS running:

```bash
docker run -p 4222:4222 -p 8222:8222 nats:latest
```

This starts NATS Server with:
- Client connections on port 4222
- HTTP monitoring on port 8222

### Install NATS Server

#### macOS
```bash
brew install nats-server
```

#### Linux
```bash
curl -L https://github.com/nats-io/nats-server/releases/latest/download/nats-server-linux-amd64.zip -o nats-server.zip
unzip nats-server.zip
sudo cp nats-server /usr/local/bin
```

#### Windows
Download the latest release from [GitHub Releases](https://github.com/nats-io/nats-server/releases).

### Verify Installation

```bash
nats-server --version
```

## Start NATS Server

### Basic Server
```bash
nats-server
```

### With Monitoring
```bash
nats-server -m 8222
```

Visit http://localhost:8222 to see server metrics.

### With JetStream (Persistence)
```bash
nats-server -js
```

## Install NATS CLI

The NATS CLI tool helps you interact with NATS:

```bash
# macOS
brew install nats-io/nats-tools/nats

# Linux
curl -L https://github.com/nats-io/natscli/releases/latest/download/nats-linux-amd64.zip -o nats-cli.zip
unzip nats-cli.zip
sudo cp nats /usr/local/bin
```

## Your First NATS Application

### Using the CLI

```bash
# Subscribe to a subject
nats sub hello &

# Publish a message
nats pub hello "Hello NATS!"
```

### Node.js Example

1. **Install the client library:**
```bash
npm install nats
```

2. **Publisher (publisher.js):**
```javascript
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

3. **Subscriber (subscriber.js):**
```javascript
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

4. **Run the example:**
```bash
# Terminal 1 - Start subscriber
node subscriber.js

# Terminal 2 - Run publisher
node publisher.js
```

## Next Steps

Congratulations! You've successfully:
- ✅ Installed NATS Server
- ✅ Published and subscribed to messages
- ✅ Built your first NATS application

### What to explore next:

1. **[Request-Reply Pattern](https://docs.nats.io/nats-concepts/core-nats/reqreply)** - Synchronous communication
2. **[Queue Groups](https://docs.nats.io/nats-concepts/core-nats/queue)** - Load balancing
3. **[JetStream](https://docs.nats.io/jetstream)** - Persistent messaging
4. **[Security](https://docs.nats.io/running-a-nats-service/configuration/securing_nats)** - Authentication & TLS

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