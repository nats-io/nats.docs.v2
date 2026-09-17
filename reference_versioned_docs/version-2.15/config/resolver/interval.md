# interval

<Reloadable state="reloadable" note="Handled only as part of the whole `resolver` block; the replacement resolver is never Start()ed so the running sync loop keeps the old interval." />
Defines the interval the resolver will randomly contact another server
to reconcile JWTs, such as receiving new ones and deleting old ones.

Applies to `full` mode only.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `duration` | Duration as a string with units such as 100ms, 10s, 5m, or 2h. | - |
