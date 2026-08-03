---
id: what-is-nats
title: What is NATS?
sidebar_position: 1
---

# What is NATS?

NATS is an open source messaging system. Applications connect to a NATS server and exchange messages by subject, without knowing each other's network addresses.

## Overview

At its core, NATS is about **publishing and listening for messages**. It provides a layer between application components, allowing them to communicate without being directly connected or even aware of each other's existence.

NATS optimizes for a small single binary, low latency at high message rates, and secure defaults. It runs from one server on a laptop up to clusters of servers spanning regions.

## How NATS Works

NATS is a **messaging fabric** that connects all your applications and services:

<div class="nats-flow" data-scenario="publishSubscribe" data-width="600" data-height="400"></div>

### Core Components

1. **NATS Server** - The messaging broker that routes messages
2. **Publishers** - Applications that send messages
3. **Subscribers** - Applications that receive messages
4. **Subjects** - Named channels for message organization

## The NATS Ecosystem

NATS ships as a small set of pieces you compose together: the server, a client for your language, and tooling you add as you need it.

- **Server** — the single [`nats-server`](https://github.com/nats-io/nats-server) binary. Clustering, JetStream, leaf nodes, [MQTT](/learn/mqtt/), and [WebSocket](/learn/websocket/) are all configuration on the same process.
- **Clients** — official Tier 1 clients exist for Go, JavaScript/TypeScript, Python, Java, Rust, C#/.NET, and C. Tier 2 clients (may lag on new server features) cover Zig, Swift, Ruby, and Elixir.
- **Orbit** — optional per-language extension libraries with higher-level utilities and experimental features built on top of the core client.
- **Tooling** — the `nats` CLI with built-in `nats auth` identity commands, `nsc` as the standalone identity tool, NACK and Helm charts for Kubernetes, Prometheus exporter, surveyor, bridges to Kafka / JMS / Spark / Flink, and a Terraform provider.

See the [ecosystem page](ecosystem) for the full list with links.

## Key Differentiators

### Simplicity
NATS focuses on moving messages between applications. The server is one binary, and the client API is small.

### Performance
- Process millions of messages per second
- Sub-millisecond latency
- Small memory footprint (typically ~15MB)

### Location transparency
Applications don't need to know where other services are located. NATS handles:
- Service discovery
- Load balancing
- Fault tolerance

### Multi-tenancy
Accounts isolate messaging domains within one server or cluster, which supports:
- Secure multi-tenant deployments
- Department or team isolation
- SaaS platform building

## Use Cases

NATS excels in scenarios requiring:

### Agentic AI
- Agent-to-agent communication with automatic service discovery
- Real-time event streams for LLM inference and tool calls
- Multi-region GPU inference routing with scale-to-zero

### Real-time Data Streaming
- IoT telemetry collection
- Financial market data distribution
- Log and metrics aggregation

### Microservices Communication
- Service mesh data plane
- Event-driven architectures
- CQRS and Event Sourcing patterns

### Edge Computing
- Edge-to-cloud connectivity
- Intermittent network handling
- Bandwidth and resource-constrained environments

### Command and Control
- Remote procedure calls
- Configuration management
- System orchestration

## Next steps

- [Core NATS deep dive](/learn/core-nats) — go hands-on with the messaging fundamentals
- [The full Learn section](/learn) — guided chapters across every NATS topic
- [Getting Started Guide](getting-started) — set up your first NATS application
- [Pub/Sub Basics](pub-sub-basics) — deep dive into the publish-subscribe pattern
- [Request-Reply](request-reply) — learn synchronous communication patterns
