# max_concurrent_io

<Since version="2.15" />
<Reloadable state="reloadable" note="Only reloadable while JetStream is being disabled in the same reload (the whole `jetstream` block removed or `enabled: false` set). Any other change while JetStream stays enabled fails the reload." />
Maximum number of disk I/O operations the server allows in flight
at once, across all streams and consumers. Must be between 4 and
8192. Lower it to reduce contention for the underlying disk on a
server with many assets; raise it on fast storage to allow more
parallel I/O.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `integer` | - | - |
