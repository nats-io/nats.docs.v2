# mappings

<Aliases aliases="maps" />
<Reloadable state="reloadable" note="Replaced wholesale on the live account; adding, changing and removing mappings all take effect for existing connections. For the global account, leafnode subject-interest maps are fixed up in the same reload." />

## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `string` | - | - |
| `object` | An object with a set of explicit properties that can be set. | - |
## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`destination`](./destination.md) | The subject mapping destination for the source subject. | `string` | - | Yes |
| [`weight`](./weight.md) | A number between 0 and 100 (inclusive). The string form allows for a trailing `%` sign. Note, if the `cluster` field is used, weights across the destinations must add up to 100% on a per-cluster basis unless artifical message loss is desired for testing. | `(multiple)` | - | Yes |
| [`cluster`](./cluster.md) | If specified, the destination is cluster-scoped. Messages received by servers within the named cluster will only consider mappings with the same cluster name. Otherwise, it will fallback to non-cluster scoped mappings. | `string` | - | Yes |
