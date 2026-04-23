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

```bash
# The NATS CLI is already installed (see above)
# You can use it directly for pub/sub operations
```

</TabItem>
<TabItem value="js" label="JavaScript/TypeScript">

```bash
npm install nats
```

</TabItem>
<TabItem value="go" label="Go">

```bash
go get github.com/nats-io/nats.go
```

</TabItem>
<TabItem value="rust" label="Rust">

```toml title="Cargo.toml"
[dependencies]
async-nats = "0.33"
tokio = { version = "1", features = ["full"] }
```

</TabItem>
<TabItem value="java" label="Java">

Gradle
```json
dependencies {
  implementation 'io.nats:jnats:2.25.2'
}
```

Maven
```xml
<dependency>
    <groupId>io.nats</groupId>
    <artifactId>jnats</artifactId>
    <version>2.25.2</version>
</dependency>
```

</TabItem>
</Tabs>

### Publisher Example

<div class="nats-example" data-type="getting-started-publish" data-languages="cli,js,go,rust,java"></div>

### Subscriber Example

<div class="nats-example" data-type="getting-started-subscribe" data-languages="cli,js,go,rust,java"></div>

### Running the Examples

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```bash
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

```bash
# Terminal 1 - Start subscriber
node subscribe.js

# Terminal 2 - Run publisher
node publish.js
```

</TabItem>
<TabItem value="go" label="Go">

```bash
# Terminal 1 - Start subscriber
go run subscribe.go

# Terminal 2 - Run publisher
go run publish.go
```

</TabItem>
<TabItem value="rust" label="Rust">

```bash
# Terminal 1 - Start subscriber
cargo run --bin subscribe

# Terminal 2 - Run publisher
cargo run --bin publish
```

</TabItem>
<TabItem value="java" label="Java">

> It's best to run the examples from your ide or command line where java is installed.
> See <a href="https://github.com/nats-io/nats.java/tree/main/examples/src/main/java/io/nats/examples/natsIoDoc">NATS Doc Examples</a>

</TabItem>
</Tabs>
E
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