---
id: encryption
title: "7. Encryption & TLS"
sidebar_position: 8
description: Secure each connection type with TLS, and let a client certificate be the user identity with mTLS
---

# 7. Encryption & TLS

Everything so far runs over a plaintext link. `order-svc` authenticates,
its permissions scope it to `orders.>`, and `ANALYTICS` imports
`orders.shipped` — but the bytes on the wire are readable by anyone who
can see the connection.

This page closes that gap. It does two things: it wraps the
client-to-server link in TLS, then it goes one step further and lets the
client's certificate *be* the `order-svc` identity.

## TLS is per connection type

A NATS server speaks to more than one kind of peer. Clients connect to
it. In a cluster, servers route to each other. A leaf node dials a hub.
Gateways join superclusters.

Each of those is a separate connection type, and **each one carries its
own TLS configuration**. The top-level `tls {}` block secures client
connections. It does not touch the others.

The cluster, leafnode, and gateway connections have their own `tls {}`
sub-blocks, nested inside their own configuration. Turning on TLS for
clients leaves cluster routes plaintext until you configure the cluster
block too.

This independence is deliberate. A laptop client and an inter-datacenter
gateway have different threat models, and you secure them on their own
terms. This page secures the one link in our scenario: the
client-to-server connection for `order-svc`.

## Server-side TLS

TLS needs three files on the server. The server's **certificate**
(`cert_file`) proves the server's identity. Its **private key**
(`key_file`) is the secret that pairs with that certificate. The
**CA certificate** (`ca_file`) is the authority the server trusts to
have signed peer certificates.

Add a `tls {}` block to the server config:

```conf
# nats-server.conf — client connections now require TLS
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
cannot finish the negotiation; too long and a stalled handshake holds a
slot open.

Start the server with this config the same way as before:

```bash
nats-server -c nats-server.conf
```

The listener now speaks TLS. A plaintext client gets refused at the
handshake — it never reaches authentication.

## The client must trust the CA

A TLS client verifies the server's certificate before it sends a single
byte of credentials. To do that, the client needs the same CA
certificate the server's chain was signed by.

`order-svc` connects exactly as it did on the authentication page, with
one addition: it points at the CA file. The CLI flag is `--tlsca`; the
client libraries take a path to the same PEM file.

<div class="nats-example" data-type="learn-security-encryption-connect-tls" data-languages="cli,js,go,python,java,rust,csharp"></div>

The published message carries our canonical order shape, unchanged:

```json
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}
```

The bytes are the same as before. The connection carrying them is now
encrypted end to end, and the client has confirmed it is talking to the
real server and not an impostor.

One trap is worth naming. TLS verification checks that the hostname you
dial matches a name inside the server certificate. A certificate issued
for `nats.acme.internal` rejects a client that connects to `127.0.0.1`,
because the address is not listed in the certificate. Match the
connection address to a name the certificate covers.

The full set of TLS options — cipher suites, curve preferences, and
certificate pinning — is documented in [Reference](/reference/). We use
only `cert_file`, `key_file`, `ca_file`, and `timeout` here.

## Mutual TLS: the certificate becomes the identity

So far TLS proves the *server* to the client. The reverse direction —
the client proving itself to the server with its own certificate — is
**mutual TLS (mTLS)**, the second and last concept of this page.

mTLS demands a certificate from every connecting client and rejects any
client whose certificate does not chain to `ca_file`. That proves the
client holds a valid certificate, but it does not yet say *who* the
client is.

One server field gets you both halves at once. `verify_and_map: true`
turns on certificate verification — the same check `verify: true`
performs — and then does one more thing: it reads the **subject** of the
client certificate, its distinguished name in RFC 2253 form, and uses
that distinguished name as the NATS user. Verification and mapping are
the same switch, not two you stack.

With `verify_and_map`, the certificate *is* the credential. There is no
password, no creds file to ship. The certificate the client already
presents for the TLS handshake also names the user. The server matches
that distinguished name against its user list — not a plain string
compare, but a DN-aware match that tolerates differences in attribute
spacing and ordering.

Here is the server config that ties a client certificate to the
`order-svc` identity. The `user` value is the certificate's distinguished
name, and the permissions are the same `orders.>` scope from the
authorization page:

```conf
# nats-server.conf — the client certificate IS the user
listen: "0.0.0.0:4222"

tls {
  cert_file:      "/etc/nats/certs/server-cert.pem"
  key_file:       "/etc/nats/certs/server-key.pem"
  ca_file:        "/etc/nats/certs/ca.pem"
  verify_and_map: true
}

