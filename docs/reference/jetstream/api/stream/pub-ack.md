# Publish Acknowledgement

Publishes a message directly to a stream and receives an acknowledgement.

## Subject

Messages are published directly to the stream's subjects (as configured in the stream).
The acknowledgement is returned as a response to the publish operation.

import JSONSchema from '@site/src/components/JSONSchema';
import pubAckResponse from '@site/jsm.go/schemas/jetstream/api/v1/pub_ack_response.json';

## Schema

<JSONSchema schema={pubAckResponse} />

