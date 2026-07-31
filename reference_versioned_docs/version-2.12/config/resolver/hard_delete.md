# hard_delete

<Reloadable state="reloadable" note="Handled only as part of the whole `resolver` block; replacement resolver is never Start()ed." />
If true, and the resolver is in `full` mode, deleted account JWTs will
be removed from disk rather than having the `.delete` suffix appended.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `boolean` | - | `true`, `false` |
