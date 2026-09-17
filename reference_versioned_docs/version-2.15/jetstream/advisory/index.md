# JetStream Advisories

Advisories are system events published by JetStream servers to notify about important state changes and operational events. These events are published to specific subjects that can be subscribed to for monitoring and observability.

## Advisory Events

| Name | Subject | Description |
| ---- | ------- | ----------- |
| [API Audit](./api-audit) | `$JS.EVENT.ADVISORY.API` | Audit trail of JetStream API operations |
| [API Limit Reached](./api-limit-reached) | `$JS.EVENT.ADVISORY.API.LIMIT_REACHED.{account}` | API rate limit reached |
| [Consumer Action](./consumer-action) | `$JS.EVENT.ADVISORY.CONSUMER.CREATED.{stream}.{consumer}`<br/>`$JS.EVENT.ADVISORY.CONSUMER.DELETED.{stream}.{consumer}` | Consumer lifecycle events |
| [Consumer Group Pinned](./consumer-group-pinned) | `$JS.EVENT.ADVISORY.CONSUMER.GROUP_PINNED.{stream}.{consumer}` | Consumer group pinned to node |
| [Consumer Group Unpinned](./consumer-group-unpinned) | `$JS.EVENT.ADVISORY.CONSUMER.GROUP_UNPINNED.{stream}.{consumer}` | Consumer group unpinned from node |
| [Consumer Leader Elected](./consumer-leader-elected) | `$JS.EVENT.ADVISORY.CONSUMER.LEADER_ELECTED.{stream}.{consumer}` | New consumer leader elected |
| [Consumer Pause](./consumer-pause) | `$JS.EVENT.ADVISORY.CONSUMER.PAUSE.{stream}.{consumer}` | Consumer paused or resumed |
| [Consumer Quorum Lost](./consumer-quorum-lost) | `$JS.EVENT.ADVISORY.CONSUMER.QUORUM_LOST.{stream}.{consumer}` | Consumer lost quorum |
| [Domain Leader Elected](./domain-leader-elected) | `$JS.EVENT.ADVISORY.DOMAIN.LEADER_ELECTED.{domain}` | New domain leader elected |
| [Max Deliveries Exceeded](./max-deliver) | `$JS.EVENT.ADVISORY.CONSUMER.MAX_DELIVERIES.{stream}.{consumer}` | Message exceeded max delivery attempts |
| [Message NAK](./nak) | `$JS.EVENT.ADVISORY.CONSUMER.MSG_NAK.{stream}.{consumer}` | Message negatively acknowledged |
| [Message Terminated](./terminated) | `$JS.EVENT.ADVISORY.CONSUMER.MSG_TERMINATED.{stream}.{consumer}` | Message terminated |
| [Restore Complete](./restore-complete) | `$JS.EVENT.ADVISORY.STREAM.RESTORE_COMPLETE.{stream}` | Stream restore completed |
| [Restore Started](./restore-create) | `$JS.EVENT.ADVISORY.STREAM.RESTORE_CREATE.{stream}` | Stream restore initiated |
| [Server Out of Space](./server-out-of-space) | `$JS.EVENT.ADVISORY.SERVER.OUT_OF_STORAGE` | Server storage exhausted |
| [Server Removed](./server-removed) | `$JS.EVENT.ADVISORY.SERVER.REMOVED` | Server removed from cluster |
| [Snapshot Complete](./snapshot-complete) | `$JS.EVENT.ADVISORY.STREAM.SNAPSHOT_COMPLETE.{stream}` | Stream snapshot completed |
| [Snapshot Started](./snapshot-create) | `$JS.EVENT.ADVISORY.STREAM.SNAPSHOT_CREATE.{stream}` | Stream snapshot initiated |
| [Stream Action](./stream-action) | `$JS.EVENT.ADVISORY.STREAM.CREATED.{stream}`<br/>`$JS.EVENT.ADVISORY.STREAM.DELETED.{stream}`<br/>`$JS.EVENT.ADVISORY.STREAM.UPDATED.{stream}` | Stream lifecycle events |
| [Stream Leader Elected](./stream-leader-elected) | `$JS.EVENT.ADVISORY.STREAM.LEADER_ELECTED.{stream}` | New stream leader elected |
| [Stream Quorum Lost](./stream-quorum-lost) | `$JS.EVENT.ADVISORY.STREAM.QUORUM_LOST.{stream}` | Stream lost quorum |

## Subscribing to Advisories

To receive advisory events, subscribe to the appropriate subject pattern. You can use wildcards to subscribe to multiple advisory types:

- `$JS.EVENT.ADVISORY.>` - All advisory events
- `$JS.EVENT.ADVISORY.STREAM.>` - All stream-related advisories
- `$JS.EVENT.ADVISORY.CONSUMER.>` - All consumer-related advisories