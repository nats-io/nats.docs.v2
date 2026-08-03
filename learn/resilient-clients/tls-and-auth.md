---
id: tls-and-auth
title: "TLS & Auth"
sidebar_position: 8
description: Connect order-svc securely by consuming a credentials file and trusting the cluster CA over a TLS handshake
---

# TLS & Auth

Every connection so far has been plaintext and anonymous. `order-svc` opens
a connection, reconnects when a server moves, drains on shutdown, and retries
its requests. But the bytes on the wire are readable by anyone who can see
the link, and the server accepts the connection without verifying the
client's identity. In production, neither is acceptable.

This page closes the gap from the client's side. It does two things: it points
the client at a credentials file so the server can authenticate
`order-svc`, and it gives the client the CA certificate so it can validate
the server over a TLS link before it sends any data. The key word in both is
*consume*. This chapter loads credentials and a CA; it does not create them.
How either one is created (issuing a user JWT, writing a CA) is the
job of [Security](/learn/security).

## Consuming a credentials file

A **credentials file** is the `.creds` file the client presents to prove its
identity. It holds two things: a user JWT that names the `order-svc` user, and
an nkey seed, a private key the client uses to sign a challenge. You don't
parse it or extract values from it; you hand the client a path, and the client
reads the JWT and seed itself. Connecting with a user and password, a token,
or a raw NKey is covered in
[Security → Authentication basics](/learn/security/authentication-basics);
this page uses the `.creds` file because that's the form production
deployments use.

The mechanics happen inside the handshake from the [Connecting](/learn/resilient-clients/connecting)
page. When the server is set up for nkey or JWT authentication, its `INFO`
says `auth_required` and carries a one-time **nonce**, a random challenge.
The client signs that nonce with the nkey seed
from the creds file and sends the signature, with the user JWT, in its
`CONNECT`. The server checks the signature against the JWT's public key. A
valid signature proves the client holds the seed, and the connection reaches
CONNECTED, with no password ever sent over the wire.

`order-svc` connects exactly as it did before, with one addition: it points at
its creds file. The CLI flag is `--creds`; most client libraries take a path to
the same file through their credentials-file loader, and nats.js takes the
file's contents as bytes instead.

<div class="nats-example" data-type="learn-resilient-clients-tls-and-auth-connect-creds" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

Every example on this page publishes the same canonical order event:

```json
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}
```

The creds file is the whole identity. There's no `--user` and no
`--password`: the JWT names the user and the seed proves it. That also means
the file is a secret. Anyone who holds it can connect as `order-svc`, so it's
loaded from disk or an environment variable, never pasted into source.

## Trusting a CA and the TLS handshake

Authentication proves *who* the client is. It does nothing for the bytes on
the wire, which are still plaintext. TLS fixes that, and it adds a guarantee
in the other direction: it proves the client is talking to the real server and
not an impostor.

For the client, the whole job is one input: the **CA certificate**, the root
authority the client trusts to have signed the server's certificate. When the
client dials a TLS server, the server presents its own certificate during the
handshake. The client checks that the certificate chains to the CA it was
given. If it does, the link is encrypted and the server is authenticated; if
it doesn't, the client aborts before sending any credentials.

The order matters here. In the default handshake the client makes the TCP
dial and the server sends its `INFO` line in plaintext — that's where
`tls_required` appears. The link then upgrades to TLS, the client validates
the server's certificate against the CA, and only over the now-encrypted
link does the client send its `CONNECT` with the creds. So a secure
connection is still built in two layers: TLS proves the server, then the
creds prove the client, and no credential is ever sent before TLS is
established. (An opt-in server mode, `handshake_first` in the server's `tls`
block — the CLI's `--tlsfirst` — moves the TLS handshake ahead of that first
`INFO`, so TLS runs before any protocol byte crosses the wire.) Both sides
must opt in: a `--tlsfirst` client fails its TLS handshake against a server
that still sends the plaintext `INFO`, and a client expecting `INFO` gets
nothing from a handshake-first server until the attempt fails with a timeout
or EOF error.

`order-svc` connects securely by adding the CA to the same connect call. The
CLI flag is `--tlsca`; the client libraries load the same CA through their TLS
options — most take the PEM path directly, and nats.py and nats.java take a
TLS context you build with the CA loaded into it. The server URL uses the
`tls://` scheme:

