# write_deadline

<Reloadable state="reloadable" note="The reload is accepted and logged, but existing connections keep the deadline they were created with. Only connections established after the reload use the new value." />
Maximum number of seconds the server will block when writing. Once
this threshold is exceeded the connection will be closed. See slow
consumer on how to deal with this on the client.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `duration` | Duration as a string with units such as 100ms, 10s, 5m, or 2h. | - |
