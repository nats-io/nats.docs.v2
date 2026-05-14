# Stream Quorum Lost

Stream lost quorum.

import JSONSchema from '@site/src/components/JSONSchema';
import streamQuorumLost from '@site/src/schemas/vendor/v2.14/jsm/jetstream/advisory/v1/stream_quorum_lost.json';

## Subscription Subject

`$JS.EVENT.ADVISORY.STREAM.QUORUM_LOST.{stream}`

Where `{stream}` is the stream name.

## Event Schema

<JSONSchema schema={streamQuorumLost} />
