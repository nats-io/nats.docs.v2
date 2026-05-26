# jetstream


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `boolean` | - | `true`, `false` |
| `string` | Indicates the capability is enabled or disabled. | `enabled`, `enable`, `disabled`, `disable` |
| `object` | An object with a set of explicit properties that can be set. | - |
## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`enabled`](/reference/2.12/config/jetstream/enabled) | If true, enables the JetStream subsystem. | `boolean` | `true` | Yes |
| [`store_dir`](/reference/2.12/config/jetstream/store_dir) | Directory to use for file-based storage. | `string` | `/tmp/nats/jetstream` | Yes |
| [`max_memory_store`](/reference/2.12/config/jetstream/max_memory_store) | Maximum size of the *memory* storage. Defaults to 75% of available memory. | `storage` | - | Yes |
| [`max_file_store`](/reference/2.12/config/jetstream/max_file_store) | Maximum size of the *file* storage. Defaults to up to 1TB if available. | `storage` | - | Yes |
| [`domain`](/reference/2.12/config/jetstream/domain) | The JetStream domain the server is part of. | `string` | - | Yes |
| [`encryption_key`](/reference/2.12/config/jetstream/encryption_key) | If defined, enables JetStream filestore encryption using the value as the encryption key. A key length of at least 32 bytes is recommended. Note, this key is HMAC-256 hashed on startup which reduces the byte length to 64. | `string` | - | Yes |
| [`cipher`](/reference/2.12/config/jetstream/cipher) | Defines the encryption algorithm to use if an encryption key is defined. | `string` | - | Yes |
| [`extension_hint`](/reference/2.12/config/jetstream/extension_hint) |  | `string` | - | Yes |
| [`limits`](/reference/2.12/config/jetstream/limits) | Default cross-account JetStream limits. | `object` | - | Yes |
| [`unique_tag`](/reference/2.12/config/jetstream/unique_tag) | Defines a tag prefix as a constraint for placement of assets across a JetStream domain. For example, if the value is `az:` then replicas of an assets will be required to be placed on servers having different `az:` tags. | `string` | - | Yes |
| [`max_outstanding_catchup`](/reference/2.12/config/jetstream/max_outstanding_catchup) | Max in-flight bytes for stream catch-up. This was introduced to control how much bandwidth should be dedicated during catch-up to guard against saturating and degrading performance of the network. | `storage` | `32M` | Yes |
| [`sync_interval`](/reference/2.12/config/jetstream/sync_interval) | Defines the internal to force sync file-based stream and consumer data to disk. The filestore relies on the operating system's filesystem buffers to periodically sync to disk. However, the server will still periodically force sync files based on this interval.  For use cases where unclean shutdowns are common, this can provide more control over how frequently to force sync data when written.  If a value `always` is used, a explicit sync will occur on every write. Do note that this will degrade the max throughput due to the additional I/O calls. | `(multiple)` | `2m` | Yes |
