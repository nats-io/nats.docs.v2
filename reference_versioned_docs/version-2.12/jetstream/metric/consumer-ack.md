# Consumer Acknowledgement Metric

Consumer acknowledgement metrics.

import JSONSchema from '@site/src/components/JSONSchema';
import consumerAck from '@site/src/schemas/vendor/v2.12/jsm/jetstream/metric/v1/consumer_ack.json';

## Subscription Subject

`$JS.EVENT.METRIC.CONSUMER.ACK.{stream}.{consumer}`

Where:
- `{stream}` is the stream name
- `{consumer}` is the consumer name

## Event Schema

<JSONSchema schema={consumerAck} />
