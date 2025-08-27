---
title: System Errors
sidebar_label: Errors
description: NATS server non-JetStream errors for client, route, gateway, and leafnode connections
---

# System Errors

This page documents all non-JetStream errors that the NATS server can return to clients, routes, gateways, and leafnode connections.

## Authentication and Authorization Errors

| Error | Description |
|-------|-------------|
| `Authentication Error` | General authentication failure when client credentials are invalid or missing |
| `Authentication Timeout` | Client failed to authenticate within the configured timeout period |
| `Authentication Expired` | User authentication credentials have expired |
| `Account Authentication Expired` | Account authentication has expired |
| `Authorization Violation` | Client attempted an operation that violates configured permissions |
| `User Authentication Expired` | User JWT or credentials have expired |
| `User Authentication Revoked` | User credentials have been revoked |
| `Permissions Violation for Subscription` | Client attempted to subscribe to a subject without permission |
| `Permissions Violation for Publish` | Client attempted to publish to a subject without permission |

## Connection Limit Errors

| Error | Description |
|-------|-------------|
| `Maximum Connections Exceeded` | Server has reached its maximum number of allowed connections |
| `Maximum Account Active Connections Exceeded` | Account has reached its maximum number of allowed connections |
| `Connection Throttling Is Active` | Server is actively throttling new connections |
| `Maximum Subscriptions Exceeded` | Connection has reached its maximum number of allowed subscriptions |
| `Maximum Clients Exceeded` | Server has reached its maximum number of allowed clients |

## Protocol and Payload Errors

| Error | Description |
|-------|-------------|
| `Maximum Payload Exceeded` | Message payload exceeds the configured maximum size |
| `Maximum Control Line Exceeded` | Protocol control line exceeds the configured maximum size |
| `Maximum Payload Violation` | Published message exceeds the configured maximum payload size |
| `Invalid Client Protocol` | Client requested an unsupported protocol version |
| `Protocol Violation` | Client violated the NATS protocol |
| `Parser Error` | Error parsing the client protocol message |
| `Bad Message Header Detected` | Malformed message header detected |
| `Message Headers Not Supported` | Server does not support message headers |
| `No Responders Requires Headers Support` | Client requested no-responders behavior but headers are not enabled |

## Subject and Publishing Errors

| Error | Description |
|-------|-------------|
| `Invalid Subject` | Subject contains invalid characters or format |
| `Invalid Publish Subject` | Publish subject is malformed or invalid |
| `Reserved Internal Subject` | Attempted to publish to a reserved system subject |
| `Subject Has Exceeded Number of Tokens Limit` | Subject contains too many tokens (dot-separated segments) |
| `Malformed Subject` | Subject does not conform to valid subject rules |
| `Invalid Subscription` | Subscription request is invalid |

## TLS and Security Errors

| Error | Description |
|-------|-------------|
| `Secure Connection - TLS Required` | Server requires TLS but client attempted non-TLS connection |
| `TLS Handshake Error` | TLS handshake failed |
| `Certificate Not Pinned` | Client certificate is not in the pinned certificates list |
| `Proxy Is Not Trusted` | Connection from proxy that is not in the trusted proxy list |
| `Proxy Connection Required` | Server requires connections to come through a proxy |

## Account Errors

| Error | Description |
|-------|-------------|
| `Bad Account` | Account is malformed or incorrect |
| `Account Missing` | Referenced account does not exist |
| `Account Expired` | Account has expired |
| `Failed Account Registration` | Failed to register client with account |
| `Account Validation Failed` | Account failed validation checks |
| `Service Missing` | Account does not have the requested exported service |
| `Stream Import Not Authorized` | Stream import is not authorized |
| `Service Import Not Authorized` | Service import is not authorized |

## Server Name and Cluster Errors

| Error | Description |
|-------|-------------|
| `Duplicate Server Name` | Server name already exists in the cluster |
| `Server Name Cannot Contain Spaces` | Server name contains invalid space characters |
| `Cluster Name Cannot Contain Spaces` | Cluster name contains invalid space characters |
| `Cluster Name Conflicts` | Cluster name conflicts between cluster and gateway definitions |

## Wrong Port Connection Errors

| Error | Description |
|-------|-------------|
| `Attempted to Connect to Route Port` | Client attempted to connect to the route port instead of client port |
| `Attempted to Connect to Leaf Node Port` | Client attempted to connect to the leafnode port instead of client port |
| `Attempted to Connect to Gateway Port` | Client or route attempted to connect to the gateway port |
| `Attempted to Connect to Wrong Port` | Connection attempted on wrong port type |

## Route-Specific Errors

| Error | Description |
|-------|-------------|
| `Duplicate Route` | Route already exists to this server |
| `Route Authorization Violation` | Route connection failed authorization |
| `Cluster Name From Remote Server Conflicts` | Remote route server has conflicting cluster name |
| `Minimum Version Required` | Route connection does not meet minimum version requirement |

## Gateway-Specific Errors

| Error | Description |
|-------|-------------|
| `Wrong Gateway` | Gateway connection attempted to wrong gateway |
| `Gateway Name Cannot Contain Spaces` | Gateway name contains invalid space characters |
| `Connection to Gateway Rejected` | Gateway rejected the connection |

## Leafnode-Specific Errors

| Error | Description |
|-------|-------------|
| `Leafnode Loop Detected` | Leafnode connection would create a loop |
| `Remote Leafnode Has Same Cluster Name` | Leafnode cluster has the same name as the hub cluster |
| `Leafnodes Disabled` | Server has leafnodes disabled |

## Slow Consumer and Flow Control

| Error | Description |
|-------|-------------|
| `Slow Consumer Detected` | Client is not processing messages fast enough |
| `Consumer Is Slow` | Consumer cannot keep up with message rate |
| `Write Deadline Exceeded` | Connection write operation exceeded timeout |

## Connection State Errors

| Error | Description |
|-------|-------------|
| `Connection Closed` | Connection has been closed |
| `Stale Connection` | Connection is stale and needs to be refreshed |
| `Server Is Not Running` | Server is not currently running |

## Configuration and Resolver Errors

| Error | Description |
|-------|-------------|
| `Account Resolver Missing` | No account resolver is configured |
| `Account Resolver Update Too Soon` | Account resolver update attempted too frequently |
| `Account Resolver No New Claims` | Account resolver returned same claims |
| `System Account Not Setup` | System account is not configured |
| `Credentials Have Been Revoked` | Client credentials have been revoked |
