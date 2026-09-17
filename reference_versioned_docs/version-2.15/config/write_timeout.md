# write_timeout

<Since version="2.12" />
<Reloadable state="not-reloadable" />
What the server does when a connection misses its
`write_deadline`: `close` drops it, `retry` keeps trying,
`default` uses the built-in behaviour.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `string` | - | `default`, `close`, `retry` |
