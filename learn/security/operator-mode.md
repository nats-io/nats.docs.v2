---
id: operator-mode
title: "Operator Mode"
sidebar_position: 5
description: Build the ACME trust chain with nsc, point the server at a resolver, and connect with a creds file
---

# Operator Mode

By now you know the trust chain in concept: an operator signs
accounts, an account signs users, and the server trusts only the
operator's public key. Now we make it real with tools.

Two things are needed to turn the idea into a working setup. Something has to
generate every nkey and JWT in the chain and sign them in the right
order. And the server, which no longer holds a user list, needs a way
to find an account's JWT when a user from that account connects. The
first job belongs to the **nsc** tool. The second belongs to the
**account resolver**.

By the end you'll have an operator named `ACME`, the same two
accounts you built in config mode (`ORDERS` and `ANALYTICS`), a user
`order-svc`, and the credentials it connects with. The setup mirrors
the centralized one, but no user lives in the server config.

## Why you use nsc

What happens if you try to build the chain by hand? You generate an
operator nkey, then an account nkey, then sign the account JWT with the
operator's private seed, then a user nkey, then sign the user JWT with
the account's seed. Each step uses a different key, and each signature
has to be exact or the whole chain breaks. Do it manually and one wrong
seed produces a JWT the server silently rejects at connect time.

`nsc` is the tool that does all of this for you. It generates the
nkeys, builds the JWTs, signs each one with the correct key in the
chain, and stores everything in a local directory tree. It holds every
key for the trust chain in one place. The server never runs it. You run it
on a trusted machine, and it produces two kinds of output: account
JWTs the server fetches, and credentials clients connect with.

## Building the chain

One sequence creates the whole chain:

```bash
nsc add operator --name ACME --sys
nsc add account --name ORDERS
nsc add account --name ANALYTICS
nsc add user --name order-svc --account ORDERS
```

Each command signs with the key from the line above it. `nsc add
operator` creates `ACME`, the root of trust. The `--sys` flag also
spins up a system account under it. The server uses that account to
answer its own internal JWT-lookup requests, and the resolver needs it
later, so creating it now saves a step.

The two `nsc add account` lines create `ORDERS` and `ANALYTICS`, each
signed by `ACME`. These are the same two tenants from the
[accounts page](/learn/security/accounts-and-multitenancy), now living
as signed JWTs instead of config blocks. Finally `nsc add user` creates
`order-svc` inside `ORDERS`, signed by the `ORDERS` account. That's the
user that publishes the orders.

What did `nsc` actually build? Ask it:

```bash
nsc describe account --account ORDERS
```

The output shows the account's name, its public nkey (it starts with
`A`), and its issuer: the operator key that signed it. That issuer
field is the link in the chain the server will verify.

## The credentials the client presents

A user JWT alone can't connect. The JWT is a public claim; to prove it
owns that identity, the client also needs the user's private nkey seed
to sign the server's challenge. So `nsc` packages both into a single
credentials file:

```bash
nsc generate creds --account ORDERS --name order-svc --output-file order-svc.creds
```

Open it and you see two labeled sections:

```
-----BEGIN NATS USER JWT-----
eyJ0eXAiOiJKV1QiLCJhbGciOiJlZDI1NTE5LW5rZXkifQ...
------END NATS USER JWT------

-----BEGIN USER NKEY SEED-----
SUAOY5JZ2WJKVR4UO2KJ2P3SW6FZFNWEOIMAXF4WZEUNVQXXUOKGM55CYE
------END USER NKEY SEED------
```

The first section is the public claim the server reads. The second is
the private half the client signs with; it never leaves the client,
and the server never sees it. So a credentials file is a secret:
treat it like a password, readable by the one client that uses it and
nothing more.

## Why the server needs a resolver

The server now trusts `ACME`. But what happens when `order-svc`
connects? The server reads the user JWT, sees it was signed by
`ORDERS`, and goes to verify that `ORDERS` was in turn signed by the
operator, only to discover it has never seen the `ORDERS` JWT. It can't
finish the chain. The connection fails.

The **account resolver** closes that gap. It's the part of the server
config that tells `nats-server` where to find account JWTs at connect
time. The recommended type is the nats-based resolver: the server keeps
every account JWT in a local directory, and you deliver new ones over a
NATS connection. It's preferred over the memory and URL resolvers
because it needs no extra service to run, syncs JWTs across a cluster
on its own, and updates an account without a server restart.

Let `nsc` write the config for you:

```bash
nsc generate config --nats-resolver > resolver.conf
```

The generated `resolver.conf` looks like this:

