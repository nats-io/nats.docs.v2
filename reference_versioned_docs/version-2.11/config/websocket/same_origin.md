# same_origin

<Reloadable state="not-reloadable" />
This option is relevant for clients used within a Web Browser, such
as [nats.js][nats.js].

When set to `true`, the HTTP `Origin` header must match the request’s
hostname. Refer to [cross-origin resource sharing][cors] documentation
for more details.

The check only applies when the request carries an `Origin` header,
which browsers send and non-browser clients generally do not.

[nats.js]: https://github.com/nats-io/nats.js
[cors]: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `boolean` | - | `true`, `false` |