<div class="nats-example" data-type="learn-resilient-clients-tls-and-auth-connect-tls" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

Where the client reaches the server over WebSocket, `wss://` is the encrypted
equivalent — see [Connect over WebSocket](/learn/websocket/).

The secure handshake runs in this order: the plaintext `INFO`, then the TLS
upgrade and CA validation, then the credentials in `CONNECT`, then the
server's `PONG` — plus the auth-failure branch.

<div class="nats-flow" data-scenario="tlsAuthHandshakeAnimated" data-width="600" data-height="350"></div>

There's a related option that takes one more line. So far the CA lets the
client validate the *server*. **mTLS** (mutual TLS) adds the reverse: the client
also presents its own certificate and key, and the server validates it the
same way. The client side is symmetric, a certificate path and a key path
alongside the CA. Whether the server demands it, and how the certificate maps
to a user, is configured server-side in
[Security → Encryption & TLS](/learn/security/encryption).

Here we cover only the CA the client trusts and the creds it presents; the
exact TLS and credentials option names and defaults live in your client's API
reference, while [Reference](/reference/) covers the wire protocol and server
configuration.

## Auth errors during reconnect

The reconnect loop on the [Reconnection](/learn/resilient-clients/reconnection)
page treats a failed dial as transient: wait, back off, try the next server.
An auth error doesn't fit that model. The server answered and rejected the
credentials, so retrying with the same credentials brings the same rejection.
Most clients allow for one rejection and stop on a repeat.

The first rejection gets a retry because it may be temporary — a creds file
caught mid-rotation, or one server whose auth state lags the rest of the
pool. nats.go closes the connection when the same server returns the same
auth error twice in a row; the `IgnoreAuthErrorAbort()` option opts out.
nats.js aborts the reconnect after two auth errors in a row unless
`ignoreAuthErrorAbort` is set. nats.net stops retrying when the same auth
error repeats twice in a row, with the same-named opt-out. nats.java closes
when the same server returns the same auth error twice. In all four, the abort applies regardless of the retry
budget: unlimited reconnects don't override it. nats.py and nats.rs have no
abort rule — a rejection counts as one more failed attempt, so nats.py keeps
cycling until every server exceeds `max_reconnect_attempts` (60 by default)
and nats.rs keeps cycling until `max_reconnects` runs out (unlimited by
default), surfacing each rejection on its event stream.

An expired or revoked credential therefore doesn't produce an endless retry
loop. In the four clients with the abort rule, the connection ends in the
terminal state from the Reconnection page's diagram — CLOSED (nats.net names
it `Failed`) — and nothing brings it back. That's what the closed handler
from the [Connection Events](/learn/resilient-clients/connection-events) page
is for: it tells the application the connection is finished and needs fresh
credentials or a restart. You won't see the abort from the `nats` CLI,
which sets `IgnoreAuthErrorAbort` and unlimited reconnects, so a CLI command
keeps retrying where a library client closes.

The retry before the abort is deliberate: if the credentials change in that
window, the next attempt succeeds and the connection recovers without a
restart. The dependable way to use the window is a credential callback, which
the client invokes on every connect and reconnect attempt, so a rotated JWT
or key is picked up automatically. In nats.go that's `UserJWT(userCB, sigCB)`,
or `Nkey` for a raw key; in nats.js an authenticator function, called with
the server's nonce on each attempt; in nats.py the `user_jwt_cb` and
`signature_cb` connect arguments; in nats.java an `AuthHandler`; in nats.rs
`ConnectOptions::with_auth_callback`; in nats.net
`NatsAuthOpts.AuthCredCallback`. The clients that take a `.creds` path and
re-read it on every attempt (nats.go, nats.java, nats.py) give file rotation
the same effect without extra code; the load-once clients (nats.js, nats.rs,
nats.net) need the callback form for a rotation to reach a reconnect at all.

## Pitfalls

Securing a connection from the client side fails in a few predictable ways.
Each one is scoped to this page's two inputs: the creds file and the CA.

**Do not hardcode credentials in source.** A user JWT or a password pasted
into the application gets committed, shared, and leaked, and it can't be
rotated without a code change and a redeploy. Load the creds file from a path
or an environment variable, and never commit a `.creds` file. The file holds
the identity, so handle it as a secret.

