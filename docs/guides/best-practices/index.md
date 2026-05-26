---
title: Best Practices
sidebar_position: 1
description: Operational wisdom for building with NATS
---

# Best Practices

:::caution Work in Progress
This section is under active development. Content is being consolidated from across the documentation.
:::

Best practices for building robust, maintainable systems with NATS. Each guide covers a specific area in depth.

## Topics

- **[Naming Conventions](./naming-conventions)** — subject naming, hierarchies, and organization
- **[Error Handling](./error-handling)** — connection management, reconnection, and resilience
- **[Message Design](./message-design)** — serialization, message sizes, and schema strategies

## Quick Reference

| Problem | Solution |
|---------|----------|
| Messages lost before subscribers connect | Use [JetStream](/concepts/jetstream) for persistence |
| Too many unique subjects | Use wildcards and hierarchical naming |
| Slow subscriber backs up | Process messages asynchronously or use [queue groups](/concepts/queue-groups) |
