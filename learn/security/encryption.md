---
id: encryption
title: "Encryption & TLS"
sidebar_position: 9
description: Secure the wire with TLS and mTLS, then encrypt the JetStream store on disk
---

# Encryption & TLS

The chapter has built three ways to authenticate a client: a user list
in the config, a signature chain rooted in the ACME operator, and an
auth callout service that decides on its own. Every one of them still
talks over a plaintext link — the credentials and the order JSON cross
the wire readable by anyone who can see the connection.

This page closes that gap. It wraps the client-to-server link in TLS,
lets the client's certificate serve as the `order-svc` identity, moves the
TLS handshake in front of the first protocol byte, and encrypts the
JetStream store on disk.

## TLS is per connection type

A NATS server speaks to more than one kind of peer. Clients connect to
it, servers route to each other in a cluster, a leaf node dials a hub,
and gateways join superclusters.

Each of those is a separate connection type, and each one carries its
own TLS configuration. The top-level `tls {}` block secures client
connections. It doesn't touch the others.

The monitoring, websocket, mqtt, leafnode, cluster, and gateway connections
have their own `tls {}` sub-blocks, nested inside their own configuration.
Turning on TLS for clients leaves cluster routes plaintext until you configure
the cluster block too.

This independence is deliberate: a laptop client and an inter-datacenter
gateway have different threat models, so each link gets its own
configuration. This page secures the one link in our scenario: the
client-to-server connection for `order-svc`.

## Server-side TLS

TLS needs three files on the server. The server's **certificate**
(`cert_file`) proves the server's identity. Its **private key**
(`key_file`) is the secret that pairs with that certificate. The
**CA certificate** (`ca_file`) is the authority the server trusts to
have signed peer certificates.

If you don't have certificates yet, mint a throwaway CA and a server
certificate with `openssl`:

```bash
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes \
  -keyout ca-key.pem -out ca.pem -subj "/CN=Acme Test CA" -days 30
openssl req -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes \
  -keyout server-key.pem -out server.csr -subj "/CN=nats.acme.internal"
openssl x509 -req -in server.csr -CA ca.pem -CAkey ca-key.pem \
  -CAcreateserial -out server-cert.pem -days 30 \
  -extfile <(printf "subjectAltName=DNS:nats.acme.internal,IP:127.0.0.1")
```

The SAN list covers the DNS name and the loopback address, so you can
dial either. Copy the three `.pem` files to `/etc/nats/certs/`, where
this page's config expects them. A throwaway CA is enough to follow
along; a production server carries certificates from your
organization's PKI or a public CA.

Add a `tls {}` block to the server config:

```conf
# nats.conf — client connections now require TLS
listen: "0.0.0.0:4222"

tls {
  cert_file: "/etc/nats/certs/server-cert.pem"
  key_file:  "/etc/nats/certs/server-key.pem"
  ca_file:   "/etc/nats/certs/ca.pem"
  timeout:   2
}
```

`timeout` is the handshake budget in seconds. The default is `2`, and
two seconds is enough for a healthy network. Too short and a slow client
can't finish the negotiation; too long and a stalled handshake holds a
slot open.

You can check the config before starting anything with
`nats-server -t -c nats.conf`. Then start the server the same
way as before:

```sh
nats-server -c nats.conf
```

The boot log includes `TLS required for client connections`. A
plaintext client gets refused at the handshake; it never reaches
authentication.

## The client must trust the CA

A TLS client verifies the server's certificate before it sends a single
byte of credentials. To do that, the client needs to have in its CA
certificate pool store a CA certificate which is valid for the signing path to
the NATS server's TLS-enabled certificate.

`order-svc` connects exactly as it did on the
[Authentication basics](/learn/security/authentication-basics) page,
with one addition: it points at the CA file. The CLI flag is `--tlsca`;
the client libraries take a path to the same PEM file.

<div class="nats-example" data-type="learn-security-encryption-connect-tls" data-languages="cli"></div>

```
14:22:18 Published 91 bytes to "orders.shipped"
```

The payload is the same 91 bytes of order JSON. The link now encrypts
them in transit, and the client has verified it's talking to the real
server.  The server which you talk to is itself the TLS end-point and so sees
the plaintext traffic; any routed copies of the traffic will happen outside of
your TLS connection and so depend upon whatever other TLS configuration, if
any, exists for those onward links.

