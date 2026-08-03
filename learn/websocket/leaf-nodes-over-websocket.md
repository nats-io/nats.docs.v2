---
id: leaf-nodes-over-websocket
title: "Leaf nodes over WebSocket"
sidebar_position: 5
description: Point a leaf node at a WebSocket listener instead of the leafnode port, and the differences that come with it
---

# Leaf nodes over WebSocket

A leaf node can dial its hub over WebSocket instead of the leafnode
port. Everything about the leaf node itself is unchanged — the same
account, the same subject interest, the same behaviour when the link
goes down. Only the transport differs. [Topologies → Leaf
nodes](/learn/topologies/leaf-nodes) covers the model this page reuses.

The reason to do it is usually on the hub side. Acme reaches the `east`
cluster through the HTTPS ingress set up in [TLS and
proxies](/learn/websocket/tls-and-proxies). The leafnode port isn't
published through it, but the WebSocket listener is — the same one the
warehouse dashboard connects to. An Acme retail
branch running a leaf node for its tills uses that door.

## The hub side

The hub needs two things: leafnode connections enabled, and a WebSocket
listener for them to arrive on.

```conf
# n1-east — hub
listen: 0.0.0.0:4222
server_name: n1-east

leafnodes {
  port: 7422
}

websocket {
  listen: 0.0.0.0:443
  tls {
    cert_file: "/etc/nats/certs/nats.acme.example.pem"
    key_file:  "/etc/nats/certs/nats.acme.example-key.pem"
  }
}
```

This is the certificate-on-the-listener shape from the previous page. The
terminated shape — `no_tls: true` plus `advertise`, with the ingress
holding the certificate — works identically for leaf nodes; the branch
config below doesn't change either way.

Leaf nodes and browser clients share the WebSocket listener. What tells
them apart is the path on the upgrade request: a leaf node asks for
`/leafnode`, a client asks for `/`. The server reads that and builds the
right kind of connection.

You never write `/leafnode` yourself — the branch's remote URL stays
`wss://host:443` and the server appends it. It matters when something
between the two routes on path. A proxy publishing only `/nats` never
sees `/leafnode` and the branch can't connect; give the remote the
proxy's prefix (`wss://host:443/nats`) and the request becomes
`GET /nats/leafnode`, which the rule does match.

### Why both blocks, when the branch only uses 443

The branch dials `:443`, so the `leafnodes` block looks redundant, but
the two blocks do different jobs:

- `leafnodes { port: 7422 }` is the switch that makes this server willing
  to accept leaf nodes **at all**.
- `websocket {}` is the door the branch actually arrives through.

Drop the `leafnodes` block, or write it empty as `leafnodes {}` with no
port, and the branch's connection is accepted by the WebSocket listener
and then closed — the hub isn't taking leaf nodes. The port number in it
is never used by a WebSocket leaf node, but the block has to be there.

One consequence worth knowing: 7422 is a real listener, open to whatever
can reach it, even though no WebSocket leaf node uses it. Treat it like
the other server ports and restrict it to the peers that need it —
[Deployment → Hardening](/learn/deployment/hardening) covers the firewall
rules for the rest of them.

## The branch side

The remote URL carries the scheme:

```conf
# branch till server
listen: 127.0.0.1:4222
server_name: branch-42

leafnodes {
  remotes [
    { urls: ["wss://nats.acme.example:443"] }
  ]
}
```

That's the whole change. Compared with a leafnode-port remote, the URL
scheme is `wss://` and the port is 443.

The branch's connection reaches the hub's WebSocket listener, the leaf
node registers, and subject interest flows both ways as it would over
7422.

<div class="nats-flow" data-scenario="wsLeafNodeAnimated" data-width="680" data-height="380"></div>

## What turns TLS on

Two things do, and either is enough on its own: the `wss://` scheme, or
a `tls {}` block on the remote. You don't need both.

Against a hub whose WebSocket listener requires TLS:

| Remote | TLS handshake | Result |
|---|---|---|
| `ws://` alone | no | fails — the hub is expecting TLS |
| `ws://` with `tls {}` | yes | connects |
| `wss://` alone | yes | connects if the hub's certificate is publicly trusted |
| `wss://` with `tls {}` | yes | connects |

A `wss://` remote with no `tls {}` block anywhere still performs a
handshake — this is what a failure looks like when the hub's certificate
isn't one the branch already trusts:

```
[ERR] TLS leafnode handshake error: tls: failed to verify certificate:
      x509: certificate signed by unknown authority
```

The handshake ran and failed at certificate verification. What fixes it
is a `tls {}` block carrying the right CA, rather than one added to turn
TLS on.

So the `tls {}` block has two jobs, and it helps to keep them apart. It
turns TLS on where the scheme hasn't, and it supplies what verification
needs — a CA for a certificate your system store doesn't carry, or a
client certificate when the hub verifies its leaf nodes:

```conf
leafnodes {
  remotes [
    {
      urls: ["wss://nats.acme.example:443"]
      tls {
        ca_file: "/etc/nats/certs/acme-ca.pem"
      }
    }
  ]
}
```

With a certificate from a public CA, the branch needs no `tls {}` block
at all.

The practical consequence is that **the URL scheme doesn't tell you
whether a link is encrypted**. A remote written `ws://` with a `tls {}`
block beside it is a TLS connection. If you want that to be obvious to
whoever reads the config next, write `wss://` and let the scheme say so.

## One scheme per remote

Every URL in a single remote must use the same kind of scheme. Mixing
them stops the server at startup:

```conf
remotes [
  { urls: ["wss://nats.acme.example:443", "nats://n2-east:7422"] }
]
```

```
nats-server: remote leaf node configuration cannot have a mix of
websocket and non-websocket urls: ["wss://nats.acme.example:443"
"nats://n2-east:7422"]
```

This bites when adding a second hub address for redundancy. Every URL in
the list has to be `wss://`, pointing at hubs that all run a WebSocket
listener — you can't list the ingress and a direct leafnode port as
alternatives to each other.

Write the port explicitly, on every remote URL. A leafnode URL without a
port gets `:7422` appended whatever its scheme, so `wss://nats.acme.example`
quietly dials the leafnode port rather than 443 — and then fails, because
that port doesn't speak WebSocket.

## Compression and masking

Two settings apply only to WebSocket remotes:

```conf
remotes [
  {
    urls: ["wss://nats.acme.example:443"]
    ws_compression: true
    ws_no_masking: true
  }
]
```

`ws_compression` asks the hub to negotiate compression on the link, and
carries the same trade as it does for clients: CPU on both ends against
bytes on the wire. A leafnode link carries whatever the branch
subscribes to, so the answer depends on that traffic and on the link —
measure it rather than assume.

`ws_no_masking` asks the hub to accept unmasked frames. The WebSocket
specification requires clients to mask what they send, which exists to
stop a browser being used to poison intermediary caches — a concern that
doesn't apply to a server-to-server link. Setting it removes the
per-frame masking step. Both are requests: the hub decides, and the link
works either way if it declines.

Both accept longer aliases (`websocket_compression`,
`websocket_no_masking`) that mean the same thing.

## Restricting the credential

The branch's credential shouldn't work as an ordinary client
connection. The connection type for a leaf node arriving over WebSocket
is `LEAFNODE_WS`, not `LEAFNODE`:

```conf
authorization {
  users [
    { user: branch-42, password: s3cr3t, allowed_connection_types: ["LEAFNODE_WS"] }
  ]
}
```

Using `LEAFNODE` here refuses the branch, because the transport it
arrives on is part of what the value names.

## Pitfalls

**Reading the scheme as the encryption status.** `ws://` with a `tls {}`
block is encrypted, and `wss://` on its own is too. Neither the scheme
nor the block alone tells you what a link is doing — check both before
concluding a connection is in the clear.

**Mixing schemes in one `urls` list.** The server refuses to start. Every
URL in a remote is `wss://` or none of them is.

**Pointing the remote at the leafnode port.** The branch dials the hub's
*WebSocket* listener. Port 7422 speaks the leafnode protocol directly
and will not complete a WebSocket handshake.

**Granting `LEAFNODE` to a WebSocket leaf.** The value has to match the
transport. A leaf over WebSocket needs `LEAFNODE_WS`.

**A path-routing proxy that doesn't forward `/leafnode`.** The server
marks a WebSocket leaf by appending `/leafnode` to the remote URL's path,
so a proxy publishing only `/nats` never sees the request. Either route
`/` or give the remote the proxy's prefix so the path becomes
`/nats/leafnode`.

**Reaching a hub that isn't running a WebSocket listener.** The transport
has to exist on both ends. A hub with only a leafnode port has nothing
for a `wss://` remote to connect to.

## Where you are

The branch is on the backbone through the same endpoint the dashboard
uses:

- the hub runs a WebSocket listener with a certificate, shared by
  browsers and leaf nodes
- the branch dials `wss://nats.acme.example:443` and registers as an
  ordinary leaf node
- TLS is on because the scheme says so, with `tls {}` supplying a CA
  only where the certificate isn't publicly trusted
- the branch credential is restricted to `LEAFNODE_WS`

## What's next

That's the chapter. [Where to go
next](/learn/websocket/where-next) collects the model into one place,
points at the reference for the field detail, and gathers the pitfalls
from every page into a checklist to run before this goes to production.

## See also

- [Reference → websocket](/reference/config/websocket/) — the listener
  the hub runs
- [Topologies → Leaf nodes](/learn/topologies/leaf-nodes) — the leaf-node
  model this page changes the transport of
- [Security → Encryption](/learn/security/encryption) — TLS across the
  server's listeners
