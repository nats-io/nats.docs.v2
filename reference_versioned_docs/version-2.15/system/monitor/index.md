# Server Monitoring

Server monitoring endpoints provide detailed information about the NATS server state, performance metrics, and operational health.

## Overview

NATS Server exposes HTTP monitoring endpoints that return JSON-formatted data about server operations. These endpoints are essential for:
- Health checks and liveness probes
- Performance monitoring
- Troubleshooting issues
- Capacity planning
- Integration with monitoring systems

## Available Endpoints

### [Varz](./varz)
General server information including:
- Server version and configuration
- Current connections and subscriptions
- Message rates and data throughput
- Memory and CPU usage
- Cluster membership information

### [Connz](./connz)
Detailed connection information for all clients connected to the server:
- Client connection details
- Connection state and statistics
- IP addresses and ports
- Subscription counts per connection

### [Subsz](./subsz)
Subscription routing details:
- Active subscriptions
- Queue group information
- Subscription statistics
- Filtering and pagination options

### [Routez](./routez)
Cluster route information:
- Route connections between cluster nodes
- Route statistics and health
- Cluster topology information

### [Gatewayz](./gatewayz)
Gateway connections for superclusters:
- Gateway connection status
- Remote gateway information
- Traffic statistics between gateways

### [Leafz](./leafz)
Leafnode connections:
- Leafnode server connections
- Remote leafnode details
- Connection statistics

### [Accountz](./accountz)
Account information:
- Account configuration and limits
- Connection and subscription counts per account
- Import/export configurations

### [Accstatz](./accstatz)
Account statistics:
- Detailed account usage statistics
- Message and byte counts
- Connection metrics per account

### [JSz](./jsz)
JetStream information:
- Stream and consumer details
- JetStream cluster status
- Memory and storage usage

### [Healthz](./healthz)
Health check endpoint:
- Server health status
- Suitable for liveness/readiness probes
- Simple OK/Error responses

### [Statsz](./statsz)
Server statistics summary:
- Aggregated server metrics
- Performance statistics
- System resource usage

### [IPQueuesz](./ipqueuesz)
IP queue information:
- Client IP-based queue statistics
- Connection queuing metrics

### [Idz](./idz)
Server identification:
- Server identity information
- Unique server identifiers

### [Profilez](./profilez)
Server profiling data:
- CPU and memory profiling endpoints
- Performance debugging information

### [Raftz](./raftz)
Raft consensus information:
- JetStream Raft cluster details
- Leader election status
- Raft log information

## Access Configuration

Monitoring endpoints are configured in the server configuration file:

```
http_port: 8222
```

Endpoints are then accessible at:
```
http://localhost:8222/varz
```

## Security Considerations

- Use authentication to protect monitoring endpoints
- Consider TLS for encrypted monitoring traffic
- Limit access to monitoring endpoints via firewall rules
- Be aware that some endpoints may expose sensitive information

## Integration

Monitoring endpoints integrate well with:
- Prometheus for metrics collection
- Grafana for visualization
- Kubernetes liveness/readiness probes
- Custom monitoring solutions
- Alert managers