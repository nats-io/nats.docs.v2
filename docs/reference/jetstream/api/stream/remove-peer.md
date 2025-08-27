# Remove Peer

Removes a peer from a stream cluster.

## Subject

`$JS.API.STREAM.PEER.REMOVE.{stream}`

Where `{stream}` is the name of the stream.

import JSONSchema from '@site/src/components/JSONSchema';
import streamRemovePeerRequest from '@site/jsm.go/schemas/jetstream/api/v1/stream_remove_peer_request.json';
import streamRemovePeerResponse from '@site/jsm.go/schemas/jetstream/api/v1/stream_remove_peer_response.json';

## Request

<JSONSchema schema={streamRemovePeerRequest} />

## Response

<JSONSchema schema={streamRemovePeerResponse} />