TLS verification checks that the hostname you
dial matches a name inside the server certificate. A certificate issued
for `nats.acme.internal` rejects a client that specifies to connect to
`127.0.0.1`, because the address isn't listed in the certificate.
Match the connection address to a name the certificate covers.
If `nats.acme.internal` happens to resolve to `127.0.0.1` (and your DNS
resolvers do not filter such claims) then that would still work.

The full set of TLS options (cipher suites, curve preferences, and
certificate pinning) is documented in
[Reference](/reference/config/tls). This page uses only `cert_file`,
`key_file`, `ca_file`, and `timeout`.

Note that NATS supports learning the connection addresses of servers in the
same cluster as the server which you connected to (configurable for a given
server with the `client_advertise` option); this functionality supports
automatic reconnections gracefully handling lame-duck server shutdowns, etc.
If, and only if, a NATS client sees an IP address in the advertised server
lists, then that is treated as equivalent to an updated DNS entry, and when
reconnecting the NATS client should use the original DNS hostname as the
server identity to verify even as it connects to a specific different IP.

## Mutual TLS: mapping the certificate to the identity

So far TLS proves the server to the client. When the client proves
itself to the server with its own certificate, that's
**mutual TLS (mTLS)**.

mTLS demands a certificate from every connecting client and rejects any
client whose certificate doesn't chain to the receiving server's `ca_file`.
That proves the client holds a valid certificate, but it doesn't yet say who
the client is.

[`verify_and_map: true`](/reference/config/tls/verify_and_map) covers
both steps. It requires and verifies the
client certificate, then reads an identity out of it and uses that as
the NATS user. The server tries the certificate's email SANs first,
then DNS SANs, then URI SANs, and only then the **subject** — the
certificate's distinguished name in RFC 2253 form. A SAN is used only
if it matches a user; when none does, the server falls back to the
subject, so a certificate that carries SANs can still map by its DN.

With `verify_and_map`, the certificate is the credential. There's no
password, no creds file to ship. The certificate the client already
presents for the TLS handshake also names the user. The server matches
that distinguished name against its user list using a DN-aware match,
not a plain string compare, so differences in attribute spacing and
ordering don't matter.

Here's the server config that ties a client certificate to the
`order-svc` identity. The user moves into the `ORDERS` account exactly
where the [Accounts and multitenancy](/learn/security/accounts-and-multitenancy)
page put it, keeping the `orders.>` permissions from the
[Authorization](/learn/security/authorization) page — only the `user`
value changes, from a name-and-password pair to the certificate's
distinguished name. The `ANALYTICS` account and the rest of the config
stay as they were:

```conf
# nats.conf — the client certificate is the user
listen: "0.0.0.0:4222"

tls {
  cert_file:      "/etc/nats/certs/server-cert.pem"
  key_file:       "/etc/nats/certs/server-key.pem"
  ca_file:        "/etc/nats/certs/ca.pem"
  verify_and_map: true
}

accounts {
  ORDERS {
    jetstream: enabled
    users: [
      {
        user: "CN=order-svc,O=Acme"
        permissions: {
          publish:   { allow: ["orders.>"] }
          subscribe: { allow: ["_INBOX.>"] }
        }
      }
    ]
  }
}
```

The client certificate comes from the same throwaway CA. The subject
attributes are written smallest-last on the `openssl` command line, so
they render in RFC 2253 order as `CN=order-svc,O=Acme` — the exact
string the `user` field above holds:

```bash
openssl req -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes \
  -keyout order-svc-key.pem -out order-svc.csr -subj "/O=Acme/CN=order-svc"
openssl x509 -req -in order-svc.csr -CA ca.pem -CAkey ca-key.pem \
  -CAcreateserial -out order-svc-cert.pem -days 30
```

`order-svc` now connects by presenting its own certificate and key —
no password, no creds file. The CLI passes the client certificate with
`--tlscert` and its key with `--tlskey`:

<div class="nats-example" data-type="learn-security-encryption-connect-mtls" data-languages="cli"></div>

```
14:23:05 Published 91 bytes to "orders.shipped"
```

The server reads `CN=order-svc,O=Acme` from the certificate, matches it
to the user in `ORDERS`, and applies that user's permissions.

