---
id: authentication-basics
title: "Authentication basics"
sidebar_position: 2
description: Centralized config-based authentication and the three credential types
---

# Authentication basics

The index page left you with a bare `nats-server`: it admits every
connection, and anyone who can reach the port can publish and
subscribe. This page adds the first user list.

That's **authentication**: the server deciding which user a connection
is. This page covers the simplest way to do it, where the list of
valid users lives in the server's own config file.

## Centralized authentication

In **centralized authentication**, the server holds the full list of
users in its own config file, `nats.conf`.

When a connection presents credentials, the server walks its config
list, finds the matching user, and admits the connection. It never
consults an external service.

<div class="nats-flow" data-scenario="centralizedAuthAnimated" data-width="600" data-height="380"></div>

Centralized authentication is the right tool when one team owns the
server config and the user list is small and slow to change. It lives
entirely in one file, so it's the easiest model to read and reason
about.

As your deployment grows beyond a good fit here, you may be able to
buy yourself a tiny bit of operational headroom by using the NATS
configuration file's `include` directive, splitting authentication
data into one or more separate files. If you find yourself doing this,
then treat it only as buying time before you move away from centralized
configuration.

## Giving order-svc a credential

The chapter's order platform needs a user for its order service,
`order-svc`, and one for its reporting side, `analytics-reader`.

A centralized user lives in the `users` array of the server's
`authorization` block. Each entry names a user with a `user` field and
carries that user's credential:

```conf
authorization {
  users: [
    { user: order-svc, password: s3cr3t }
    { user: analytics-reader, password: an4lytics }
  ]
}
```

The `user` and `password` fields are the credential. A connection that
presents `order-svc` / `s3cr3t` is authenticated as `order-svc`. Both
users share the global account, called `$G`; the
[Accounts and multitenancy](/learn/security/accounts-and-multitenancy)
page later gives each its own space.

For a server with exactly one user, you can skip the array and put a
single `user` and `password` pair directly in the `authorization`
block.

The `authorization` block also takes a
[`timeout`](/reference/config/authorization/timeout) field: how long the
server gives a client to finish authenticating, 2 seconds by default.
Plain numbers are seconds; duration strings need quotes
(`timeout: "500ms"` — an unquoted `1m` parses as a number, not a
minute). The full field list is in
[Reference](/reference/config/authorization).

Start the server with that config:

```bash
nats-server -c nats.conf
```

The `-c` flag points the server at the config file. Once it's
running, `order-svc` can connect.

## Connecting as order-svc

A client authenticates by sending its credentials at connect time. On
the CLI that's two flags; in a client library it's two fields on the
connect call. The user publishes the canonical order message to
`orders.created`:

<div class="nats-example" data-type="learn-security-authentication-basics-connect" data-languages="cli"></div>

```
14:18:38 Published 91 bytes to "orders.created"
```

The server matched the credentials and accepted the 91-byte order
payload. A wrong password fails at connect time, before any publish:

```bash
nats pub orders.created "test" --user order-svc --password wrong
```

```
nats: error: nats: Authorization Violation
```

An unauthenticated connect — no flags at all — fails with the same
`Authorization Violation` error. The server gives the same answer for
a wrong password and an unknown user, so a failed login doesn't reveal
which half was wrong.

A client offers credentials once per connection, when it connects.
Authentication decides the user for the whole life of that connection.
What the user may then publish or subscribe to is a separate question:
authorization, covered on the
[Authorization](/learn/security/authorization) page.

A given client may need to reconnect and this usually happens transparently.
The authentication happens again, midway through a session, to authenticate
this new connection.

### Other ways a user entry can authenticate

`order-svc` used a password, but config auth offers three credential
styles in all: user/password, NKey, and token. The model doesn't
change; only the field differs.

**user/password** is the pair you just used: the client sends a
username and a password, and the server compares the password against
the stored value.

**NKey** is a public-key credential: the user entry holds only a
public NKey — it replaces the whole user/password pair, and the server
rejects an entry that mixes them. The client holds the matching
private seed and proves ownership by signing a server-issued nonce, so
nothing secret crosses the wire:

