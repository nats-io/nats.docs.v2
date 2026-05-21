---
id: what-is-nats
title: What is NATS?
sidebar_position: 1
---

# What is NATS?

NATS is a connective technology that powers modern distributed systems. It provides a simple, secure, and performant communications substrate for cloud native applications, IoT, and microservices architectures.

## Overview

At its core, NATS is about **publishing and listening for messages**. It provides a layer between application components, allowing them to communicate without being directly connected or even aware of each other's existence.

### The NATS Philosophy

NATS embodies a set of principles that guide its design:

- **Simplicity** - Easy to understand, easy to use
- **Performance** - Speed and efficiency at scale
- **Reliability** - Always on, always available
- **Scalability** - From one to millions of nodes
- **Security** - Secure by default

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

- **Server** — the single [`nats-server`](https://github.com/nats-io/nats-server) binary. Clustering, JetStream, leaf nodes, MQTT, and WebSocket are all configuration on the same process.
- **Clients** — official Tier 1 clients exist for Go, JavaScript/TypeScript, Python, Java, Rust, C#/.NET, and C. Tier 2 clients (may lag on new server features) cover Zig, Swift, Ruby, and Elixir.
- **Orbit** — optional per-language extension libraries with higher-level utilities and experimental features built on top of the core client.
- **Tooling** — the `nats` CLI, `nsc` for identity, NACK and Helm charts for Kubernetes, Prometheus exporter, surveyor, bridges to Kafka / JMS / Spark / Flink, and a Terraform provider.

See the [ecosystem page](ecosystem) for the full list with links.

## Key Differentiators

### 1. Simplicity First
Unlike complex enterprise messaging systems, NATS focuses on doing one thing exceptionally well: moving messages between applications quickly and reliably.

### 2. Performance at Scale
- Process **millions of messages per second**
- Sub-millisecond latency
- Small memory footprint (typically ~15MB)

### 3. Location Transparency
Applications don't need to know where other services are located. NATS handles:
- Service discovery
- Load balancing
- Fault tolerance

### 4. Multi-Tenancy
Built-in support for isolated messaging domains through accounts, enabling:
- Secure multi-tenant deployments
- Department or team isolation
- SaaS platform building

## Use Cases

NATS excels in scenarios requiring:

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

### Agentic AI
- Agent-to-agent communication with automatic service discovery
- Real-time event streams for LLM inference and tool calls
- Multi-region GPU inference routing with scale-to-zero


## What's Next?

Now that you understand what NATS is, explore:

- **[Getting Started Guide](getting-started)** - Set up your first NATS application
- **[Pub/Sub Basics](concepts/pub-sub-basics)** - Deep dive into the publish-subscribe pattern
- **[Request-Reply](concepts/request-reply)** - Learn synchronous communication patterns
- **[Queue Groups](concepts/queue-groups)** - Implement load balancing

## Summary

NATS provides the connective tissue for modern distributed systems. Its simplicity, performance, and flexibility make it an ideal choice for organizations building cloud-native applications, IoT systems, or microservices architectures.

Whether you're connecting a handful of services or building a global messaging infrastructure, NATS scales with your needs while maintaining its core principles of simplicity and performance.
