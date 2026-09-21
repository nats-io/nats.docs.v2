# Evacuate Peer

Moves a single consumer off one peer. The consumer keeps its replica count and the server picks the replacement peer. If no peer qualifies, the request fails with a peer remap error rather than leaving the group under-replicated.

import JSONSchema from '@site/src/components/JSONSchema';
import consumerEvacuatePeerRequest from '@site/src/schemas/vendor/v2.15/jsm/jetstream/api/v1/consumer_evacuate_peer_request.json';
import consumerEvacuatePeerResponse from '@site/src/schemas/vendor/v2.15/jsm/jetstream/api/v1/consumer_evacuate_peer_response.json';

## Subject

`$JS.API.CONSUMER.PEER.EVACUATE.{stream}.{consumer}`

Where `{stream}` is the stream name and `{consumer}` is the consumer name.

## Request

<JSONSchema schema={consumerEvacuatePeerRequest} />

## Response

<JSONSchema schema={consumerEvacuatePeerResponse} />
