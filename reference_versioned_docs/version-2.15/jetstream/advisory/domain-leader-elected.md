# Domain Leader Elected

New domain leader elected.

import JSONSchema from '@site/src/components/JSONSchema';
import domainLeaderElected from '@site/src/schemas/vendor/v2.15/jsm/jetstream/advisory/v1/domain_leader_elected.json';

## Subscription Subject

`$JS.EVENT.ADVISORY.DOMAIN.LEADER_ELECTED`

The subject has no domain token. The domain name is in the `domain` field of the event.

## Event Schema

<JSONSchema schema={domainLeaderElected} />