Note that the rules for matching certificate DNs can be a little complex and
are more than just a simple string equality match.  The NATS server handles
the rules and can deal with DNs which contain sets, and so forth.

`verify_and_map` includes everything `verify: true` does and adds the
mapping step, so you don't set both. Reach for plain `verify` only when
an external system already maps certificates to users and the server
doesn't need to.

## TLS-first handshakes

By default, NATS starts every connection in plaintext: the server sends
its `INFO` line first, and only then do both sides upgrade to TLS. The
upgrade happens before any credentials flow, but the `INFO` itself —
server version, connect URLs — crosses the wire unencrypted.

<div class="nats-flow" data-scenario="tlsFirstHandshakeAnimated" data-width="600" data-height="380"></div>

In the top lane that `INFO` line is the first byte on the wire, in the
clear. In the bottom lane the first byte belongs to the TLS handshake.

**`handshake_first`** flips that order. With it on, the TLS handshake
happens before any protocol byte, the way an HTTPS server behaves:

```conf
tls {
  cert_file: "/etc/nats/certs/server-cert.pem"
  key_file:  "/etc/nats/certs/server-key.pem"
  ca_file:   "/etc/nats/certs/ca.pem"
  handshake_first: true
}
```

The server warns you about the cost at startup:

```
[WRN] Clients that are not using "TLS Handshake First" option will fail to connect
```

A client that expects the plaintext `INFO` hangs until its read
timeout and fails with
`nats: error: read tcp ...: i/o timeout`. The CLI opts in with
`--tlsfirst` (also available on `nats context save`); the client
libraries have an equivalent connect option.

For migration, `handshake_first` also accepts `"auto"` (or
`"auto_fallback"`) — fall back to plaintext `INFO` if no TLS bytes
arrive within 50 ms — or a duration like `"300ms"` for a custom
fallback delay.

One diagnostic side effect: `openssl s_client` fails immediately
against a default NATS TLS port with a `wrong version number` error,
because the first bytes on the wire are the plaintext `INFO` line
rather than a TLS record — that error doesn't mean TLS is broken. With
`handshake_first` on, the port behaves like any TLS endpoint and
`s_client` works.

If you have the GnuTLS CLI tools installed, then you can use:

```sh
gnutls-cli --starttls --port 4222 server.host.name
```

and then after you see the `INFO` line, type Control-D to start the TLS
handshake.

## Encryption at rest

TLS protects messages in transit. It does nothing for messages
already written to disk by a JetStream stream. That's a separate
control: **encryption at rest**, a server-wide setting that encrypts
stream data and metadata on disk with an AEAD cipher. It's global, not
per account, and independent of everything above — a stream can be
encrypted on disk behind a plaintext link, or plaintext on disk behind
TLS.

Note that some disk controllers can handle encryption-at-rest at the block
layer, beneath the visibility of processes such as the nats-server, and do so
at high performance without impacting upon server CPU.  You should carefully
evaluate if having the nats-server do the encryption itself is the right
solution for your deployment scenario.

Give the `jetstream {}` block a key, and keep the key itself out of the
config file with an environment variable:

```conf
jetstream {
  store_dir: "/data/jetstream"
  key: $JS_KEY
}
```

```sh
JS_KEY="s3cr3t-master-key" nats-server -c nats.conf
```

The startup log confirms the cipher — ChaCha20-Poly1305 is the default;
`cipher: aes` switches to AES-GCM:

```
[INF]   Encryption:      ChaCha20-Poly1305
```

To rotate the master key, restart once with the new key in `key` and
the old one in `prev_key` (also settable from an environment variable).
The server re-wraps the per-stream keys and persists the result, so a
later restart with only the new key recovers cleanly. `prev_key` is
transitional — drop it after the rotation restart. The remaining
options (TPM-backed keys, per-cipher details) live in
[Reference](/reference/config/jetstream/encryption_key).

## Pitfalls

Teams hit a few traps the first time they secure a NATS link or a
JetStream store.

**TLS on without `verify` is encryption, not authentication.** A
top-level `tls {}` block with `cert_file`, `key_file`, and `ca_file`
encrypts the link and proves the server to the client. It doesn't
ask the client for a certificate. Until you add `verify: true` (or
`verify_and_map: true`), any client that trusts your CA connects
without presenting one. Set `verify` and confirm it's working by
pointing a client that holds no certificate at the server:

<div class="nats-example" data-type="learn-security-encryption-verify-required" data-languages="cli"></div>

```
nats: error: remote error: tls: certificate required
```

That's the correct outcome: the handshake fails because no `--tlscert`
was supplied, and the server log shows `[ERR] ... TLS handshake error:
tls: client didn't provide a certificate`. If the publish succeeds
instead, the server isn't checking client certificates.

**`verify_and_map` needs the certificate subject to name a real user.**
The DN-aware match tolerates attribute spacing and ordering:
`CN=order-svc,O=Acme` still matches a user written
`CN=order-svc, O=Acme` or `O=Acme,CN=order-svc`. A different value
fails the match — a typo, a wrong attribute, or a user the list
doesn't contain. The client then sees
`nats: error: nats: Authorization Violation` and the server logs
`[ERR] ... authentication error`. Don't hand-type the DN. Read it back
from the certificate with `openssl x509 -noout -subject` and paste that
value into the `user` field.

**Cluster and gateway certificates need both `serverAuth` and
`clientAuth` key usages.** TLS between cluster routes and between
gateways is always mutual, and each node presents its one certificate
both as a server (accepting routes) and as a client (dialing them). A
`serverAuth`-only certificate fails the route handshake — the most
common cluster-TLS failure. The rejection is logged on the peer, not
the misconfigured node: `TLS route handshake error: ... certificate
specifies an incompatible key usage`. Watch for that line rather than
a missing route — when both nodes list each other in `routes`, the
cluster can still come up through the one direction where the bad
certificate acts as the server, leaving a mesh that works but logs the
error on every reconnect attempt. The per-link blocks are covered in
[Clustering](/learn/clustering) and
[Leaf nodes](/learn/topologies/leaf-nodes); the full field list is in
[Reference](/reference/config/tls).

**Certificates rotate on disk, not in the server.** The server reads
`cert_file`, `key_file`, and `ca_file` once at startup. Overwriting the
files does nothing until you signal a reload with
`nats-server --signal reload=<pid>` (or send SIGHUP). Even then,
existing connections keep the certificate they handshook with; only new
connections get the rotated one. A certificate that expires unnoticed
fails as a handshake rejection, not an auth error — monitor validity
dates and pair renewal with the reload signal, the discipline the
[Deployment hardening](/learn/deployment/hardening) guide applies.

**`handshake_first: true` locks out every legacy client.** Any client
not using `--tlsfirst` (or its library equivalent) times out instead of
connecting. Migrate with a duration value — `handshake_first: "300ms"`
accepts both kinds of client — and flip to `true` only after the last
client has opted in.

**A wrong at-rest key hides streams; it doesn't destroy them.** If a
stream vanishes after a restart and the log shows
`Error decrypting our stream metafile: unable to recover keys`, the
server was started with the wrong key — restart with the right one and
the stream returns. And after a key rotation, don't keep running with
`prev_key` set: it exists for the one transitional restart, and leaving
the old key in place keeps a retired secret live.

## Where you are

The client-to-server link for `order-svc` now runs over TLS, optionally
with the handshake before the first protocol byte. With
`verify_and_map`, the client certificate carries the `order-svc`
identity directly, and the server applies the same `orders.>`
permissions inside the `ORDERS` account — no password or creds file
involved. On disk, the JetStream store is encrypted with a key the
config file never contains.

The cluster, leafnode, and gateway links each still need their own
`tls {}` block. Securing those is the same three files in a different
place — see [Clustering](/learn/clustering) and
[Leaf nodes](/learn/topologies/leaf-nodes).

## What's next

That completes the chapter's build. The last page puts the whole model
back together and gathers every Pitfall into one production checklist.

Continue to [Where to go next](/learn/security/where-next).

## See also

- [TLS configuration](/reference/config/tls) — every `tls {}` field:
  cipher suites, curve preferences, pinning, OCSP
- [JetStream `encryption_key`](/reference/config/jetstream/encryption_key) —
  the at-rest key and its aliases
- [Core Concepts → Security](/concepts/security) — the five-minute
  overview of the same material
- [Deployment hardening](/learn/deployment/hardening) — certificate
  rotation and monitoring in a real deployment
