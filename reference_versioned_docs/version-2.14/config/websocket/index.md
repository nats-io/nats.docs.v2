# websocket

<Aliases aliases="ws" />
<Reloadable state="reloadable" note="Only the TLS certificate material reloads, and only for connections accepted afterwards. Every other `websocket` setting fails the reload, including `verify_and_map` and `pinned_certs`." />
Configuration for enabling the WebSocket interface.


## Properties

| Name | Description | Type | Default | Reloadable |
| :--- | :---------- | :--- | :------ | :--------- |
| [`host`](./host.md) |  | `string` | `0.0.0.0` | No |
| [`port`](./port.md) | Port to accept WebSocket client connections on. There is no default: the listener is only started once a port is set, here or via `listen`.  TLS is required unless `no_tls` is `true`. | `integer` | - | No |
| [`listen`](./listen.md) |  | `string` | - | No |
| [`advertise`](./advertise.md) | Advertised client `<host>:<port>`. Useful for cluster setups behind a NAT. | `string` | - | No |
| [`tls`](./tls/index.md) |  | `object` | - | Yes\* |
| [`no_tls`](./no_tls.md) |  | `boolean` | - | No |
| [`same_origin`](./same_origin.md) | This option is relevant for clients used within a Web Browser, such as [nats.js][nats.js].  When set to `true`, the HTTP `Origin` header must match the request’s hostname. Refer to [cross-origin resource sharing][cors] documentation for more details.  The check only applies when the request carries an `Origin` header, which browsers send and non-browser clients generally do not.  [nats.js]: https://github.com/nats-io/nats.js [cors]: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS | `boolean` | `false` | No |
| [`allowed_origins`](./allowed_origins.md) | The list of accepted origins. When empty, and `same_origin` is `false`, clients from any origin are allowed to connect.  This list specifies the only accepted values for the client's request `Origin` header. The scheme, host, and port must match. By convention, the absence of TCP port in the URL will be port 80 for an "http://" scheme, and 443 for "https://". | `string` | - | No |
| [`handshake_timeout`](./handshake_timeout.md) | This is the total time allowed for the server to read the client request and write the response back to the client. This includes the time needed for the TLS handshake. | `duration` | - | No |
| [`compress`](./compress.md) | This enables support for compressed websocket frames in the server. For compression to be used, both server and client have to support it. | `boolean` | - | No |
| [`authorization`](./authorization/index.md) |  | `object` | - | No |
| [`headers`](./headers.md) | Extra HTTP headers returned on the WebSocket upgrade response. | `string` | - | No |
| [`ping_interval`](./ping_interval.md) | How often the server sends a WebSocket ping. Set `0` to disable. | `duration` | `2m` | No |
| [`user_cookie`](./user_cookie.md) | Name of the HTTP cookie holding the user name, for clients that authenticate through a browser session. | `string` | - | No |
| [`pass_cookie`](./pass_cookie.md) | Name of the HTTP cookie holding the password. | `string` | - | No |
| [`token_cookie`](./token_cookie.md) | Name of the HTTP cookie holding the auth token. | `string` | - | No |
| [`jwt_cookie`](./jwt_cookie.md) | Name of the HTTP cookie, that, if present, will be used as a client JWT. The cookie should be set by the HTTP server as described [here][cookie]. This setting is useful when generating NATS `Bearer` client JWTs as the result of some authentication mechanism. The HTTP server after correct authentication can issue a JWT for the user, that is set securely preventing access by unintended scripts. Note these JWTs must be [NATS JWTs][jwt].  **Note:** If the client specifies a JWT in the `CONNECT` protocol, this option is ignored.  [cookie]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#restrict_access_to_cookies [jwt]: https://docs.nats.io/nats-server/configuration/securing_nats/jwt | `string` | - | No |
| [`no_auth_user`](./no_auth_user.md) | If no user name is provided when a WebSocket client connects, will default this user name in the authentication phase. If specified, this will override, for WebSocket clients, any `no_auth_user` value defined in the main configuration file.  A leaf node connecting over WebSocket also picks this value up in preference to the top-level `no_auth_user`.  *Note: that this is not compatible with running the server in operator mode.* | `string` | - | No |

\* See the property page for reload caveats.