**Do not skip server verification in production.** Most clients offer a
"skip-verify" or "insecure" TLS mode that accepts any server certificate
without checking it against a CA. It makes a demo connect on the first try,
and it also accepts an impostor server that hands the client a self-signed
certificate. Always supply the CA so the client validates the server. An
encrypted link provides no protection if the server on the other end can't be
trusted.

**An unmonitored credential expiry drops a live connection.** A user JWT
has a validity window, and the server enforces it on the connection itself.
The server arms a timer at the JWT's expiry time; when it fires, the server
sends `-ERR 'User Authentication Expired'` and closes the connection. The
client then tries to reconnect, and the server rejects each attempt with an
authorization violation — and under the rule in
[Auth errors during reconnect](#auth-errors-during-reconnect), most clients
stop after the repeated rejection and close rather than retrying until the
creds refresh. A stale JWT ends in a closed connection. The expiry surfaces
on the error callback, and the final transition on the closed handler from
the [Connection Events](/learn/resilient-clients/connection-events) page.
Refresh credentials ahead of expiry — through a callback or a rotated file —
so it never gets that far.

**Rotate the creds file by opening a fresh connection, not in place.** A
live connection keeps the identity it authenticated with, so overwriting the
`.creds` file on disk changes nothing on the wire while the link stays up.
The change takes effect only at the next connection cycle: some clients
(nats.go, nats.java, nats.py) re-read the creds file from disk on every
reconnect attempt, while others (nats.js, nats.rs, nats.net) load the creds
once up front. Because nats.go re-reads on reconnect, a reconnect that fires
mid-rotation can read a half-written file. That's a client-side load error,
not a server rejection: the file won't parse, so nats.go never sends a
`CONNECT`, treats the attempt as a transient failure, and keeps retrying until
the write completes and the read succeeds. It recovers on its own, but the
window is still avoidable — write the new file to a temp path and rename it
into place so a reader never sees a partial file. For the load-once clients,
register a credential callback from
[Auth errors during reconnect](#auth-errors-during-reconnect) so a reconnect
sees the new creds at all.
To rotate safely, open a new connection with the new creds and
[drain](/learn/resilient-clients/drain-and-shutdown) the old one, so in-flight
work finishes before the old identity goes away.

A secure connect fails in two distinct ways: CA validation (the server
certificate isn't trusted) and authorization (the creds are wrong, expired,
or revoked). They mean different things, so handle them as separate cases at
the connect boundary rather than collapsing both into one network error:

<div class="nats-example" data-type="learn-resilient-clients-tls-and-auth-handle-auth-error" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

## Where you are

`order-svc`'s connection is now secure end to end:

- It **consumes a credentials file**, the `.creds` for the `order-svc` user,
  so the server authenticates it by a signed challenge, with no password on
  the wire.
- It **trusts the cluster CA**, so the TLS handshake validates the server's
  certificate before any credential is sent and encrypts the link.
- It **stops retrying on a repeated auth error**, so an expired or revoked
  credential closes the connection instead of looping, and a credential
  callback lets a reconnect pick up rotated creds without a restart.
- It knows the one-line shape of mTLS (presenting its own certificate)
  and where the server side of that lives.

The connection is now named, pooled, reconnecting, observable, drainable,
backpressure-aware, request-resilient, and authenticated over TLS, which
covers the full client state machine.

## What's next

That's every mechanism this chapter adds to the Acme clients. The last page
steps back: it recaps the connection lifecycle as one state machine, collects
every page's production checklist, and points to where the surrounding topics
live (why servers move, what happens to a consumer's position, and how the
creds and CA you just loaded are made).

Continue to [Where Next](/learn/resilient-clients/where-next).

## See also

- [Security → Authentication basics](/learn/security/authentication-basics) —
  how the `order-svc` credentials are created, the side this page consumes.
- [Security → Encryption & TLS](/learn/security/encryption) — the server side
  of TLS and how a client certificate maps to a user under mTLS.
- [Connecting](/learn/resilient-clients/connecting) — the handshake the creds
  and CA plug into, and what `auth_required` in `INFO` means.
