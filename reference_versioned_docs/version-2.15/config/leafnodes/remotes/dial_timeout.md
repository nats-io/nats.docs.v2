# dial_timeout

<Since version="2.15" />
<Reloadable state="not-reloadable" />
How long to wait for the TCP connection to this remote to be
established. Overrides the server-wide `leafnodes.dial_timeout`
for this remote only. If not set, the server-wide value applies,
which itself defaults to `1s`.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `duration` | Duration as a string with units such as 100ms, 10s, 5m, or 2h. | - |
