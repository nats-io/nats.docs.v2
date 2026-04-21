# Server Advisory

Server advisory messages are published by the NATS server to notify clients of significant events related to connections, accounts, and system state.

## Overview

Advisory messages provide real-time notifications about important server events. These messages are published to specific subjects in the `$SYS` hierarchy and can be subscribed to by clients with appropriate permissions.

## Purpose

Server advisories enable:
- **Connection Monitoring** - Track client connections and disconnections
- **Account Management** - Monitor account limits and usage
- **Audit Trails** - Log system events for compliance
- **Alerting** - Trigger actions based on system events
- **Debugging** - Troubleshoot connection issues

## Available Advisories

### Connection Events

- [Client Connect](./client-connect) - Published when a client connects to the server
  - Subject: `$SYS.ACCOUNT.{account}.CONNECT`
  - Contains client ID, IP address, and metadata

- [Client Disconnect](./client-disconnect) - Published when a client disconnects from the server
  - Subject: `$SYS.ACCOUNT.{account}.DISCONNECT`
  - Includes disconnect reason and statistics

### Account Events

- [Account Connections](./account-connections) - Published when account connection limits are reached
  - Subject: `$SYS.ACCOUNT.{account}.CONNECTIONS`
  - Alerts when approaching or exceeding limits

## Subscription Requirements

To receive advisory messages:
1. Client must have permissions to subscribe to `$SYS.>` subjects
2. System account privileges may be required for some advisories
3. Account-scoped advisories require access to specific account subjects

## Message Format

All advisory messages follow a consistent JSON structure:
```json
{
  "type": "io.nats.server.advisory.v1.{event_type}",
  "id": "unique_event_id",
  "timestamp": "2024-01-01T00:00:00Z",
  "server": {
    "name": "server_name",
    "host": "127.0.0.1",
    "id": "server_id",
    "cluster": "cluster_name"
  },
  "data": {
    // Event-specific data
  }
}
```

## Best Practices

- Use queue groups when multiple consumers process advisories
- Filter advisories at subscription level using subject wildcards
- Store critical advisories for audit purposes
- Set up alerts for connection limit warnings
- Monitor advisory message rates to detect anomalies