```conf
# Operator named ACME
operator: eyJ0eXAiOiJKV1QiLCJhbGciOiJlZDI1NTE5LW5rZXkifQ...
# System Account named SYS
system_account: ABJHLOVMPA4CI6R5KLNGOB4GSLNIY7IOUPAJC4YFNDLQVIOBYQGUWVLA

# configuration of the nats based resolver
resolver {
    type: full
    dir: './jwt'
    allow_delete: false
    interval: "2m"
    timeout: "1.9s"
}
```

`operator` is the operator JWT, the one key the server trusts and the
anchor of the whole chain. `system_account` is the public nkey of the
account `--sys` created. `resolver.dir` is where account JWT files live,
one per account. The full set of resolver options, and the other
resolver types, are in [Reference](/reference/).

Start the server with it:

```bash
nats-server -c resolver.conf
```

## Filling the resolver

The server is running with an empty `./jwt` directory. It trusts `ACME`
but has never seen the `ORDERS` or `ANALYTICS` JWTs, the exact gap from
the section above. You close it by pushing the account JWTs to the
running server:

```bash
nsc edit operator --account-jwt-server-url nats://localhost:4222
nsc push --all
```

The first line records the server's NATS URL on the operator, so `nsc`
knows where to deliver JWTs. `nsc push --all` then sends every account
JWT under `ACME` to the server, which writes each into its `./jwt`
directory. After the push, the server can validate any user signed by
`ORDERS` or `ANALYTICS`.

Notice what was *not* pushed: the user JWTs. Users never go to the
server. A client presents its own user JWT at connect time, inside the
credentials file.

## Connecting with the credentials

Everything's in place. The server trusts `ACME`, holds the account
JWTs, and `order-svc` has its credentials, so it can now publish an order.

<div class="nats-example" data-type="learn-security-operator-mode-connect-creds" data-languages="cli,js,go,python,java,rust,csharp"></div>

The client reads the credentials file, presents the user JWT, and signs
the server's challenge with the nkey seed. The server verifies the JWT
was signed by `ORDERS`, that `ORDERS` was signed by `ACME`, and that
the challenge signature matches the JWT's public key. The whole chain
checks out, and the publish succeeds.

No `--user` or `--password` appears anywhere. The credentials file *is*
the identity. That's the shift from config mode: the server holds one
trusted key, not a list of users.

## Pitfalls

Operator mode splits one identity store across two machines: your `nsc`
directory and the server's resolver. Most failures come from those two
drifting apart, or from a `.creds` file ending up where it shouldn't.

**Forgetting `nsc push` after an edit.** An `nsc edit` changes only the
local JWT in your `nsc` store. The running server keeps the old account
JWT until you push again, so a fresh `order-svc` connection fails with
`Authorization Violation`. The server logs `account jwt not found`
because the chain it holds no longer matches. An `nsc edit` isn't
complete until you push, so always run the push after the edit.

<div class="nats-example" data-type="learn-security-operator-mode-push-after-edit" data-languages="cli,js,go,python,java,rust,csharp"></div>

**System account missing under a nats-based resolver.** The server uses
the system account to answer its own JWT-lookup requests, so the
nats-based resolver refuses to start without one. Omit it and
`nats-server` exits at boot with `using nats based account resolver -
the system account needs to be specified in configuration or the
operator jwt`. The `--sys` flag on `nsc add operator` and the
`system_account` line that `nsc generate config` writes are what
satisfy this, so keep both.

**Leaking the `.creds` file.** The credentials file carries the user's
private nkey seed, so anyone holding it *is* `order-svc`. There's no
password to guess and no list to revoke against. Never bake it into an
image, log it, or commit it; give it `0600` permissions and mount it to the
one client that needs it. To cut off a leaked credential, revoke the
user and re-push the account; see
[Decentralized Authentication](/learn/security/decentralized-auth) for
how the trust chain makes that revocation stick.

## Where you are

You now have a full operator-mode setup that mirrors the config-mode
one from earlier pages:

- An operator `ACME` is the root of trust.
- Accounts `ORDERS` and `ANALYTICS` are signed by `ACME` and pushed to
  the server's resolver.
- A user `order-svc` lives in `ORDERS`, with credentials it connects
  with.
- The server config holds the operator JWT, the system account, and a
  resolver — and no user list at all.

The decentralized setup and the centralized one reach the same place:
`order-svc` connects and publishes orders. The difference is how the
server decides to trust it.

## What's next

`order-svc` can connect, but right now it can publish and subscribe
anywhere in its account. The next page adds **authorization**: subject
permissions that scope `order-svc` to exactly `orders.>`. The same
permission model works in config mode and in the JWTs you just built.

Continue to [Authorization](/learn/security/authorization).

## See also

- [Decentralized Authentication](/learn/security/decentralized-auth) —
  the trust chain this page builds
- [Core Concepts → Security](/concepts/security) — the five-minute
  overview of accounts, users, and JWTs
- [Reference](/reference/) — the full set of resolver and `nsc`
  options