authorization {
  users = [
    {
      user: "CN=order-svc,O=Acme"
      permissions: {
        publish:   { allow: ["orders.>"] }
        subscribe: { allow: ["_INBOX.>"] }
      }
    }
  ]
}
```

`order-svc` now connects by presenting its own certificate and key. It
sends no password and no creds file, because with `verify_and_map` on
there is no second authentication step — the TLS handshake itself
authenticates the client. The CLI passes the client certificate with
`--tlscert` and its key with `--tlskey`:

```bash
nats pub orders.shipped \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --server tls://nats.acme.internal:4222 \
  --tlsca   /etc/nats/certs/ca.pem \
  --tlscert /etc/nats/certs/order-svc-cert.pem \
  --tlskey  /etc/nats/certs/order-svc-key.pem
```

The server reads `CN=order-svc,O=Acme` from the certificate, matches it
to the user in the list, and applies that user's permissions. Identity
and encryption arrive in the same handshake.

A note on naming. `verify_and_map` is not a replacement for `verify`
that drops certificate checking — it is `verify` *plus* mapping. Setting
`verify_and_map: true` enables the same certificate verification that
`verify: true` does, and on top of that maps the certificate subject to
a user. You do not set both: `verify_and_map` is the superset. Reach for
plain `verify` only when an external system already maps certificates to
users and the server does not need to.

## Encryption at rest, in one line

TLS protects messages *in transit*. It does nothing for messages already
written to disk by a JetStream stream. That is a separate control:
**encryption at rest**, a server-wide setting that encrypts stream data
and metadata on disk with an AEAD cipher.

It is global, not per account, and it is orthogonal to everything on this
page — a stream can be encrypted at rest over a plaintext link, or
plaintext on disk behind TLS. The on-disk side belongs with the storage
discussion in [Surviving node loss](/learn/jetstream/surviving-node-loss).

## Pitfalls

A few traps hit teams the first time they secure a NATS link. Each one
is scoped to this page's two concepts: TLS, and the certificate as
identity.

**TLS on without `verify` is encryption, not authentication.** A
top-level `tls {}` block with `cert_file`, `key_file`, and `ca_file`
encrypts the link and proves the *server* to the client. It does not ask
the client for a certificate. Until you add `verify: true` (or
`verify_and_map: true`), any client that trusts your CA connects without
presenting one, and you have encryption with no client identity from the
certificate. Do not assume "TLS is on" means "clients are
authenticated by certificate" — set `verify` and prove it.

You can prove it. Point a client that holds no certificate at the
server. Against a `verify`-enabled server the handshake fails; if the
publish succeeds, the server is not checking client certificates.

<div class="nats-example" data-type="learn-security-encryption-verify-required" data-languages="cli,js,go,python,java,rust,csharp"></div>

**`verify_and_map` needs the certificate subject to name a real user.**
The server reads the certificate's distinguished name in RFC 2253 form
and matches it against its user list. The match is DN-aware, not a raw
string compare: `CN=order-svc,O=Acme` still matches a user written
`CN=order-svc, O=Acme` (extra space) or `O=Acme,CN=order-svc`
(attributes reordered). What it will not forgive is a different
*value* — a typo in the name, a wrong attribute, or a user the list does
not contain. That is an authentication failure, not a warning. Do not
hand-type the DN — read it back from the certificate with
`openssl x509 -noout -subject` and paste that value into the `user`
field.

**Each connection type carries its own TLS.** Turning on the top-level
`tls {}` block secures client connections only. The cluster, leafnode,
and gateway connections each have their own `tls {}` sub-block, and you
must configure mutual TLS (with `verify: true`) for cluster and gateway
routes — the server does not enforce it on its own.
A common mistake is to secure clients, see the green padlock, and leave
inter-server routes plaintext. Do not stop at the client block — the
per-link TLS for those topologies is covered in
[Clustering](/learn/clustering) and
[Leaf nodes](/learn/topologies/leaf-nodes).

**Certificates expire.** A working mTLS setup stops working the moment a
certificate passes its validity window, and the failure looks like a
handshake rejection rather than an auth error. Rotate certificates ahead
of expiry and monitor their validity dates — the same discipline the
[Deployment hardening](/learn/deployment/hardening) guide applies.

## Where you are

The client-to-server link for `order-svc` now runs over TLS, so the
order JSON is encrypted on the wire. With `verify_and_map`, the client
certificate carries the `order-svc` identity directly, and the server
applies the same `orders.>` permissions you set earlier — no password or
creds file involved.

The cluster, leafnode, and gateway links each still need their own
`tls {}` block. Securing those is the same three files in a different
place, covered where those topologies are built:
[Clustering](/learn/clustering) and
[Leaf nodes](/learn/topologies/leaf-nodes).

## What is next

The last mechanism in this chapter is **auth callout**: handing the
authentication decision to an external NATS service so you can plug NATS
into OIDC, LDAP, or a custom identity service.

Continue to [8. Auth Callout](/learn/security/auth-callout).

## See also

- [Core Concepts → Security](/concepts/security) — the five-minute
  overview of the same material.
- [Surviving node loss](/learn/jetstream/surviving-node-loss) — where
  on-disk data and encryption at rest live.
- [Clustering](/learn/clustering) — per-link TLS for server-to-server
  routes.
