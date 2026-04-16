# Remove Peer

Removes a peer from a stream cluster.

import JSONSchema from '@site/src/components/JSONSchema';
import streamRemovePeerRequest from '@site/src/schemas/vendor/v2.11/jsm/jetstream/api/v1/stream_remove_peer_request.json';
import streamRemovePeerResponse from '@site/src/schemas/vendor/v2.11/jsm/jetstream/api/v1/stream_remove_peer_response.json';

## Subject

`$JS.API.STREAM.PEER.REMOVE.{stream}`

Where `{stream}` is the name of the stream.

## Request

<JSONSchema schema={streamRemovePeerRequest} />

## Response

<JSONSchema schema={streamRemovePeerResponse} />
