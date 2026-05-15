# Server Metrics

Server metric messages provide telemetry data from the NATS server for monitoring and performance analysis.

## Overview

Server metrics are published as events that can be subscribed to for real-time monitoring. These metrics help track:
- Service response times
- Request processing latency
- System performance indicators
- Resource utilization

## Available Metrics

### [Service Latency](./service-latency)
Measures the time taken to process service requests:
- Request/response round-trip times
- Processing latency distribution
- Performance bottleneck identification

## Subscribing to Metrics

Metrics are published to specific subjects that follow the pattern:
- `$SYS.SERVER.METRIC.>` - All server metrics
- `$SYS.SERVER.METRIC.SERVICE.LATENCY` - Service latency metrics

## Best Practices

- Use sampling to reduce metric overhead
- Store metrics in time-series databases
- Set up alerts for latency thresholds
- Correlate metrics with system events