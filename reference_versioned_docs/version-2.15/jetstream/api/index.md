---
title: JetStream API
---

# JetStream API

The JetStream API provides programmatic access to manage and interact with NATS JetStream resources. These APIs enable you to create, configure, and manage streams and consumers, as well as perform administrative operations.

## API Categories

- [Account](./account/) - Account-level JetStream management
- [Consumer](./consumer/) - Consumer management operations
- [Stream](./stream/) - Stream management and data operations
- [Meta](./meta/) - Metadata and cluster management operations

## Request/Response Pattern

All JetStream API operations follow a request/response pattern over standard NATS subjects. Requests are sent to specific API subjects, and responses are returned containing either the requested data or error information.

## Authentication and Authorization

JetStream API access is controlled through standard NATS authentication and authorization mechanisms. Users must have appropriate permissions to perform operations on streams and consumers.