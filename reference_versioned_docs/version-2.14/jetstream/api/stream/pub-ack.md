# Publish Acknowledgement

Publishes a message directly to a stream and receives an acknowledgement.

import JSONSchema from '@site/src/components/JSONSchema';
import pubAckResponse from '@site/src/schemas/vendor/v2.14/jsm/jetstream/api/v1/pub_ack_response.json';

## Subject


Messages are published directly to the stream's subjects (as configured in the stream).
The acknowledgement is returned as a response to the publish operation.

## Schema

<JSONSchema schema={pubAckResponse} />
