# type

<Reloadable /> 
Defines whether the resolver type. A `full` resolver stores all
account JWTs unless they are explicitly deleted.

A `cache` resolver stores only a subset based on a least-recently-used
(LRU) TTL.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `string` | - | `full`, `cache` |
