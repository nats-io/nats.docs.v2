---
description: The NATS gateway protocol is used to connect multiple NATS clusters together.
mdx:
  format: md
---

# Gateway

Gateway connections enable NATS super-clusters by connecting multiple clusters together. The gateway protocol extends the [route protocol](./route.md) with account-aware routing and interest-based optimizations. In the context of a super-cluster, gateways act as intelligent bridges that route messages between clusters based on account and subject interest.

## Overview

The following table lists the gateway protocol messages. Gateway protocol operations are case insensitive, thus `A+ foo\r\n` and `a+ foo\r\n` are equivalent.

| Message               | Sent By         | Description                                                                        |
| --------------------- | --------------- | ---------------------------------------------------------------------------------- |
| [`INFO`](#info)       | All Gateways    | Sent after initial connection with gateway-specific extensions                    |
| [`CONNECT`](#connect) | All Gateways    | Sent to establish a gateway connection                                            |
| [`A+`](#a)            | All Gateways    | Subscribes to all subjects for a given account                                    |
| [`A-`](#a-1)          | All Gateways    | Unsubscribes from all subjects for a given account                                |
| [`RS+`](#rs)          | All Gateways    | Subscribes to a subject for a given account on behalf of interested clients       |
| [`RS-`](#rs-1)        | All Gateways    | Unsubscribes from subject for a given account (or indicates no interest)          |
| [`RMSG`](#rmsg)       | Origin Gateway  | Delivers a message for a given subject and account to another gateway             |
| [`HMSG`](#hmsg)       | Origin Gateway  | Delivers a message with headers for a given subject and account                   |
| [`PING`](#ping-pong)  | All Gateways    | PING keep-alive message                                                           |
| [`PONG`](#ping-pong)  | All Gateways    | PONG keep-alive response                                                          |
| [`-ERR`](#err)        | All Gateways    | Indicates a protocol error. May cause the remote gateway to disconnect.           |

## INFO

The `INFO` message for gateways extends the standard INFO protocol with gateway-specific fields. When a gateway accepts a connection, it sends information about itself, its cluster, and gateway-specific configuration.

### Syntax

```
INFO {<key>:<value>,...}
```

Gateway-specific fields include:

- `gateway`: The name of the gateway
- `gateway_urls`: URLs of other gateways in the cluster
- `gateway_url`: The URL of this gateway
- `gateway_cmd`: Optional command code for gateway coordination
- `gateway_cmd_payload`: Optional payload for gateway commands
- `server_id`: The unique identifier of the NATS server
- `version`: The version of the NATS server
- `go`: The version of golang the NATS server was built with
- `host`: The host specified in the gateway parameter/options
- `port`: The port number specified in the gateway parameter/options
- `auth_required`: If set, the gateway should authenticate upon connect
- `tls_required`: If set, the gateway must authenticate using TLS
- `max_payload`: Maximum payload size that the gateway will accept
- `connect_urls`: A list of server URLs that a client can connect to
- `ip`: Optional gateway connection address, `nats-gw://<hostname>:<port>`

### Gateway Commands

The `gateway_cmd` field supports the following command codes:

- `1` (Gossip): Gossip gateway topology information
- `2` (All Subs Start): Begin sending all subscriptions for an account
- `3` (All Subs Complete): Complete sending all subscriptions for an account

### Example

```
INFO {"server_id":"NCDU7ZKDF2XTYQUA","version":"2.10.0","go":"go1.21","host":"hub.nats.io","port":7222,"gateway":"hub","gateway_urls":["hub.nats.io:7222"],"gateway_url":"nats-gw://hub.nats.io:7222","auth_required":false,"tls_required":true,"max_payload":1048576}
```

## CONNECT

The `CONNECT` message establishes a gateway connection after the `INFO` exchange. It provides authentication and connection details.

### Syntax

```
CONNECT {<key>:<value>,...}
```

Valid options include:

- `tls_required`: Indicates whether the gateway requires an SSL connection
- `auth_token`: Authorization token
- `user`: Connection username (if `auth_required` is set)
- `pass`: Connection password (if `auth_required` is set)
- `name`: Generated gateway name
- `lang`: The implementation language of the gateway (go)
- `version`: The version of the gateway

### Example

```
CONNECT {"tls_required":true,"name":"hub-gateway-us-east","lang":"go","version":"2.10.0"}\r\n
```

## A+

`A+` subscribes to all subjects for a specific account. This is used for account-level interest propagation between gateways.

### Syntax

```
A+ <account>\r\n
```

where:

- `account`: The account name to subscribe to

### Example

```
A+ SYS\r\n
```

## A- {#a-1}

`A-` unsubscribes from all subjects for a specific account. Sent when a gateway no longer has any interest in an account.

### Syntax

```
A- <account>\r\n
```

where:

- `account`: The account name to unsubscribe from

### Example

```
A- SYS\r\n
```

## RS+

`RS+` initiates a subscription to a subject on a given account, optionally with a distributed queue group name and weighting factor. This is used for fine-grained subject interest propagation.

### Syntax

**Subscription**

```
RS+ <account> <subject>\r\n
```

**Queue Subscription**

```
RS+ <account> <subject> <queue> <weight>\r\n
```

where:

- `account`: The account associated with the subject interest
- `subject`: The subject
- `queue`: Optional queue group name
- `weight`: Optional queue group weight representing subscriber count

### Examples

```
RS+ ACC1 orders.new\r\n
RS+ ACC1 orders.> fulfillment 5\r\n
```

## RS- {#rs-1}

`RS-` unsubscribes from the specified subject on the given account or indicates no interest. In optimistic mode, this prevents future message delivery for this subject.

### Syntax

**Unsubscription**

```
RS- <account> <subject>\r\n
```

**Queue Unsubscription**

```
RS- <account> <subject> <queue>\r\n
```

where:

- `account`: The account associated with the subject
- `subject`: The subject
- `queue`: Optional queue group name

### Examples

```
RS- ACC1 orders.old\r\n
RS- ACC1 orders.processed fulfillment\r\n
```

## RMSG

The `RMSG` protocol message delivers a message to another gateway for a specific account and subject.

### Syntax

```
RMSG <account> <subject> [reply-to] <bytes>\r\n[payload]\r\n
```

where:

- `account`: The account associated with the message
- `subject`: Subject name this message was received on
- `reply-to`: The optional reply subject
- `bytes`: Size of the payload in bytes
- `payload`: The message payload data

### Example

```
RMSG ACC1 orders.new 11\r\nHello World\r\n
```

## HMSG

The `HMSG` protocol message delivers a message with headers to another gateway. This extends `RMSG` with header support.

### Syntax

```
HMSG <account> <subject> [reply-to] <header-bytes> <total-bytes>\r\n[headers]\r\n[payload]\r\n
```

where:

- `account`: The account associated with the message
- `subject`: Subject name this message was received on
- `reply-to`: The optional reply subject
- `header-bytes`: Size of the headers in bytes
- `total-bytes`: Total size of headers plus payload in bytes
- `headers`: The message headers in NATS header format
- `payload`: The message payload data

### Example

```
HMSG ACC1 orders.new _INBOX.123 22 33\r\nNATS/1.0\r\nFoo: Bar\r\n\r\nHello World\r\n
```

## Interest Management

Gateways use sophisticated interest management to minimize cross-cluster traffic:

### Optimistic Mode
Initially, gateways operate in optimistic mode, assuming interest exists and forwarding messages. They track `RS-` responses to build a "no interest" list.

### Interest-Only Mode
When too many `RS-` messages are received (indicating low interest overlap), the gateway switches to interest-only mode. In this mode:
- Only subjects with explicit `RS+` subscriptions receive messages
- Full subscription state is maintained via `A+` and `RS+` messages
- Reduces unnecessary cross-cluster traffic

### Transition Protocol
The transition uses gateway commands in the INFO message:
1. Gateway sends `gateway_cmd: 2` (All Subs Start) 
2. Gateway sends all `RS+` messages for known subscriptions
3. Gateway sends `gateway_cmd: 3` (All Subs Complete)
4. Remote gateway switches to interest-only mode for that account

## PING/PONG {#ping-pong}

`PING` and `PONG` implement keep-alive between gateways. Gateways continuously send `PING` messages at a configurable interval. Failure to respond with `PONG` within the configured timeout results in connection termination.

### Syntax

```
PING\r\n
```

```
PONG\r\n
```

## -ERR {#err}

The `-ERR` message indicates a protocol, authorization, or runtime error. Most errors result in the gateway closing the connection.

### Syntax

```
-ERR <error message>
```

### Common Gateway Errors

- `-ERR 'Invalid Account'`: Unknown or unauthorized account
- `-ERR 'Gateway Protocol Error'`: Malformed gateway protocol message
- `-ERR 'Authorization Violation'`: Gateway authorization failure
- `-ERR 'Maximum Payload Exceeded'`: Message exceeds max_payload setting
