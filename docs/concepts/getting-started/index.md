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
curl -sf https://binaries.nats.dev/nats-io/nats-server/v2@latest | sh
sudo mv nats-server /usr/local/bin/
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
curl -sf https://binaries.nats.dev/nats-io/natscli/nats@latest | sh
sudo mv nats /usr/local/bin/
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
<TabItem value="java" label="Java">

Gradle
```groovy
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
<TabItem value="rust" label="Rust">

```toml title="Cargo.toml"
[dependencies]
async-nats = "0.47.0"
tokio = { version = "1", features = ["full"] }
```

</TabItem>
<TabItem value="csharp" label="C#/.NET">

```bash
dotnet add package NATS.Net
```

See [NATS.Net on NuGet](https://www.nuget.org/packages/NATS.Net) for the latest version.

</TabItem>
</Tabs>

### Publisher Example

<div class="nats-example" data-type="getting-started-publish" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

### Subscriber Example

<div class="nats-example" data-type="getting-started-subscribe" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

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
<TabItem value="java" label="Java">

```text
It's best to run the examples from your IDE or 
command line where Java is installed.

Clone https://github.com/nats-io/nats.java
and navigate to src/main/java/io/nats/examples/natsIoDoc
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
<TabItem value="csharp" label="C#/.NET">

```text
It's best to run the examples from your IDE or
command line where the .NET SDK is installed.

Clone https://github.com/nats-io/nats.net
and navigate to examples/Example.NatsIODocs
```

</TabItem>
</Tabs>

## Next Steps

Congratulations! You've successfully:
- ✅ Installed NATS Server
- ✅ Published and subscribed to messages
- ✅ Built your first NATS application

### What to explore next:

- [Core NATS deep dive](/learn/core-nats) — hands-on path through the fundamentals
- [JetStream deep dive](/learn/jetstream) — persistence and streaming
- [The full Learn section](/learn) — guided, runnable chapters
- [Request-Reply Pattern](../request-reply) — synchronous communication
- [Subjects](../subjects) — understanding subject-based messaging

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
- [Slack Community](https://slack.nats.io) - Get help from the community