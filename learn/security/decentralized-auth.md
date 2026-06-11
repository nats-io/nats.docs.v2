---
id: decentralized-auth
title: "3. Decentralized Authentication"
sidebar_position: 4
description: The trust chain operator to account to user, and what a signed user JWT actually proves
---

# 3. Decentralized Authentication

The previous page logged `order-svc` in with centralized authentication.
The server held the list of users in its own config, checked the
credentials against that list, and accepted or rejected the connection.

That model has a ceiling. Every new user is a server config edit and a
reload. Every account Acme adds means the operations team touches the
server again. The team that runs the server becomes a bottleneck for the
teams that just want to add a user.

Decentralized authentication removes that bottleneck. The server stops
keeping a user list. Instead it learns to verify proof that someone else
already vouched for the user. This page builds that mental model. It runs
no commands; the hands-on tool comes on the next page.

## The problem with one big user list

Picture Acme a year from now. The `ORDERS` account has 15 services.
The `ANALYTICS` account has eight. A third team wants its own account
tomorrow. With centralized authentication, every one of those identities
lives in the server config, and only the team holding the server config
can add one.

You want each team to manage its own users without touching the server.
The server shouldn't need to know every user in advance, only a way to
tell a real user from a forged one.

That's exactly what a signature gives you.

## Three identities, each signing the next

Decentralized authentication arranges identities into a chain. There are
three links.

The **operator** is the root of trust. There's one per deployment. It's
the single identity the server is told to trust, and it sits above
everything else.

An **account** is the tenant you met on the accounts page: `ORDERS` and
`ANALYTICS` in our scenario. In this model each account is its own
identity, and the operator vouches for it.

A **user** is the auth identity a client connects as: `order-svc` and
`analytics-reader`. Each user belongs to an account, and the account
vouches for it.

"Vouches for" has a precise meaning here: it means *signs*. The operator
signs the account. The account signs the user. The result is a chain of
custody you can verify from any link back up to the root.

<div class="nats-flow" data-scenario="decentralizedAuthAnimated" data-width="600" data-height="380"></div>

## How an identity signs the next

Each identity holds a key it signs and verifies with. In NATS these are
**nkeys**, built on Ed25519, the same elliptic-curve signature scheme used
for SSH and modern code signing. An nkey comes in two forms: a public nkey
others verify against, and a private seed the signer keeps. The signer signs with
the seed; everyone else needs only the public nkey to check a signature.
The server, as you'll see, only ever handles public nkeys and
signatures, never anyone's seed.

An nkey is easy to recognize because its first letter names its role: an
operator nkey starts with `O`, an account nkey with `A`, a user nkey with
`U`, and any seed with `S`. So `OD2A...` is an operator's public nkey and
`SUAH...` is a user's seed. That one-letter prefix is what makes the chain
tangible: three identities, three letters, each signing the next.

That the server only ever sees public nkeys is the whole reason this model
scales. The server never holds anyone's seed. It can't leak what it
doesn't have.

## JWTs: the signed claim a user presents

A user proves who it is by presenting a **JSON Web Token (JWT)**. A JWT is
a small, signed document that states a set of claims and carries the
signature proving those claims haven't been altered.

Reserve one word here. A JWT isn't a "token" in this chapter; "token"
is the password-style credential from the centralized page. A JWT is the
signed document. The credentials file a client loads to present it is the
subject of the next page.

A user JWT names the user and the account that signed it. When
`order-svc` connects, it presents its user JWT. The server reads which
account signed it, finds that account's own JWT, and checks that the
account JWT was signed by the operator. One JWT points at the next, all
the way up.

## What the server actually checks

Here's the move that replaces the user list. The server is configured
with exactly one piece of trust: the **operator's public key**.

Given a connecting user, the server walks the chain:

1. The user JWT was signed by an account. Verify that signature against
   the account's public key.
2. The account JWT was signed by the operator. Verify that signature
   against the one operator key the server trusts.
3. If both signatures hold, the user is genuine. Admit it.

