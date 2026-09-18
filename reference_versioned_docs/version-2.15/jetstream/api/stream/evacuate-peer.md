# Evacuate Peer

Moves a stream and its consumers off one peer. The stream keeps its replica count and the server picks the replacement peer. If no peer qualifies under the stream's placement, the request fails with a peer remap error rather than leaving the group under-replicated.

import JSONSchema from '@site/src/components/JSONSchema';
import streamEvacuatePeerRequest from '@site/src/schemas/vendor/v2.15/jsm/jetstream/api/v1/stream_evacuate_peer_request.json';
import streamEvacuatePeerResponse from '@site/src/schemas/vendor/v2.15/jsm/jetstream/api/v1/stream_evacuate_peer_response.json';

## Subject

`$JS.API.STREAM.PEER.EVACUATE.{stream}`

Where `{stream}` is the name of the stream.

## Request

<JSONSchema schema={streamEvacuatePeerRequest} />

## Response

<JSONSchema schema={streamEvacuatePeerResponse} />
