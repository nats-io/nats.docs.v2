---
id: authentication-basics
title: "2. Authentication Basics"
sidebar_position: 3
description: Centralized config-based authentication and the three credential types
---

# 2. Authentication Basics

The previous page gave `ORDERS` and `ANALYTICS` their own isolated
subject spaces. Nobody is using them yet. A connection still has to
prove who it is before the server will place it in an account.

That proof is **authentication**: the server deciding which user a
connection is. This page covers the simplest way to do it, where the
list of valid users lives in the server's own config file.

## Centralized authentication

In **centralized authentication**, the server holds the full list of
users in its configuration. Every username, every password, every
account assignment sits in one place: `nats.conf` on the server.

This is config-based. When a connection presents credentials, the
server walks its config list, finds the matching user, and admits the
connection into that user's account. No external service is consulted.

<div class="nats-flow" data-scenario="centralizedAuthAnimated" data-width="600" data-height="380"></div>

The flow is direct. The client connects and offers credentials. The
server compares them against its config user list. A match is admitted
into the user's account; a mismatch is rejected.

Centralized authentication is the right tool when one team owns the
server config and the user list is small and slow to change. It lives
entirely in one file, so it is the easiest model to read and reason
about.

It does not scale to many independent tenants editing their own users.
Every change is a server-config change. The [next
page](/learn/security/decentralized-auth) covers the model that solves
that. For now, one team, one config, one user list.

## Giving order-svc a credential

Recall the `ORDERS` account from the previous page. Its order service
needs a user to connect as: `order-svc`.

A centralized user lives inside an account's `users` array. Each entry
names a credential and, by being nested in the account, an account.
Here is the `ORDERS` account with one user:

```conf
accounts {
  ORDERS {
    users = [
      { user: order-svc, password: "s3cr3t-rotate-me" }
    ]
  }
  ANALYTICS {
    users = [
      { user: analytics-reader, password: "read-only-pw" }
    ]
  }
}
```

The `user` and `password` fields are the credential. The enclosing
`ORDERS` block is the account. A connection that presents
`order-svc` / `s3cr3t-rotate-me` is authenticated as `order-svc` and
placed in `ORDERS`.

Start the server with that config:

```bash
nats-server -c nats.conf
```

The `-c` flag points the server at the config file. Once it is
running, `order-svc` can connect.

## Connecting as order-svc

A client authenticates by sending its credentials at connect time. On
the CLI that is two flags; in a client library it is two fields on the
connect call. The user publishes the canonical order message to
`orders.created`:

<div class="nats-example" data-type="learn-security-authentication-basics-connect" data-languages="cli,js,go,python,java,rust,csharp"></div>

The server matched the credentials, placed the connection in `ORDERS`,
and accepted the publish. Wrong credentials would have been rejected
at connect time with an authorization-violation error, before any
publish.

A client offers credentials once, when it connects. Authentication
decides the user for the whole life of that connection. What the user
may then publish or subscribe to is a separate question —
authorization — and it has its own [page](/learn/security/authorization).

### Other ways a user entry can authenticate

`order-svc` used a password, but that same centralized user entry can
carry a different credential. A `users` entry holds one of three —
`password`, `token`, or `nkey` — and the server checks whichever it
finds. The model is unchanged; only the field differs.

**user/password** is the pair you just used: the client sends a
username and a password, and the server compares the password against
the stored value. It is the style this chapter uses for centralized
auth. **token** swaps the pair for a single shared secret with no
username — any client presenting the right token is admitted as the
user it maps to (when this chapter says "token" it always means this,
never a JWT), handy for quick internal setups. **nkey** is a
public-key credential: the server stores only the user's public nkey,
the client holds the matching private seed and proves ownership by
signing a server-issued nonce, so nothing secret crosses the wire. We
meet nkeys properly on the [decentralized
authentication](/learn/security/decentralized-auth) page; here they are
simply one more way to authenticate a config user.

## A word on passwords

The config above stored `order-svc`'s password in plaintext. That is
fine for a laptop and wrong for a server anyone can read.

The server agrees. On startup it scans the user list, and if any
password is plaintext it logs a warning:

```
[WRN] Plaintext passwords detected, use nkeys or bcrypt
```

