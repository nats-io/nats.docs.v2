# ttl

<Reloadable state="reloadable" note="Handled only as part of the whole `resolver` block; replacement resolver is never Start()ed." />
If `cache` mode, defines how long an account JWT will be cached
for before being considered for auto-eviction.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `duration` | Duration as a string with units such as 100ms, 10s, 5m, or 2h. | - |
