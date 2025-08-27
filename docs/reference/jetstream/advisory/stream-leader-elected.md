# Stream Leader Elected

New stream leader elected.

## Subscription Subject

`$JS.EVENT.ADVISORY.STREAM.LEADER_ELECTED.{stream}`

Where `{stream}` is the stream name.

import JSONSchema from '@site/src/components/JSONSchema';
import streamLeaderElected from '@site/jsm.go/schemas/jetstream/advisory/v1/stream_leader_elected.json';

## Event Schema

<JSONSchema schema={streamLeaderElected} />