The fix is to store a **bcrypt** hash instead of the raw password.
bcrypt is a one-way hash: the server keeps the hash, the client still
sends the plaintext password, and the server hashes the input to
compare. The stored value reveals nothing usable if the config leaks.

Generate a hash with the CLI:

```bash
nats server passwd
```

It prompts for a password and prints a hash that begins with `$2a$`,
`$2b$`, `$2x$`, or `$2y$` — the prefix the server uses to recognize a
hash. Add `--generate` to have it invent a strong passphrase and hash
it in one step.

Paste the hash into the config in place of the plaintext password.
A bcrypt value is written without surrounding quotes; the server
detects the `$2a$`-style prefix and treats the whole string as the
stored hash:

```conf
accounts {
  ORDERS {
    users = [
      { user: order-svc, password: $2a$11$Vx8sQH0o6Q2yqgk0Rj4y3eF6jK7uYwq9k0Zr2nF1pD8sLm3aBcDe }
    ]
  }
}
```

The warning is now gone, and `order-svc` connects exactly as before —
the client still sends the same plaintext password. Only the stored
form changed.

The full set of `authorization` and account fields is documented in
[Reference](/reference/). We use only `user`, `password`, `token`,
`nkey`, and per-account `users` here.

## What this page does not cover

A client certificate can also be a credential: the server can map a
certificate identity straight to a user with mTLS, so the cert *is* the
credential. That ties into TLS, so it waits for the
[encryption](/learn/security/encryption) page.

The other open question is scale. Centralized auth keeps every user in
one config file, which is exactly what breaks down when many tenants
manage their own users. The next page introduces the model built for
that.

## Pitfalls

Centralized auth keeps every credential in one file you control, which
makes a handful of mistakes easy to make and easy to avoid.

**Running with no authentication in production.** A server with no
`authorization` and no per-account `users` admits every connection into
the default account. That is convenient on a laptop and dangerous on a
shared network: anyone who can reach the port can publish and subscribe.
Do not ship it. Give every server at least one user list, so an
unauthenticated connect fails with an authorization-violation error
instead of silently succeeding.

**Leaving plaintext passwords in a deployed config.** The page covered
the fix above: the server logs `Plaintext passwords detected, use nkeys
or bcrypt` on startup and you replace the raw value with a `nats server
passwd` hash. The pitfall is treating that warning as noise. On any
server someone else can read, store the bcrypt hash, not the plaintext.

**Committing credentials to git.** A `nats.conf` with a password — even a
bcrypt hash — is a secret. Once it lands in history, rotating the
password is the only real fix, because the old value lives in every
clone. Keep the credential out of the committed file: reference an
environment variable or a secret store, and add the real config to
`.gitignore`.

**Putting the password in the connection URL.** A URL like
`nats://order-svc:s3cr3t-rotate-me@localhost:4222` puts the credential
into shell history, process listings, and any log that records the
connection string. Store it in a named context instead, then connect by
context name with no credential on the command line:

<div class="nats-example" data-type="learn-security-authentication-basics-context-creds" data-languages="cli,js,go,python,java,rust,csharp"></div>

The context holds `order-svc`'s password; the publish carries none. The
credential never appears in the command, so it never reaches your history
or the server's connection log.

## Where you are

You have:

- A server started with `nats-server -c nats.conf`.
- An `ORDERS` account with a centralized user, `order-svc`,
  authenticated by a bcrypt-hashed password.
- An `ANALYTICS` account with its own user, `analytics-reader`.
- `order-svc` publishing the canonical order message to
  `orders.created`.

The credential list lives entirely in the server config — one team,
one file.

## What is next

The next page keeps the same two accounts and the same two users but
moves the trust out of the config file. You will see how an
**operator** signs accounts, accounts sign users, and the server ends
up trusting a single public key instead of a list of passwords.

Continue to [Decentralized Authentication](/learn/security/decentralized-auth).

## See also

- [Decentralized Authentication](/learn/security/decentralized-auth)
  — the model that scales past one config file.
- [Authorization](/learn/security/authorization) — what an
  authenticated user is then allowed to do.
- [Core Concepts → Security](/concepts/security) — the five-minute
  overview of the same material.