```conf
users: [
  { nkey: UAPZQH4MNJCOVEJFERB3NFSIROQ5RE7CGBEPKAZSB6QB7IQHBKXHZPVP }
]
```

Generate the keypair, add the printed _public_ key to the user list, and
connect with the seed file:

<div class="nats-example" data-type="learn-security-authentication-basics-nkey-user" data-languages="cli"></div>

```
UAPZQH4MNJCOVEJFERB3NFSIROQ5RE7CGBEPKAZSB6QB7IQHBKXHZPVP
18:02:29 Published 91 bytes to "orders.created"
```

`nats auth nkey gen` writes the private seed to `user.nk` and prints nothing,
`nats auth nkey show` prints the public key the config entry above holds,
and the `nats pub` publishing authenticated with only the seed file — a seed
for which the server doesn't know a public key fails with the same
`Authorization Violation` as a wrong password. We come back to NKeys on the
[Decentralized authentication](/learn/security/decentralized-auth)
page; here they're just one more way to authenticate a config user.

**token** is a single shared secret with no username, set on the
server's top-level `authorization` block:
`authorization { token: "shared-secret-rotate-me" }`. Any client
presenting the right token is admitted. It's the one style that can't
be per-user, which makes it a server-wide secret — usable for quick
internal setups but little else. (When this chapter says "token" it
always means this, never a JWT.)

One CLI trap to know: the `--user` flag doubles as a token field — its
help text reads "Username or Token". A lone `--user` with no
`--password` is sent as a token, so it can appear to work against a
token-configured server and mask a misconfiguration.

## Storing passwords

The config above stored `order-svc`'s password in plaintext. That's
fine for a laptop, but not for a config file others can read.

The server flags this itself: on startup it scans the user list, and
if any password is plaintext then it logs a warning:

```
[WRN] Plaintext passwords detected, use nkeys or bcrypt
```

The fix is to store a **bcrypt** hash instead of the raw password.
bcrypt is a one-way hash: the server keeps the hash, the client still
sends the plaintext password, and the server hashes the input to
compare. The stored value reveals nothing usable if the config leaks.

Generate a hash with the CLI; here we use a leading-space because
many shell setups will skip writing such lines to the shell history,
but in general be cautious with supplying secrets in command flag values:

```sh
 nats server passwd --pass "s3cr3t-rotate-me-later"
```

```
$2a$11$4I9tIK1JVbttZYtn.F.Jse5iY5ves4EtYWIpjlwyvgVYHJc8yTvk.
```

Without `--pass` it prompts interactively; `--generate` invents a
strong passphrase and hashes it in one step, and `--cost` raises the
hashing cost above the default 11. The command refuses passwords
shorter than 10 characters (`password should be at least 10 characters
long`), which is why this example hashes the longer
`s3cr3t-rotate-me-later`.

The printed hash starts with `$2a$11$` — Go's bcrypt prefix at cost
11. The server recognizes some variant prefixes as bcrypt indicators,
to match industry practices, but don't rely upon those.  The server
will match everything else as plaintext, and reserves the right to use
any string starting `$` as a hash indicator, so don't use plaintext
starting with a dollar sign.

Paste the hash into the config in place of the plaintext password;
quotes around it are optional; note that a trailing full stop,
if present, is part of the value:

```conf
authorization {
  users: [
    { user: order-svc, password: "$2a$11$4I9tIK1JVbttZYtn.F.Jse5iY5ves4EtYWIpjlwyvgVYHJc8yTvk." }
    { user: analytics-reader, password: an4lytics }
  ]
}
```

`order-svc` now authenticates with `s3cr3t-rotate-me-later` — the
password the hash was generated from. The client still sends the
plaintext; only the stored form is hashed. Once every password in the
list is a hash, the startup warning goes away. (The rest of the
chapter returns to the short plaintext `s3cr3t` so the listings stay
readable.)

