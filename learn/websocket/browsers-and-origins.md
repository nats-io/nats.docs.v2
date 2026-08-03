---
id: browsers-and-origins
title: "Browsers and origins"
sidebar_position: 3
description: Restrict which web pages may connect, and give a browser credentials when it has no credentials file
---

# Browsers and origins

The dashboard from the previous page works, but the listener it connects to
will accept a connection from any web page on any site — including one
you didn't write. It also has no way to tell who the connecting user is,
because a browser has no credentials file to present.

Those are the two things a browser changes: which pages may open a
connection, and how a connection proves its identity. Everything else
about the connection is unchanged.

## Restrict which pages may connect

A browser attaches an `Origin` header to the WebSocket handshake, naming
the site the page was served from. The server can require that header to
match.

In production Acme serves the dashboard from `https://ops.acme.example`
and lists that. You can watch the mechanism work on your own machine
without any DNS, because `localhost` counts as an origin like any other.

Point the listener at a local origin:

```conf
websocket {
  listen: 127.0.0.1:8080
  no_tls: true

  allowed_origins [
    "http://localhost:8000"
  ]
}
```

Serve `dashboard.html` from the previous page on that origin:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/dashboard.html` and it connects. Now open
the same file as `http://127.0.0.1:8000/dashboard.html`. Same file, same
machine, same port — and the connection is refused, because
`127.0.0.1` isn't the string `localhost`.

That's the rule in one experiment: the match is exact on scheme, host
and port, and it's a string comparison, not a name resolution. Against
`allowed_origins ["http://localhost:8000"]` the server answers:

| `Origin` the browser sends | Handshake |
|---|---|
| `http://localhost:8000` | `101 Switching Protocols` |
| `http://127.0.0.1:8000` | `403 Forbidden` |
| `https://localhost:8000` | `403 Forbidden` |
| `http://localhost:8001` | `403 Forbidden` |
| `http://localhost` | `403 Forbidden` |

`allowed_origins` can also be written `origins`, `origin`,
`allowed_origin`, `allow_origins` or `allow_origin`; they're aliases for
the same option.

The last row is the one that catches people. A URL with no port means
port 80 for `http://` and 443 for `https://`, so `https://ops.acme.example`
and `https://ops.acme.example:8443` are different origins. Serving the
same dashboard over both means listing both.

`same_origin: true` is the other form of the check: instead of a list,
it requires the `Origin` header to match the host the request arrived
on. It suits a setup where the page and the NATS endpoint are served
from one hostname, and gets in the way as soon as they aren't.

Set both and a request has to pass both checks. Leave both unset — the
default — and any origin is accepted.

### The check is skipped when there's no Origin header

Leave the config exactly as above and connect with the CLI:

```bash
nats -s ws://127.0.0.1:8080 sub "orders.>"
```

It connects. `http://localhost:8000` is the only origin allowed, and the
CLI is not that origin — but it sends no `Origin` header at all, and the
server only runs the check when the header is present.

That is not a bug, and it isn't something you can configure away. The
`Origin` header is set by the browser, not by the person using it, which
is exactly what makes it useful: a page on `evil.example` cannot lie
about being `https://ops.acme.example`. Anything that isn't a browser
sets its own headers, so an attacker writing a client simply omits it.

So `allowed_origins` answers one question: *may this web page open a
connection using a visitor's browser?* It does not answer *may this
connection reach my subjects?* — permissions do that, and they apply to
browser and non-browser connections alike. Configure both. A dashboard
user restricted to `subscribe: orders.>` is safe whether the request
carried an `Origin` header or not.

## Give the browser credentials

A browser has no filesystem. The credentials file that a service uses
isn't available, and putting an account seed in front-end code hands it
to anyone who opens the developer tools. Two approaches work.

### A bearer JWT in the connection

In operator mode, the browser presents a JWT it was issued, and the user
is marked as a bearer user so no nonce signature is required. The page
never holds a signing key — only a token that expires.

Issuing those tokens is the job of whatever already authenticates your
users. The [decentralized auth](/learn/security/decentralized-auth) page
covers the user and account setup.

### Credentials in a cookie

The other approach keeps the token out of JavaScript entirely. The HTTP
server that authenticated the user sets a cookie with `HttpOnly`, so
scripts on the page can't read it, and the browser attaches it to the
WebSocket handshake. The NATS server reads the cookie and uses it as the
credential:

```conf
websocket {
  # Behind the TLS-terminating ingress from the next page: the browser
  # reaches wss://nats.acme.example, the ingress speaks ws:// to here.
  listen: 0.0.0.0:8080
  no_tls: true

  jwt_cookie: "acme_nats_jwt"

  allowed_origins [
    "https://ops.acme.example"
  ]
}
```

