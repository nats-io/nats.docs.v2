---
id: tls-and-proxies
title: "TLS and proxies"
sidebar_position: 4
description: Put a certificate on the listener or terminate TLS at an ingress, and configure a proxy that won't break a long-lived upgraded connection
---

# TLS and proxies

The dashboard has run on `no_tls: true` so far. Acme now serves it from
`https://ops.acme.example`, behind the ingress that already fronts the
rest of its web estate, and the cookie carrying each user's JWT must not
cross the network in the clear.

There are two ways to get there. Put the certificate on the NATS
listener, or terminate TLS in front of it. Both are normal; which one
you want depends on whether NATS sits behind the same edge as your web
traffic.

## TLS on the listener

The listener requires TLS by default. Give it a certificate and the
`no_tls` flag goes away.

The certificate is an ordinary server certificate — the `websocket {}`
block takes the same `tls {}` fields as every other listener. If you
need to create one, [Security →
Encryption](/learn/security/encryption#server-side-tls) walks through
generating a CA and a server certificate with `openssl` and covers what
each field does. This page assumes you have `cert_file` and `key_file`
already.

```conf
websocket {
  listen: 0.0.0.0:443

  tls {
    cert_file: "/etc/nats/certs/nats.acme.example.pem"
    key_file:  "/etc/nats/certs/nats.acme.example-key.pem"
  }

  allowed_origins [
    "https://ops.acme.example"
  ]
}
```

Clients now use `wss://`:

```bash
nats -s wss://nats.acme.example:443 sub "orders.>"
```

The startup warning about running without TLS is gone, and the log line
names the scheme it's actually serving:

```
[INF] Listening for websocket clients on wss://0.0.0.0:443
```

Certificate material is the only part of the `websocket {}` block that
reloads. Changing `cert_file` or `key_file` and sending the server a
reload picks up the new certificate for connections made afterwards;
existing connections keep the one they negotiated. Any other change in
the block — `verify_and_map`, `pinned_certs`, `allowed_origins`, the
timeouts — is rejected, and a rejected field aborts the entire reload,
including changes in the same edit that would have been accepted.

## TLS terminated in front

The more common shape when NATS lives behind an existing edge is to let
the ingress or load balancer hold the certificate and run the NATS
listener plaintext on an internal network.

```conf
websocket {
  listen: 0.0.0.0:8080
  no_tls: true
  advertise: "nats.acme.example:443"

  jwt_cookie: "acme_nats_jwt"

  allowed_origins [
    "https://ops.acme.example"
  ]
}
```

Two things matter here.

`no_tls: true` is correct only in this shape. The hop between the proxy
and the server carries unencrypted traffic, so that hop has to be a
network you trust — a private subnet, a service mesh, or the same host.

`advertise` is what the server tells clients about itself. Without it a
server behind NAT or a proxy hands out the address it sees locally,
which clients can't reach. Set it to the address the outside world uses.

`no_tls` and the client's URL scheme are separate questions. The client
connects with `wss://` because the *proxy* is presenting a certificate.
Whether the NATS listener itself uses TLS is decided by its own
configuration, not by what the client typed.

The `jwt_cookie` and `allowed_origins` settings carry over unchanged from
[Browsers and origins](/learn/websocket/browsers-and-origins) — moving
TLS to the edge doesn't change how the browser authenticates.

## What the proxy has to do

A WebSocket connection starts as an HTTP request that asks to change
protocols, and then stays open. Proxies configured for ordinary
request/response traffic break both halves of that.

The upgrade needs the `Upgrade` and `Connection` headers passed through:

```conf
location / {
    proxy_pass http://nats-backend:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade    $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host       $host;

    # A NATS connection is idle whenever there is no traffic.
    # Outlive the ping interval or the proxy will cut it.
    proxy_read_timeout  1h;
    proxy_send_timeout  1h;
}
```

A proxy that strips those headers doesn't fail loudly. The client sends
a handshake and gets an ordinary HTTP response back, so the error
surfaces as a connection that never establishes rather than anything
naming the proxy.

The timeout is the second half. A NATS connection is idle between
messages, and a proxy that closes idle connections after 60 seconds will
close a working subscription that has nothing to deliver. Set the
proxy's idle timeout longer than the interval at which the server pings
its WebSocket clients — `ping_interval` in the `websocket {}` block from
2.12, and the server-wide ping interval before that.

The rule above matches `/`, which keeps every client URL in this chapter
path-less. If you publish NATS under a prefix instead, the prefix has to
appear in the client URL too — `wss://nats.acme.example:443/nats` against
a `location /nats` rule. Leaf nodes need care here: the server appends
`/leafnode` to whatever path the remote URL carries, so a `location /nats`
rule has to match `/nats/leafnode` as well. [Leaf nodes over
WebSocket](/learn/websocket/leaf-nodes-over-websocket) covers that.

On Kubernetes the same two timeouts are ingress annotations rather than
config-file directives:

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
```

[Deployment → Kubernetes](/learn/deployment/kubernetes) covers the Helm
chart and the StatefulSet it renders.

## Timeouts on the server side

`handshake_timeout` bounds the whole setup: reading the client's
request, running the TLS handshake, and writing the response. It's a
guard against a client that opens a connection and stalls.

Behind a slow or overloaded proxy the handshake takes longer than it
does on a direct connection, and a value tuned on a laptop can start
rejecting real clients under load. If connections fail during the
handshake only when the system is busy, this is the setting to look at.

## Extra headers on the upgrade response

`headers` adds fixed HTTP headers to the upgrade response, which is how
you attach something like `Strict-Transport-Security` at the NATS
listener when there's no proxy in front to add it.

## Pitfalls

**A proxy that drops `Upgrade` and `Connection`.** The handshake fails
and the client reports a connection error, not a protocol error. If
`ws://` works against the server directly and fails through the proxy,
this is the first thing to check.

**A proxy idle timeout shorter than the ping interval.** Connections
drop on a timer with no error on either side. The pattern to look for is
disconnects at a suspiciously round interval.

**`no_tls: true` on a hop that isn't private.** It's correct behind a
terminating proxy on a trusted network and wrong the moment that traffic
crosses anything else. There's no warning distinguishing the two.

**Forgetting `advertise` behind NAT.** The server hands clients an
address it can see and they can't. Connections succeed and then fail on
a later reconnect to an advertised URL.

**Expecting `wss://` to configure the server.** The scheme in the client
URL says what the client will do. The `tls {}` block says what the
server will do. They're set independently, and a mismatch fails at the
handshake.

## Where you are

The dashboard now runs over TLS:

- either a certificate on the `websocket {}` listener, serving `wss://`
  directly
- or plaintext behind an ingress that terminates TLS, with `advertise`
  giving clients the external address
- a proxy that forwards the upgrade headers and doesn't time out an idle
  connection
- `handshake_timeout` set with the proxy's latency in mind

## What's next

Everything so far has been a client reaching NATS. The same transport
carries a server-to-server link: [Leaf nodes over
WebSocket](/learn/websocket/leaf-nodes-over-websocket) attaches Acme's
retail branch to the `east` cluster through the same endpoint.

## See also

- [Reference → websocket](/reference/config/websocket/) — `tls`,
  `no_tls`, `advertise`, `handshake_timeout`, `headers`
- [Security → Encryption](/learn/security/encryption) — TLS across every
  listener the server has
- [Deployment → Kubernetes](/learn/deployment/kubernetes) — ingress in
  front of a NATS deployment