The server never needed a list of users. It needed one trusted operator
key and the math to verify two signatures. Add a thousand users to
`ORDERS` and the server config doesn't change by a single line.

This is also why a forged user JWT fails. A forgery would have to be
signed by an account key the operator vouched for — and the attacker holds
no account's private key. The signature fails at step 2, and the
connection is rejected.

## Why "no user list" is the point

Centralized authentication answers "is this user in my list?"
Decentralized authentication answers "does this user's JWT trace back to my
operator?" The second question scales because the answer is a signature
check, not a lookup that grows with every user.

This is what lets each team run its own account and stamp out its own
users. The `ORDERS` team signs `order-svc` with the `ORDERS` account key.
The `ANALYTICS` team signs `analytics-reader` with the `ANALYTICS` account
key. Neither team touches the server, and the server trusts both because
the operator vouched for both accounts.

## Pitfalls

The trust chain is only as sound as the keys behind it. Four gotchas bite
teams new to decentralized authentication. The commands below come from
**nsc**, the tool that generates and manages this chain; it gets a full
walkthrough on the [next page](/learn/security/operator-mode).

**Losing the operator seed.** The operator is the root of trust, and its
private key, the seed, is the only thing that can sign accounts. Lose
it and you cannot add or re-sign an account ever again; nkeys reports
`no seed or private key available` the moment something tries to sign
without it. Back the operator seed up offline before you build anything on
top of it. Even `nsc reissue operator`, which rotates the operator
identity, warns you to back up the nsc environment first, because without
the seed there's nothing to rotate from.

**Confusing the public nkey with the private seed.** Each identity has a
public nkey others verify against and a private seed that signs. The server
is configured with the operator's *public* nkey and never holds a seed. If
you paste a seed where a public nkey belongs, you've handed out the one
secret that must stay private. Only the seed can sign; the public nkey can
only verify, so treat the seed like a password and the public nkey like a
username.

**Signing users with the account seed instead of a scoped signing key.** It
works, so it's tempting. But every user is then signed by the account's
root key, and a single leaked seed can mint a user with *any* permissions.
A scoped signing key pins the permissions up front, so a leaked signing key
can only stamp out the users you already scoped. Add a signing key to
`ORDERS`, scope it to `orders.>`, and sign `order-svc` with that key rather
than the account seed (see [ADR-14](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-14.md)).

<div class="nats-example" data-type="learn-security-decentralized-auth-scoped-signing-key" data-languages="cli,js,go,python,java,rust,csharp"></div>

**Not planning for JWT expiry.** A user JWT may carry an expiration, and the
server rejects an expired JWT with `claim is expired`. Leave the expiry off
and the JWT never expires, so a leaked credentials file is valid forever;
set one without a renewal plan and the client fails the moment it lapses.
Decide the lifetime deliberately and pair a short expiry with a way to
re-issue creds. The detailed `nsc` flags for this live on
[4. Operator Mode](/learn/security/operator-mode).

## Where you are

You now hold the mental model, with no commands run yet:

- Three identities form a chain: the operator signs each account, and
  each account signs its users.
- A user proves itself with a JWT whose chain of signatures traces
  back to the one operator key the server trusts.
- The server keeps no user list; it verifies signatures instead, and
  never holds anyone's private key.

`order-svc` and `analytics-reader` are still the same users from the
scenario; in this model they're signed by their accounts rather than
listed in server config.

## What's next

The next page makes this real with `nsc`. You'll create the operator
`ACME`, the `ORDERS` and `ANALYTICS` accounts, the `order-svc` user, and
the credentials file the client connects with. You'll also configure the
account resolver that tells the server where to fetch account JWTs.

Continue to [4. Operator Mode](/learn/security/operator-mode).

## See also

- [Core Concepts → Security](/concepts/security) — the five-minute
  overview of the same trust model.
- [4. Operator Mode](/learn/security/operator-mode) — the `nsc` walkthrough
  that builds this chain for real.
