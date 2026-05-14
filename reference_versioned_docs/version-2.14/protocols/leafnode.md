---
description: The NATS leafnode protocol is used to create lightweight, unidirectional connections from edge servers to a central cluster.
mdx:
  format: md
---

# Leafnode

Leafnode connections extend NATS clusters by creating lightweight, unidirectional connections from edge servers to a central cluster. The leafnode protocol is optimized for hub-and-spoke topologies, enabling edge deployments while maintaining low overhead. Unlike cluster routes, leafnodes create asymmetric connections where the edge initiates and maintains the connection to the hub.

## Overview

The following table lists the leafnode protocol messages. Leafnode protocol operations are case insensitive, thus `LS+ foo\r\n` and `ls+ foo\r\n` are equivalent.

| Message               | Sent By          | Description                                                                     |
| --------------------- | ---------------- | ------------------------------------------------------------------------------- |
| [`INFO`](#info)       | All Servers      | Sent after initial connection with leafnode-specific extensions                |
| [`CONNECT`](#connect) | Leafnode         | Sent to establish and authenticate a leafnode connection                       |
| [`LS+`](#ls)          | All Servers      | Subscribes to a subject, optionally with queue group and weight                |
| [`LS-`](#ls-1)        | All Servers      | Unsubscribes from a subject, optionally with queue group                       |
| [`LMSG`](#lmsg)       | All Servers      | Delivers a message with subject, optional reply, and queue groups              |
| [`LDS`](#lds)         | Hub Server       | Loop detection subjects to prevent routing loops                               |
| [`PING`](#ping-pong)  | All Servers      | PING keep-alive message                                                        |
| [`PONG`](#ping-pong)  | All Servers      | PONG keep-alive response                                                       |
| [`-ERR`](#err)        | All Servers      | Indicates a protocol error. May cause the leafnode to disconnect.              |

## INFO

The `INFO` message for leafnodes includes server capabilities and configuration needed for connection establishment. Both the hub and leafnode exchange INFO messages upon connection.

### Syntax

```
INFO {<key>:<value>,...}
```

Leafnode-specific fields include:

- `server_id`: The unique identifier of the NATS server
- `version`: The version of the NATS server
- `proto`: Protocol version (1 for current leafnode protocol)
- `go`: The version of golang the NATS server was built with
- `host`: The host specified in the leafnode configuration
- `port`: The port number for leafnode connections
- `headers`: Whether headers are supported (true/false)
- `jetstream`: Whether JetStream is enabled
- `compression`: Compression mode (`off`, `accept`, `s2_auto`, `s2_fast`, `s2_better`, `s2_uncompressed`)
- `cluster`: Name of the cluster (if part of a cluster)
- `domain`: JetStream domain name
- `xkey`: Server's public xkey for encryption
- `auth_required`: If set, authentication is required
- `tls_required`: If set, TLS is required
- `tls_verify`: If set, TLS certificate verification is required
- `max_payload`: Maximum payload size accepted
- `client_id`: Client ID for compression negotiation
- `nonce`: Nonce for security operations
- `connect_urls`: Alternative servers to connect to

### Example

```
INFO {"server_id":"NCXU7YJOG5XAU","version":"2.10.0","proto":1,"go":"go1.21","host":"localhost","port":7422,"headers":true,"max_payload":1048576,"jetstream":true,"compression":"s2_auto","cluster":"hub-cluster","domain":"hub","connect_urls":["localhost:7422"]}
```

## CONNECT

The `CONNECT` message is sent by the leafnode to authenticate and establish the connection parameters. It includes leafnode-specific configuration and capabilities.

### Syntax

```
CONNECT {<key>:<value>,...}
```

Valid options include:

- `version`: The version of the leafnode server
- `server_id`: The unique identifier of the leafnode
- `name`: Server name of the leafnode
- `domain`: JetStream domain of the leafnode
- `cluster`: Cluster name of the leafnode (if clustered)
- `hub`: Whether this is a hub connection (true/false)
- `headers`: Whether headers are supported
- `jetstream`: Whether JetStream is enabled on the leafnode
- `compression`: Requested compression mode
- `remote_account`: Account to bind the leafnode connection to
- `proto`: Protocol version
- `nkey`: Public NKey for authentication
- `jwt`: JWT for authentication
- `sig`: Signature for nkey authentication
- `user`: Username for basic authentication
- `pass`: Password for basic authentication
- `auth_token`: Token for token authentication
- `tls_required`: Whether TLS is required

### Example

```
CONNECT {"version":"2.10.0","server_id":"NATS123","name":"edge-1","cluster":"edge","hub":false,"headers":true,"jetstream":false,"compression":"s2_auto","remote_account":"EDGE_ACCOUNT","proto":1}\r\n
```

## LS+

`LS+` registers interest in a subject on the leafnode connection, optionally with a queue group and weight for distributed queues.

### Syntax

**Simple Subscription**

```
LS+ <subject>\r\n
```

**Queue Subscription**

```
LS+ <subject> <queue_group>\r\n
```

**Weighted Queue Subscription**

```
LS+ <subject> <queue_group> <weight>\r\n
```

where:

- `subject`: The subject to subscribe to (supports wildcards)
- `queue_group`: Optional queue group name
- `weight`: Optional weight for queue distribution (default 1)

### Examples

```
LS+ orders.new\r\n
LS+ orders.> fulfillment\r\n
LS+ orders.> fulfillment 4\r\n
```

### Origin Cluster Support

With LNOCU (Leaf Node Origin Cluster Unsub) support, LS+ can include origin cluster information to prevent loops:

```
LS+ <subject> <queue_group> <weight> <origin_cluster>\r\n
```

## LS- {#ls-1}

`LS-` removes interest in a subject on the leafnode connection, optionally for a specific queue group.

### Syntax

**Simple Unsubscription**

```
LS- <subject>\r\n
```

**Queue Unsubscription**

```
LS- <subject> <queue_group>\r\n
```

where:

- `subject`: The subject to unsubscribe from
- `queue_group`: Optional queue group name

### Examples

```
LS- orders.old\r\n
LS- orders.cancelled fulfillment\r\n
```

### Origin Cluster Support

With LNOCU support, LS- can include origin cluster information:

```
LS- <subject> <queue_group> <origin_cluster>\r\n
```

## LMSG

The `LMSG` protocol message delivers a message through the leafnode connection. It supports reply subjects, queue group targeting, and headers.

### Syntax

**Simple Message**

```
LMSG <subject> <size>\r\n[payload]\r\n
```

**Message with Reply**

```
LMSG <subject> + <reply> <size>\r\n[payload]\r\n
```

**Message with Queue Groups**

```
LMSG <subject> | <queue_group1> [queue_group2...] <size>\r\n[payload]\r\n
```

**Message with Reply and Queue Groups**

```
LMSG <subject> + <reply> <queue_group1> [queue_group2...] <size>\r\n[payload]\r\n
```

**Message with Headers**

```
LMSG <subject> [+ reply] [| queue_groups...] <header_size> <total_size>\r\n[headers]\r\n[payload]\r\n
```

where:

- `subject`: The subject to deliver the message to
- `+`: Indicator that a reply subject follows
- `reply`: Optional reply subject
- `|`: Indicator that queue groups follow
- `queue_group`: Target queue groups for delivery
- `header_size`: Size of headers in bytes (for messages with headers)
- `total_size`: Total size of headers plus payload
- `size`: Size of the payload in bytes (for messages without headers)
- `headers`: NATS headers in standard format
- `payload`: The message payload

### Examples

```
LMSG orders.new 11\r\nHello World\r\n
```

```
LMSG orders.new + _INBOX.123 11\r\nHello World\r\n
```

```
LMSG orders.new | fulfillment 11\r\nHello World\r\n
```

```
LMSG orders.new + _INBOX.123 fulfillment shipping 11\r\nHello World\r\n
```

```
LMSG orders.new 22 33\r\nNATS/1.0\r\nFoo: Bar\r\n\r\nHello World\r\n
```

## LDS

Loop Detection Subjects (LDS) are special subjects used to detect and prevent routing loops in complex leafnode topologies.

### Format

```
$LDS.<unique_id>
```

where:

- `$LDS.`: Fixed prefix for loop detection subjects
- `unique_id`: Unique identifier generated per account

### Purpose

When a server receives its own LDS subject through a leafnode connection, it detects a routing loop and takes corrective action:

1. Logs the loop detection
2. Closes the connection
3. Implements a 30-second reconnection delay
4. Prevents message loops that could cause infinite routing

### Example

```
$LDS.5XZq8bFpWH1234567890abcdef
```

## Compression

Leafnodes support S2 compression to reduce bandwidth usage, especially valuable for WAN connections.

### Compression Modes

- `off`: No compression
- `accept`: Accept compressed connections but don't initiate
- `s2_auto`: Automatically select compression based on RTT
- `s2_fast`: S2 fast compression (lower CPU, less compression)
- `s2_better`: S2 better compression (higher CPU, more compression)
- `s2_uncompressed`: S2 framing without compression

### Negotiation

Compression is negotiated through the INFO protocol exchange:

1. Both sides advertise compression capabilities in INFO
2. Leafnode proposes compression mode in CONNECT
3. Hub accepts or modifies the compression mode
4. S2 compression begins after successful negotiation

### Auto Mode

In `s2_auto` mode, compression is enabled based on RTT measurements:
- Enabled if RTT > threshold (typically for WAN connections)
- Disabled for low-latency LAN connections
- Dynamically adjusts based on connection characteristics

## WebSocket Support

Leafnodes can connect over WebSocket for firewall traversal and browser compatibility.

### WebSocket Path

```
ws://server:port/leafnode
```

### Features

- Standard leafnode protocol over WebSocket frames
- Optional per-message-deflate compression
- Frame masking (can be disabled for performance)
- Same authentication and protocol messages

### Example Connection URL

```
ws://hub.example.com:443/leafnode
```

## Permission and Security

### Account Binding

Leafnodes can be bound to specific accounts using `remote_account` in CONNECT:
- Messages are scoped to the bound account
- Prevents cross-account message leakage
- Enables multi-tenant edge deployments

### Permission Violations

When permissions are violated:
- Connection is closed with `-ERR 'Permissions Violation'`
- 30-second reconnection delay is enforced
- Violations are logged for security auditing

### Authentication Methods

Leafnodes support multiple authentication methods:
- NKey with signature
- JWT with NKey
- Username/Password
- Auth Token
- TLS client certificates

## PING/PONG {#ping-pong}

`PING` and `PONG` implement keep-alive between leafnode and hub. Servers send `PING` messages at configurable intervals. Failure to respond with `PONG` results in connection termination.

### Syntax

```
PING\r\n
```

```
PONG\r\n
```

## -ERR {#err}

The `-ERR` message indicates a protocol, authorization, or runtime error. Most errors result in the leafnode connection being closed.

### Syntax

```
-ERR <error message>
```

### Common Leafnode Errors

- `-ERR 'Permissions Violation'`: Subject/publish permission denied
- `-ERR 'Loop Detected'`: Routing loop detected via LDS
- `-ERR 'Authorization Violation'`: Authentication/authorization failure
- `-ERR 'Maximum Payload Exceeded'`: Message exceeds max_payload
- `-ERR 'Invalid Subject'`: Malformed subject in protocol message
- `-ERR 'Leafnode Not Allowed'`: Server not configured for leafnodes
