# Stream Leader Elected

New stream leader elected.

import JSONSchema from '@site/src/components/JSONSchema';
import streamLeaderElected from '@site/src/schemas/vendor/v2.14/jsm/jetstream/advisory/v1/stream_leader_elected.json';

## Subscription Subject

`$JS.EVENT.ADVISORY.STREAM.LEADER_ELECTED.{stream}`

Where `{stream}` is the stream name.

## Event Schema

<JSONSchema schema={streamLeaderElected} />
