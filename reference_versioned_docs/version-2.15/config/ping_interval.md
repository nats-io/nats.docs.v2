# ping_interval

<Reloadable state="reloadable" />
Interval at which pings are sent to clients, leaf nodes and routes.
In the presence of client traffic, such as messages or client side
pings, the server will not send pings. Therefore it is recommended
to keep this value greater than the interval used by clients.


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `string` | - | - |