Tokens can be stored the same way — a bcrypt hash in the `token` field
goes through the same comparison, and the client sends the clear
token.

Because the client still sends the plaintext over the wire, bcrypt
protects only the config file at rest. Pair it with TLS, which the
[Encryption & TLS](/learn/security/encryption) page sets up.

## What this page does not cover

A client certificate can also be a credential: the server can map a
certificate identity straight to a user with mTLS, so the cert *is*
the credential. That ties into TLS, so the
[Encryption & TLS](/learn/security/encryption) page covers it.

The other open question is scale. Centralized auth keeps every user in
one config file, which is exactly what breaks down when many tenants
manage their own users or the set of users needs to be dynamic.
The [Operator mode](/learn/security/operator-mode) page introduces the model
built for those scenarios.

## Pitfalls

A few things catch people when credentials live in a config file.

**Running with no authentication in production.** A server with no
`authorization` block admits every connection. That's convenient on a
laptop, but on a shared network anyone who can reach the port can
publish and subscribe, so don't ship it. Give every server at least
one user list, so an unauthenticated connect fails with
`nats: error: nats: Authorization Violation` instead of silently
succeeding. One setting can undo that lockdown:
[`no_auth_user`](/reference/config/no_auth_user) admits unauthenticated
connects as a named user even when a user list exists. Set it only on
purpose; the
[Accounts and multitenancy](/learn/security/accounts-and-multitenancy)
page covers its traps.

**Leaving plaintext passwords in a deployed config.** The server logs
`Plaintext passwords detected, use nkeys or bcrypt` on startup, and
the fix — a `nats server passwd` hash in place of the raw value — is
covered above. The pitfall is treating that warning as noise. On any
server someone else can read, store the bcrypt hash, not the plaintext.

**Committing credentials to git.** A `nats.conf` with a password (even a
bcrypt hash) is a secret. Once it lands in history, rotating the
password is the only real fix, because the old value lives in every
clone. Keep the credential out of the committed file: reference an
environment variable or a secret store, and add the real config to
`.gitignore`.

**Putting the password in the connection URL.** A URL like
`nats://order-svc:s3cr3t@localhost:4222` puts the credential into
shell history, process listings, and any log that records the
connection string. Store it in a named context instead — passing the
password as `"$NATS_PASSWORD"` so your shell history records only the
variable name — then connect by context name with no credential on the
command line:

<div class="nats-example" data-type="learn-security-authentication-basics-context-creds" data-languages="cli"></div>

```
14:19:37 Published 91 bytes to "orders.created"
```

The context holds `order-svc`'s password; the publish command carries
none. If `NATS_PASSWORD` is exported then CLI prints
`WARNING: Shell environment overrides in place using NATS_PASSWORD`,
so either don't export it or unset it once the context is saved.

Note that the way a Unix shell works, the `"$NATS_PASSWORD"` is handled by the
shell, and is replaced with the real value before the `nats` command is
invoked.  The value will still show up in process listings by other users!
(Modern Unix will typically not make process environments visible to other
users.)

## Where you are

You have:

- A server started with `nats-server -c nats.conf`.
- Two users in a top-level `authorization` block, both in the global
  account `$G`: `order-svc` and `analytics-reader`,
  password-authenticated — and you know how to swap any stored
  password for a `nats server passwd` bcrypt hash.
- Proof the passwords work: `order-svc` published the canonical order
  message to `orders.created`, and a wrong password was rejected with
  `Authorization Violation`.

## What's next

`order-svc` can prove who it is, but nothing yet limits what it may
do: it can publish and subscribe anywhere on the server. The next page
adds those limits.

Continue to [Authorization](/learn/security/authorization).

## See also

- [Reference → authorization](/reference/config/authorization) — every
  field of the `authorization` block, including `timeout` and
  per-user options.
- [Authorization](/learn/security/authorization) — what an
  authenticated user is then allowed to do.
- [Core Concepts → Security](/concepts/security) — the five-minute
  overview of the same material.
