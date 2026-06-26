---
id: tls-and-auth
title: "TLS & Auth"
sidebar_position: 7
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
reads the JWT and seed itself.

The mechanics happen inside the handshake from the [Connecting](/learn/resilient-clients/connecting)
page. When the server's `INFO` says `auth_required`, it also sends a one-time
**nonce**, a random challenge. The client signs that nonce with the nkey seed
from the creds file and sends the signature, with the user JWT, in its
`CONNECT`. The server checks the signature against the JWT's public key. A
valid signature proves the client holds the seed, and the connection reaches
CONNECTED, with no password ever sent over the wire.

`order-svc` connects exactly as it did before, with one addition: it points at
its creds file. The CLI flag is `--creds`; the client libraries take a path to
the same file through their credentials-file loader.

<div class="nats-example" data-type="learn-resilient-clients-tls-and-auth-connect-creds" data-languages="cli,js,go,python,java,rust,csharp"></div>

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

The order matters here. The TLS handshake and CA validation run *first*, on top
of the TCP dial. Only after the link is secure does the client send its
`CONNECT` with the creds. So a secure connection is built in two layers: TLS
proves the server, then the creds prove the client, over the now-encrypted
link.

`order-svc` connects securely by adding the CA to the same connect call. The
CLI flag is `--tlsca`; the client libraries take a path to the same PEM file
through their TLS options. The server URL uses the `tls://` scheme:

<div class="nats-example" data-type="learn-resilient-clients-tls-and-auth-connect-tls" data-languages="cli,js,go,python,java,rust,csharp"></div>

The secure handshake runs in this order: the TLS step and CA validation, then
the credentials, then `+OK`, plus the auth-failure branch.

<div class="nats-flow" data-scenario="tlsAuthHandshakeAnimated" data-width="600" data-height="350"></div>

There's a related option that takes one more line. So far the CA lets the
client validate the *server*. **mTLS** (mutual TLS) adds the reverse: the client
also presents its own certificate and key, and the server validates it the
same way. The client side is symmetric, a certificate path and a key path
alongside the CA. Whether the server demands it, and how the certificate maps
to a user, is configured server-side in
[Security → Encryption & TLS](/learn/security/encryption).

Here we cover only the CA the client trusts and the creds it presents. The
full set of TLS and credentials options lives in [Reference](/reference/).

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

**An unmonitored credential expiry breaks the next reconnect.** A user JWT
has a validity window. While the connection stays up, an expired JWT goes
unnoticed. The moment the connection drops and the client tries to
reconnect, authentication fails and the connection can't recover. The failure
surfaces on the disconnect/error callback from the
[Reconnection](/learn/resilient-clients/reconnection) page, not at startup.
Refresh credentials ahead of expiry and watch the auth-error rate so a stale
JWT is caught before a reconnect needs it.

**Rotate the creds file by opening a fresh connection, not in place.** The
client reads the creds file once, at connect time. Overwriting that file with a
new `.creds` while the connection is live changes nothing on the wire: the old
identity stays in use until the connection cycles. Worse, if a reconnect happens
to fire mid-rotation, it may read a half-written file and fail to authenticate.
To rotate safely, open a new connection with the new creds and
[drain](/learn/resilient-clients/drain-and-shutdown) the old one, so in-flight
work finishes before the old identity goes away.

A secure connect fails in two distinct ways: CA validation (the server
certificate isn't trusted) and authorization (the creds are wrong, expired,
or revoked). They mean different things, so handle them as separate cases at
the connect boundary rather than collapsing both into one network error:

<div class="nats-example" data-type="learn-resilient-clients-tls-and-auth-handle-auth-error" data-languages="cli,js,go,python,java,rust,csharp"></div>

## Where you are

`order-svc`'s connection is now secure end to end:

- It **consumes a credentials file**, the `.creds` for the `order-svc` user,
  so the server authenticates it by a signed challenge, with no password on
  the wire.
- It **trusts the cluster CA**, so the TLS handshake validates the server's
  certificate before any credential is sent and encrypts the link.
- It knows the one-line shape of **mTLS** (presenting its own certificate)
  and where the server side of that lives.

The connection is now named, pooled, reconnecting, drainable,
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
