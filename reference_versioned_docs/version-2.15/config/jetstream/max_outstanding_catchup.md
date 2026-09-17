# max_outstanding_catchup

<Reloadable state="not-reloadable" />
Max in-flight bytes for stream catch-up. This was introduced to
control how much bandwidth should be dedicated during catch-up to
guard against saturating and degrading performance of the network.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `storage` | Size in bytes or string with a metric unit such as 100K, 50M, 3G, or 1T. | - |
