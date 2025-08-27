# Consumer Acknowledgement Metric

Consumer acknowledgement metrics.

## Subscription Subject

`$JS.EVENT.METRIC.CONSUMER.ACK.{stream}.{consumer}`

Where:
- `{stream}` is the stream name
- `{consumer}` is the consumer name

import JSONSchema from '@site/src/components/JSONSchema';
import consumerAck from '@site/jsm.go/schemas/jetstream/metric/v1/consumer_ack.json';

## Event Schema

<JSONSchema schema={consumerAck} />
