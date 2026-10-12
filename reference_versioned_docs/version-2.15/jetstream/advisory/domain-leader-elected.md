# Domain Leader Elected

New domain leader elected.

import JSONSchema from '@site/src/components/JSONSchema';
import domainLeaderElected from '@site/src/schemas/vendor/v2.15/jsm/jetstream/advisory/v1/domain_leader_elected.json';

## Subscription Subject

`$JS.EVENT.ADVISORY.DOMAIN.LEADER_ELECTED`

The subject has no domain token. When configured, the domain name appears in the `domain` field of the event; otherwise, the field is omitted.

## Event Schema

<JSONSchema schema={domainLeaderElected} />
