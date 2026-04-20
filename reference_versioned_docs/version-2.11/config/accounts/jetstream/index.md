# jetstream

<Reloadable /> 

## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `boolean` | - | `true`, `false` |
| `string` | Indicates the capability is enabled or disabled. | `enabled`, `enable`, `disabled`, `disable` |
| `object` | An object with a set of explicit properties that can be set. | - |
## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`max_memory`](/reference/2.11/config/accounts/jetstream/max_memory) | The maximum storage allowed across all memory-based assets. | `integer` | - | Yes |
| [`max_file`](/reference/2.11/config/accounts/jetstream/max_file) | The maximum storage allowed across all file-based assets. | `integer` | - | Yes |
| [`max_streams`](/reference/2.11/config/accounts/jetstream/max_streams) | The maximum number of streams allowed. | `integer` | - | Yes |
| [`max_consumers`](/reference/2.11/config/accounts/jetstream/max_consumers) | The maximum number of consumers allowed. | `integer` | - | Yes |
| [`max_bytes_required`](/reference/2.11/config/accounts/jetstream/max_bytes_required) | If true, requires all streams to have an explicit max bytes defined for both file and memory-based streams. | `boolean` | - | Yes |
| [`memory_max_stream_bytes`](/reference/2.11/config/accounts/jetstream/memory_max_stream_bytes) | Maximum bytes any given memory-based stream is allowed to be allocated. | `integer` | - | Yes |
| [`disk_max_stream_bytes`](/reference/2.11/config/accounts/jetstream/disk_max_stream_bytes) | Maximum bytes any given file-based stream is allowed to be allocated. | `integer` | - | Yes |
| [`max_ack_pending`](/reference/2.11/config/accounts/jetstream/max_ack_pending) | The maximum ack pending count allowed to be set on any given consumer. | `integer` | - | Yes |
