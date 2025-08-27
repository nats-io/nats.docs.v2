# Protocols

NATS uses text-based protocols for all communication between clients, servers, and clusters. These protocols are designed to be simple, efficient, and easy to implement.

## Protocol Types

### [Client Protocol](client)
The fundamental protocol for client-server communication. This text-based protocol defines how clients connect, authenticate, publish messages, create subscriptions, and handle responses. Features include:
- Simple text-based commands (PUB, SUB, UNSUB)
- Optional TLS encryption
- Built-in heartbeat mechanism (PING/PONG)
- Support for request-reply patterns
- Header support for metadata

### [Route Protocol](route)
Used for intra-cluster communication between NATS servers. Routes create a full mesh topology where every server connects to every other server in the cluster. Key characteristics:
- Automatic message routing between servers
- Interest propagation for efficient message delivery
- Cluster-wide state synchronization
- Fault tolerance and automatic failover

### [Leafnode Protocol](leafnode)
Enables lightweight, unidirectional connections from edge servers to a central cluster. Ideal for:
- IoT and edge deployments
- Hub-and-spoke architectures
- Reducing bandwidth usage
- Selective message propagation
- Account isolation

### [Gateway Protocol](gateway)
Connects multiple NATS clusters into a super-cluster while maintaining cluster autonomy. Benefits include:
- Cross-cluster communication
- Geographic distribution
- Interest-only message exchange
- Account mapping and isolation
- Optimized for WAN connections

## Protocol Selection

| Use Case | Recommended Protocol |
|----------|---------------------|
| Client applications | Client Protocol |
| High availability cluster | Route Protocol |
| Edge/IoT deployments | Leafnode Protocol |
| Multi-region/Multi-cloud | Gateway Protocol |

## Common Protocol Features

All NATS protocols share these characteristics:
- Text-based - Human-readable for easy debugging
- Lightweight - Minimal overhead for high performance
- Secure - TLS support across all protocols
- Resilient - Automatic reconnection and failover
- Efficient - Interest-based message routing