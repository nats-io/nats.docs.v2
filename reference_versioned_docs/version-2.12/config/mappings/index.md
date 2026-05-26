# mappings

<Aliases aliases="`maps`" />
<Reloadable /> 

## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `string` | - | - |
| `object` | An object with a set of explicit properties that can be set. | - |
## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`destination`](/reference/2.12/config/mappings/destination) | The subject mapping destination for the source subject. | `string` | - | Yes |
| [`weight`](/reference/2.12/config/mappings/weight) | A number between 0 and 100 (inclusive). The string form allows for a trailing `%` sign. Note, if the `cluster` field is used, weights across the destinations must add up to 100% on a per-cluster basis unless artifical message loss is desired for testing. | `(multiple)` | - | Yes |
| [`cluster`](/reference/2.12/config/mappings/cluster) | If specified, the destination is cluster-scoped. Messages received by servers within the named cluster will only consider mappings with the same cluster name. Otherwise, it will fallback to non-cluster scoped mappings. | `string` | - | Yes |
