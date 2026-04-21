# same_origin

<Reloadable /> 
This option is relevant for clients used within a Web Browser, such
as [nats.ws][nats.ws].

When set to `true`, the HTTP `Origin` header must match the request’s
hostname. Refer to [cross-origin resource sharing][cors] documentation
for more details.

[nats.ws]: https://github.com/nats-io/nats.ws
[cors]: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `boolean` | - | `true`, `false` |
