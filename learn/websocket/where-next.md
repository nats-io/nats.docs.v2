---
id: where-next
title: "Where to go next"
sidebar_position: 6
description: Recap the WebSocket model and point to the chapters and Reference that take it further
---

# Where to go next

You started with a server that only accepted connections on port 4222.
You end with a browser dashboard showing `orders.>` live behind an
origin check and a cookie-borne JWT, TLS either on the listener or at
the ingress in front of it, and a retail branch joined to the `east`
cluster through that same endpoint.

This page doesn't teach anything new. It collects the model into one
place and points at what takes each piece further.

## The core idea

Three ideas carry the chapter.

**It's the same protocol over a different transport.** A WebSocket
connection is a NATS connection. The same clients, subjects, queue
groups, request-reply and JetStream work across it unchanged. The URL
scheme is the difference, and it's most of the difference.

**A browser is a different security situation, not a different NATS.**
It has no filesystem for a credentials file, and any page on the
internet can try to open a connection in a user's browser. That's what
origin checking and the cookie settings address. Neither is a
replacement for authorization, which is still what protects the port.

**One listener serves clients and servers alike.** Reaching for
WebSocket is often nothing to do with browsers — where an HTTP ingress
or load balancer is the only path into the network, the WebSocket
listener is what gets published through it. A leaf node uses that endpoint exactly as a
client does, which is how an edge site joins a cluster that isn't
otherwise exposed.

## Where the reference details live

This chapter is concept-first and unversioned. The exact fields of the
`websocket {}` block, their types, defaults, reload behaviour, and which
server version each appeared in, are in **[Reference →
websocket](/reference/config/websocket/)**, which is versioned and
exhaustive.

That's where to look for the precise semantics of `handshake_timeout`,
the full TLS sub-block, or which of the four cookie settings exist in
the version you run.

## What to read next

Two chapters continue directly from here.

**[Security](/learn/security)** is the real next step. This chapter
restricted a user to `WEBSOCKET`, handed a browser a bearer JWT through
a cookie, and stopped there. The model underneath — accounts as subject
isolation, how permissions are evaluated, and
[operator mode](/learn/security/operator-mode) end to end — is what a
dashboard exposed to real users needs.

**[Topologies](/learn/topologies)** covers leaf nodes properly: what
they are for, how subject interest propagates, and what happens when the
link drops. The last page of this chapter changed only the transport.

Two more are worth knowing about rather than reading now.
[Deployment](/learn/deployment) covers the Kubernetes ingress that
terminates TLS in front of a WebSocket listener.
[Resilient Clients](/learn/resilient-clients) covers reconnection and
drain, which behave the same over WebSocket as over TCP — a browser page
that reconnects is using the same machinery.

## Production checklist

Every content page closed with a Pitfalls section. This collects their
action items into one pass to make before a WebSocket listener carries
real traffic. Each group links back to the page that explains why.

### Your first WebSocket connection — see [Pitfalls](/learn/websocket/your-first-websocket-connection#pitfalls)

- [ ] Set `port` or `listen` in the `websocket {}` block; there is no default, and without one the server starts with no WebSocket listener and says nothing about it.
- [ ] Confirm `Listening for websocket clients` appears in the log before debugging anything on the client side.
- [ ] Point WebSocket clients at the WebSocket port and everything else at the client port; the listeners are separate.
- [ ] Give every client URL an explicit port. nats.js fills in 443 for a bare host and 80 for a `ws://` URL without one.
- [ ] If you run a FIPS-140 build, confirm it was built with Go 1.26 or later; earlier toolchains refuse the WebSocket listener outright.

### Browsers and origins — see [Pitfalls](/learn/websocket/browsers-and-origins#pitfalls)

- [ ] Set `allowed_origins` to the exact scheme, host and port the page is served from — all three have to match — or set `same_origin: true` when the page and the NATS endpoint share one hostname.
- [ ] Treat origin checking as protection against other web pages, not as access control — it's skipped entirely when no `Origin` header is present.
- [ ] Keep seeds and credentials files out of front-end code; use a bearer JWT or an `HttpOnly` cookie the page can't read.
- [ ] Give the browser user subscribe permission on the subjects it displays and no publish rights it doesn't need.
- [ ] Restrict browser credentials with `allowed_connection_types: ["WEBSOCKET"]` so they don't also work on 4222.

### TLS and proxies — see [Pitfalls](/learn/websocket/tls-and-proxies#pitfalls)

- [ ] Use `no_tls: true` only behind a proxy that terminates TLS on a network you trust; there's no warning that distinguishes that from exposing it.
- [ ] Make the proxy forward `Upgrade` and `Connection`; without them the handshake fails as a generic connection error.
- [ ] Set the proxy's idle timeout longer than the server's WebSocket ping interval, or working connections drop on a timer.
- [ ] Set `advertise` when the server sits behind NAT or a proxy, so clients are given an address they can reach.
- [ ] Size `handshake_timeout` against the proxy's latency under load, not against a direct connection on a laptop.
- [ ] Configure TLS on the listener with a `tls {}` block or terminate it at the proxy; `wss://` in a client URL only says what the client will do, and a mismatch fails at the handshake.

### Leaf nodes over WebSocket — see [Pitfalls](/learn/websocket/leaf-nodes-over-websocket#pitfalls)

- [ ] Write `wss://` when the link is encrypted. Either the scheme or a `tls {}` block turns TLS on, so `ws://` beside a `tls {}` block is encrypted too — the scheme alone doesn't tell a reader which.
- [ ] Add a `tls {}` block with `ca_file` only when the hub's certificate isn't publicly trusted.
- [ ] Keep every URL in a remote on the same kind of scheme; a mix stops the server at startup.
- [ ] Point the remote at the hub's WebSocket listener, not the leafnode port.
- [ ] Keep a `leafnodes { port: … }` block on the hub even when every leaf arrives over WebSocket; without it the hub accepts the connection and closes it. That port still listens, so firewall it like any other server port.
- [ ] Give the hub a `websocket {}` listener as well; a hub with only a leafnode port has nothing for a `wss://` remote to connect to.
- [ ] Grant `LEAFNODE_WS`, not `LEAFNODE`, to a leaf that arrives over WebSocket.
- [ ] Write an explicit port on every leafnode remote URL; without one the server appends `:7422` whatever the scheme, so `wss://host` dials the leafnode port.
- [ ] If a proxy routes on path, make sure it forwards `/leafnode` — the server appends that to the remote URL's path to mark the connection as a leaf.

## See also

- [Reference → websocket](/reference/config/websocket/) — every field of
  the `websocket {}` block, versioned and exhaustive
- [Security deep dive](/learn/security) — accounts, permissions, and
  bearer credentials for browser clients
- [Topologies deep dive](/learn/topologies) — the leaf-node model behind
  the branch office
- [MQTT deep dive](/learn/mqtt) — the other protocol listener on the
  same binary
