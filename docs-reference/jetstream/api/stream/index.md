# Stream

| Name                  | Subject                                       | System Account |
| --------------------- | --------------------------------------------- | -------------- |
| [Create stream](./create) | `$JS.API.STREAM.CREATE.{stream}`             | No             |
| [Update stream](./update) | `$JS.API.STREAM.UPDATE.{stream}`             | No             |
| [Delete stream](./delete) | `$JS.API.STREAM.DELETE.{stream}`             | No             |
| [Get stream info](./info) | `$JS.API.STREAM.INFO.{stream}`               | No             |
| [List streams](./list) | `$JS.API.STREAM.LIST`                        | No             |
| [Stream names](./names) | `$JS.API.STREAM.NAMES`                       | No             |
| [Get message](./msg-get) | `$JS.API.STREAM.MSG.GET.{stream}`            | No             |
| [Delete message](./msg-delete) | `$JS.API.STREAM.MSG.DELETE.{stream}`         | No             |
| [Purge stream](./purge) | `$JS.API.STREAM.PURGE.{stream}`              | No             |
| [Leader stepdown](./leader-stepdown) | `$JS.API.STREAM.LEADER.STEPDOWN.{stream}`    | No             |
| [Remove peer](./remove-peer) | `$JS.API.STREAM.PEER.REMOVE.{stream}`        | No             |
| [Evacuate peer](./evacuate-peer) | `$JS.API.STREAM.PEER.EVACUATE.{stream}`      | No             |
| [Cancel move](./cancel-move) | `$JS.API.STREAM.CANCEL_MOVE.{stream}`        | No             |
| [Cancel move (other account)](./cancel-move) | `$JS.API.ACCOUNT.STREAM.CANCEL_MOVE.{account}.{stream}` | Yes            |
| [Restore stream](./restore) | `$JS.API.STREAM.RESTORE.{stream}`            | No             |
| [Snapshot stream](./snapshot) | `$JS.API.STREAM.SNAPSHOT.{stream}`           | No             |