# JetStream Metrics

Metrics are operational measurements published by JetStream to provide observability into message processing performance and behavior.

## Overview

JetStream publishes metrics as system events on specific subjects. These metrics help operators:
- Monitor message processing latency
- Track consumer performance
- Identify bottlenecks
- Optimize system configuration
- Set up alerting thresholds

## Metric Events

| Name | Subject | Description |
| ---- | ------- | ----------- |
| [Consumer Acknowledgement](./consumer-ack) | `$JS.EVENT.METRIC.CONSUMER.ACK.{stream}.{consumer}` | Message acknowledgement metrics including latency |

## Usage

To subscribe to metrics, clients need appropriate permissions to access the `$JS.EVENT.METRIC.>` subject hierarchy. Metrics are published as JSON messages containing:
- Timestamp information
- Stream and consumer identifiers
- Performance measurements
- Delivery counts and redelivery information

## Configuration

Metrics can be enabled or disabled at the stream or consumer level. Some metrics may impact performance when enabled due to the additional processing required to collect and publish measurements.

## Best Practices

- Subscribe to metrics with queue groups to distribute processing load
- Use wildcard subscriptions to monitor multiple streams/consumers
- Store metrics in time-series databases for historical analysis
- Set up alerts based on latency thresholds
- Regularly review metrics to optimize configuration
