# websocket

<Aliases aliases="`ws`" />
<Reloadable /> 
Configuration for enabling the WebSocket interface.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`host`](/reference/config/websocket/host) |  | `string` | `0.0.0.0` | Yes |
| [`port`](/reference/config/websocket/port) | By default, a WebSocket-enabled server requires TLS and binds to port 443. | `integer` | `443` | Yes |
| [`listen`](/reference/config/websocket/listen) |  | `string` | - | Yes |
| [`advertise`](/reference/config/websocket/advertise) | Advertised client `<host>:<port>`. Useful for cluster setups behind a NAT. | `string` | - | Yes |
| [`tls`](/reference/config/websocket/tls) |  | `object` | - | Yes |
| [`no_tls`](/reference/config/websocket/no_tls) |  | `boolean` | - | Yes |
| [`same_origin`](/reference/config/websocket/same_origin) | This option is relevant for clients used within a Web Browser, such as [nats.ws][nats.ws].  When set to `true`, the HTTP `Origin` header must match the request’s hostname. Refer to [cross-origin resource sharing][cors] documentation for more details.  [nats.ws]: https://github.com/nats-io/nats.ws [cors]: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS | `boolean` | `false` | Yes |
| [`allowed_origins`](/reference/config/websocket/allowed_origins) | The list of accepted origins. When empty, and `same_origin` is `false`, clients from any origin are allowed to connect.  This list specifies the only accepted values for the client's request `Origin` header. The scheme, host, and port must match. By convention, the absence of TCP port in the URL will be port 80 for an "http://" scheme, and 443 for "https://". | `string` | - | Yes |
| [`handshake_timeout`](/reference/config/websocket/handshake_timeout) | This is the total time allowed for the server to read the client request and write the response back to the client. This includes the time needed for the TLS handshake. | `duration` | - | Yes |
| [`compress`](/reference/config/websocket/compress) | This enables support for compressed websocket frames in the server. For compression to be used, both server and client have to support it. | `boolean` | - | Yes |
| [`authorization`](/reference/config/websocket/authorization) |  | `object` | - | Yes |
| [`jwt_token`](/reference/config/websocket/jwt_token) | Name of the HTTP cookie, that, if present, will be used as a client JWT. The cookie should be set by the HTTP server as described [here][cookie]. This setting is useful when generating NATS `Bearer` client JWTs as the result of some authentication mechanism. The HTTP server after correct authentication can issue a JWT for the user, that is set securely preventing access by unintended scripts. Note these JWTs must be NATS JWTs.  **Note:** If the client specifies a JWT in the `CONNECT` protocol, this option is ignored.  [cookie]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#restrict_access_to_cookies | `string` | - | Yes |
| [`no_auth_user`](/reference/config/websocket/no_auth_user) | If no user name is provided when an MQTT client connects, will default this user name in the authentication phase. If specified, this will override, for MQTT clients, any `no_auth_user` value defined in the main configuration file. *Note: that this is not compatible with running the server in operator mode.* | `string` | - | Yes |
