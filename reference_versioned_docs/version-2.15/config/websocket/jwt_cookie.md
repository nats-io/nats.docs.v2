# jwt_cookie

<Reloadable state="not-reloadable" />
Name of the HTTP cookie, that, if present, will be used as a client JWT.
The cookie should be set by the HTTP server as described [here][cookie].
This setting is useful when generating NATS `Bearer` client JWTs as the
result of some authentication mechanism. The HTTP server after correct
authentication can issue a JWT for the user, that is set securely
preventing access by unintended scripts. Note these JWTs must be
[NATS JWTs][jwt].

**Note:** If the client specifies a JWT in the `CONNECT` protocol,
this option is ignored.

[cookie]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#restrict_access_to_cookies
[jwt]: https://docs.nats.io/nats-server/configuration/securing_nats/jwt


## Types

| Type | Description | Choices |
| :--- | :---------- | :------ |
| `string` | - | - |
