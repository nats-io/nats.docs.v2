# dial_timeout

<Since version="2.15" />
<Reloadable state="not-reloadable" />
How long to wait for the TCP connection to a remote server to
be established. Raise it on high-latency links where the
default is too short for the handshake to complete. Applies to
every remote, unless a remote sets its own `dial_timeout`.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `duration` | Duration as a string with units such as 100ms, 10s, 5m, or 2h. | - |