`jwt_cookie` only works in operator mode. The server needs something to
validate the JWT against, so it refuses to start when the cookie is set
and no trusted operator or key is configured:

```
trusted operators or trusted keys configuration is required for JWT
authentication via cookie "acme_nats_jwt"
```

Four cookie names can be configured, matching the four things a client
can present:

| Setting | Cookie holds |
|---|---|
| [`jwt_cookie`](/reference/config/websocket/jwt_cookie/) | a NATS user JWT |
| [`user_cookie`](/reference/config/websocket/user_cookie/) | the user name |
| [`pass_cookie`](/reference/config/websocket/pass_cookie/) | the password |
| [`token_cookie`](/reference/config/websocket/token_cookie/) | the auth token |

`jwt_cookie` has always been available. The other three arrived in
`nats-server` 2.11, so check the version you run before relying on them.

Each one is only consulted when the client didn't supply that field
itself. A JWT in the `CONNECT` protocol wins over `jwt_cookie`; a user
name in `CONNECT` wins over `user_cookie`.

This is the pattern to reach for when your web application already has a
login. The session cookie your login sets is a credential the browser
transmits automatically and JavaScript can't exfiltrate.

For a dashboard that's genuinely public and read-only, `no_auth_user`
names a user that unauthenticated WebSocket connections bind to. Give it
subscribe permission on exactly the subjects the page shows and nothing
else. It doesn't work in operator mode.

## Restrict a user to WebSocket

A credential that reaches the dashboard shouldn't also work from a shell
on port 4222. `allowed_connection_types` binds a user to the transports
it may use:

```conf
authorization {
  users [
    { user: dashboard, password: s3cr3t, allowed_connection_types: ["WEBSOCKET"] }
  ]
}
```

The full value set, and the `_WS` variants for the other protocols, are
covered in [MQTT → Auth and
clustering](/learn/mqtt/auth-and-clustering#restrict-a-user-to-mqtt).
For a leaf node that dials in over WebSocket the value is `LEAFNODE_WS`,
which the [last page](/learn/websocket/leaf-nodes-over-websocket) uses.

## Compression

`compress: true` offers the `permessage-deflate` WebSocket extension.
It's negotiated per connection: a client that doesn't ask for it gets an
uncompressed connection, and the setting costs nothing on those.

`compress` can also be written `compression`; they're the same option.

Where it's enabled, it trades CPU on both ends for bytes on the wire.
Which way that comes out depends on how compressible your payloads are
and how constrained the link is, so it's a measurement rather than a
default — compare CPU and throughput on your own traffic before turning
it on broadly.

## Pitfalls

**Treating `allowed_origins` as access control.** It's evaluated only
when an `Origin` header is present, so it constrains browsers and
nothing else. A client that connects directly never sees the check.
Permissions still do the real work.

**Setting `same_origin: true` when the page and the endpoint differ.**
It requires the `Origin` header to match the host the request arrived on,
so it fails as soon as the dashboard and the NATS endpoint sit on
different hostnames — which is the normal case behind an ingress.

**Serving the page from a host you didn't list.** Scheme, host and port
all have to match as strings — `localhost` and `127.0.0.1` are different
origins even on one machine. Moving the dashboard to a different
hostname, or adding a port, breaks the handshake for every user with a
`403` until the list is updated.

**Putting a seed or credentials file in front-end code.** Anything the
page can read, a visitor can read. Use a bearer JWT or a cookie the page
can't see.

**Giving the dashboard user publish permission.** A page that only
displays orders needs subscribe on `orders.>`. Publish rights on a
credential that ships to browsers is a much larger surface than the
feature needs.

## Where you are

The dashboard is now a controlled client:

- only pages from `https://ops.acme.example` may open a connection
- the browser presents a JWT from an `HttpOnly` cookie rather than
  holding a key
- its user is restricted to `WEBSOCKET` connections
- you know the origin check constrains browsers and not the port

## What's next

Everything so far has run with `no_tls: true` on localhost, which means
the cookie holding a user's JWT crosses the network in the clear. [TLS
and proxies](/learn/websocket/tls-and-proxies) fixes that, both with a
certificate on the listener and with TLS terminated at the ingress that
already fronts Acme's web estate.

## See also

- [Reference → websocket](/reference/config/websocket/) — `allowed_origins`,
  `same_origin`, the cookie settings, and `compress`
- [Security → Authorization](/learn/security/authorization) — the
  permission model behind a restricted dashboard user
- [Security → Decentralized auth](/learn/security/decentralized-auth) —
  bearer users and issuing JWTs
