# jetstream

<Reloadable state="reloadable" note="Enabling or disabling JetStream reloads. Changing `store_dir`, `domain`, `unique_tag` or the encryption settings while JetStream is enabled fails the reload." />

## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `boolean` | - | `true`, `false` |
| `string` | Indicates the capability is enabled or disabled. | `enabled`, `enable`, `disabled`, `disable` |
| `object` | An object with a set of explicit properties that can be set. | - |
## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`enabled`](./enabled.md) | If true, enables the JetStream subsystem. | `boolean` | `true` | Yes\* |
| [`store_dir`](./store_dir.md) | Directory to use for file-based storage. | `string` | `/tmp/nats/jetstream` | Yes\* |
| [`max_memory_store`](./max_memory_store.md) | Maximum size of the *memory* storage. Defaults to 75% of available memory. | `storage` | - | No\* |
| [`max_file_store`](./max_file_store.md) | Maximum size of the *file* storage. Defaults to up to 1TB if available. | `storage` | - | No\* |
| [`domain`](./domain.md) | The JetStream domain the server is part of. | `string` | - | No |
| [`encryption_key`](./encryption_key.md) | If defined, enables JetStream filestore encryption using the value as the encryption key. A key length of at least 32 bytes is recommended. Note, this key is HMAC-256 hashed on startup which reduces the byte length to 64. | `string` | - | No |
| [`cipher`](./cipher.md) | Defines the encryption algorithm to use if an encryption key is defined. | `string` | - | No |
| [`extension_hint`](./extension_hint.md) |  | `string` | - | No |
| [`prev_encryption_key`](./prev_encryption_key.md) | Previous encryption key, kept so existing filestore data can be read and re-encrypted after `encryption_key` changes. | `string` | - | No |
| [`strict`](./strict.md) | Reject API requests containing unknown fields instead of ignoring them. | `boolean` | `true` | No |
| [`max_buffered_msgs`](./max_buffered_msgs.md) | Messages the server buffers for a stream whose storage is temporarily unavailable, before it starts discarding. | `integer` | `10000` | No |
| [`max_buffered_size`](./max_buffered_size.md) | Byte ceiling for that same buffer. | `storage` | `128MB` | No |
| [`request_queue_limit`](./request_queue_limit.md) | Queued JetStream API requests allowed before new ones are rejected. | `integer` | `10000` | No |
| [`tpm`](./tpm/index.md) | Seal the filestore encryption key in the machine's TPM, so it cannot be read off disk. | `object` | - | No |
| [`limits`](./limits/index.md) | Default cross-account JetStream limits. | `object` | - | No |
| [`unique_tag`](./unique_tag.md) | Defines a tag prefix as a constraint for placement of assets across a JetStream domain. For example, if the value is `az:` then replicas of an assets will be required to be placed on servers having different `az:` tags. | `string` | - | No |
| [`max_outstanding_catchup`](./max_outstanding_catchup.md) | Max in-flight bytes for stream catch-up. This was introduced to control how much bandwidth should be dedicated during catch-up to guard against saturating and degrading performance of the network. | `storage` | `32M` | No |
| [`sync_interval`](./sync_interval.md) | Defines the internal to force sync file-based stream and consumer data to disk. The filestore relies on the operating system's filesystem buffers to periodically sync to disk. However, the server will still periodically force sync files based on this interval.  For use cases where unclean shutdowns are common, this can provide more control over how frequently to force sync data when written.  If a value `always` is used, a explicit sync will occur on every write. Do note that this will degrade the max throughput due to the additional I/O calls. | `(multiple)` | `2m` | No |

\* See the property page for reload caveats.
