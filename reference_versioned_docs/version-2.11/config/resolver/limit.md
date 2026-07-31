# limit

<Reloadable state="reloadable" note="Handled only as part of the whole `resolver` block; replacement resolver is never Start()ed." />
If set, limit the number of stored JWTs. In `full` mode, new JWTs
will be rejected where as in `cache` mode, old JWTs will be evicted
for new JWTs.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `integer` | - | - |
