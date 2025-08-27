# Stream Quorum Lost

Stream lost quorum.

## Subscription Subject

`$JS.EVENT.ADVISORY.STREAM.QUORUM_LOST.{stream}`

Where `{stream}` is the stream name.

import JSONSchema from '@site/src/components/JSONSchema';
import streamQuorumLost from '@site/jsm.go/schemas/jetstream/advisory/v1/stream_quorum_lost.json';

## Event Schema

<JSONSchema schema={streamQuorumLost} />

