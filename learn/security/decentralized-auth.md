---
id: decentralized-auth
title: "Decentralized authentication"
sidebar_position: 7
description: What the server verifies in the operator-account-user trust chain, and how scoped signing keys, revocation, and expiry control users
---

# Decentralized authentication

On the [previous page](/learn/security/operator-mode) you built the `ACME`
operator, pushed the `ORDERS` and `ANALYTICS` accounts to the resolver, and
connected `order-svc` with a credentials file. The commands worked; this
page explains what the server actually verified when that connection came
in. It then closes the one gap the build left open: `order-svc` is still
unrestricted, while in config mode it was limited to `orders.>`. By the end
it's re-issued from a scoped signing key that carries those permissions,
with an expiring credentials file and a way to revoke it.

## The problem with one big user list

Why go through the operator setup at all? Suppose Acme is a year older:
the `ORDERS` account holds 15 services, `ANALYTICS` holds eight, and a
third team wants its own account. With centralized authentication (the
model from the first half of this chapter), every one of those identities
lives in the server config, and only the team holding that config can add
one.

You want each team to manage its own users without touching the server.
The server shouldn't need to know every user in advance, only a way to
tell a real user from a forged one. A signature check does that: on the
previous page you created `order-svc` without adding any user config to
the server.

## The three identities in the trust chain

Decentralized authentication arranges identities into a chain with three
links.

The **operator** is the root of trust. There's one per deployment —
`ACME` in our setup. It's the single identity the server is told to
trust.

An **account** is the tenant you met on the
[Accounts and multitenancy](/learn/security/accounts-and-multitenancy) page:
`ORDERS` and `ANALYTICS` in our scenario. In this model each account is
its own identity, and the operator vouches for it.

A **user** is the auth identity a client connects as: `order-svc` and
`analytics-reader`. Each user belongs to an account, and the account
vouches for it.

"Vouches for" has a precise meaning here: it means signs. The operator
signs the account. The account signs the user. The result is a chain you
can verify from any link back up to the root.

<div class="nats-flow" data-scenario="decentralizedAuthAnimated" data-width="600" data-height="380"></div>

## How an identity signs the next

Each identity holds a key it signs and verifies with. In NATS these are
**NKeys**, built on Ed25519, the same elliptic-curve signature scheme used
for SSH and modern code signing. An NKey comes in two forms: a public NKey
others verify against, and a private seed the signer keeps. The signer
signs with the seed; everyone else needs only the public NKey to check the
signature. The server only ever handles public NKeys and signatures, never
anyone's seed.

An NKey is easy to recognize because its first letter names its role: an
operator NKey starts with `O`, an account NKey with `A`, a user NKey with
`U`, and any seed also prepends `S`.
So `OD2A...` is an operator's public NKey and `SUAH...` is a user's seed.

An identity isn't limited to its one built-in key pair. An account can
hold extra **signing keys** that also count as valid issuers for its
users — you'll use one shortly — and the operator can hold signing keys
for accounts the same way. A user signed by an account signing key carries
an `issuer_account` field in its JWT naming the account it belongs to.
(There's always an issuer, it's just that the default is implicit and is the
signing key inherent in the account rather than an added key.)

## The user JWT

A user connection proves who it is by presenting a **JSON Web Token (JWT)**,
which provably carries in it the public key corresponding to the private key
which signed the server's challenge.
A JWT is a small, signed document that states a set of claims and carries the
signature proving those claims haven't been altered.

A user JWT isn't the "token" from
[Authentication basics](/learn/security/authentication-basics): that token
is a password-style secret the server compares against its config, while
a user JWT is a signed document anyone can inspect but only the right account
(signing) key can produce.
The credentials file from the previous page holds the user JWT in
its first block; the second block is the user's seed, and the next section
shows why the client needs both.

A user JWT names the user and the account that issued it. When
`order-svc` connects, it presents its user JWT. The server reads from it which
account issued it, fetches that account's own JWT from the resolver, and
checks that the account JWT was signed by the operator. Each JWT
references the next one up the chain.

## What the server actually checks

The server's config replaces the user list with a single embedded
operator JWT: the long `operator: eyJ...` line in the `server.conf` you
generated. That JWT contains the operator's public key, and it can
list extra operator signing keys; any of those keys can vouch for an
account.

One more input arrives at connect time. The server sends the client a
**nonce**, a random value generated fresh for this connection. The client
signs the nonce with the user seed and sends the signature back along with
the user JWT.

Given all that, the server checks:

1. The nonce signature verifies against the user's public key named in
   the user JWT. This proves the client holds the seed right now, not
   just a copy of the JWT.
2. The user JWT was signed by the account that issued it. The server
   verifies that signature against the account's identity key or one of
   its signing keys.
3. The account JWT, fetched from the resolver, was signed by the
   operator. The server verifies it against the keys in the operator JWT
   it was configured with.

If all three hold, the user is genuine: the server admits it and applies
whatever permissions and limits the JWTs carry.

The numbered checks also show why each kind of forgery fails. A copied user
JWT without the seed can't sign the nonce and fails check 1 — that's why a
stolen JWT alone is useless, and why the creds file has two sections. A
homemade user JWT fails check 2, because the attacker holds no key of
`ORDERS`. A homemade account JWT fails check 3, because only the
operator's seed can produce a signature the server's operator JWT vouches
for.

(But see below, re Bearer Tokens, for an exception to this.)

## Why removing the user list matters

Centralized authentication checks the user against a list. Decentralized
authentication checks that the user's JWT traces back to the operator,
and that scales because a signature check works for a user the server has
never seen — no config entry has to exist before the user connects.

This is what lets each team run its own account and create its own users.
The `ORDERS` team signs `order-svc` with keys of the `ORDERS` account. The
`ANALYTICS` team signs `analytics-reader` with keys of `ANALYTICS`.
Neither team touches the server, and the server trusts both because the
operator vouched for both accounts.

## Scoped permissions with a signing key

One thing is still missing from parity with config mode. On the
[Authorization](/learn/security/authorization) page, `order-svc` could
publish only to `orders.>`; the user you created on the previous page can
publish anywhere in the account. In this model permissions travel inside
the signed JWTs, and the clean way to assign them is a **scoped signing
key**: an account signing key with a role name and a fixed permission set.
Every user issued by that key gets exactly those permissions. Re-issue
`order-svc` from a scoped key named `order-writer`:

<div class="nats-example" data-type="learn-security-decentralized-auth-scoped-signing-key" data-languages="cli"></div>

```
Scoped Signing Key ACQFRPTMQBCYT7QB2PRHW3XEMBZYXLOXT5V7IBYTZP3CBPV6VCW2ME5E
...
Removed user order-svc
...
User order-svc (UASBX5L3X7MSAAAPVRKNAQFRMAFKP4VOKB6O3ZZ72QYD2DQCL2W4TP5K)

Configuration:

            Account: ORDERS (AC6S25M37MU5PJGKYF5QPJPJ6XDQZXJPIPTMCR5MK7ZALYQGX6MH4IRU)
             Issuer: ACQFRPTMQBCYT7QB2PRHW3XEMBZYXLOXT5V7IBYTZP3CBPV6VCW2ME5E
             Scoped: true
...
Permissions:

  Publish:

                Allow: orders.>

  Subscribe:

                Allow: _INBOX.>
```

The `Issuer` line is the point: `order-svc` is now issued by
`ACQFRPTM...`, the scoped key, not the `ORDERS` identity key, and
`Scoped: true` confirms its permissions come from the key's template. The
permission set shown is the role's — the same `orders.>` publish and
`_INBOX.>` subscribe it had in config mode.

The scoped key lives inside the `ORDERS` account JWT, so the server
doesn't know it yet. Until you push, the new credentials are rejected:

```sh
nats pub orders.created '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200}' --creds order-svc.creds
```

```
nats: error: nats: Authorization Violation
```

Push the account as you did on the previous page
(`nats auth account push ORDERS -s nats://127.0.0.1:4222 --creds sys.creds`)
and try again:

```
14:24:53 Published 63 bytes to "orders.created"
```

Anything outside the scope now fails, and this time it's a permission
error rather than an authentication one:

```sh
nats pub billing.charge 'x' --creds order-svc.creds
```

```
nats: error: nats: permissions violation: Permissions Violation for Publish to "billing.charge"
```

The scoped user's own JWT carries an empty permission set (`"pub": {}, "sub": {}`). The server applies the key's
template at connect time, so a change to the template reaches every user
signed by that key on the next account push, with no creds re-issued. The
v0.4.0 CLI can't yet edit a scope in place, though — see the Pitfalls.

The snippet also re-minted the creds file with `--expire 720h`, so the
user JWT inside it lapses after 30 days. Expiry belongs to the minted
credential, not the stored user: re-run `nats auth user credential`
whenever you need a fresh one.

## Revoking a user

The snippet passed `--revoke` when it removed the old, unrestricted
`order-svc`. `nats auth user rm` without it
only deletes the user from your local store; credentials already handed
out keep working, because the server never consults your store. With
`--revoke`, the command writes an entry into the `ORDERS` account JWT: a
`revocations` map from the user's public key to a timestamp. Any user JWT
for that key issued at or before that time is rejected. Like every account
change, it takes effect on the next `nats auth account push ORDERS`, and
the push also disconnects clients currently connected as the revoked
user. Run the lifecycle end to end to see when the revocation takes
effect:

<div class="nats-example" data-type="learn-security-decentralized-auth-revocation-lifecycle" data-languages="cli"></div>

```
18:04:03 Published 63 bytes to "orders.created"
Removed user order-svc
18:04:03 Published 63 bytes to "orders.created"
...
✓ Update completed on acme-1
...
18:04:04 >>> Disconnected due to: EOF, will attempt reconnect
...
nats: error: nats: Authorization Violation
...
18:04:19 Published 63 bytes to "orders.created"
```

The second publish is the point: between `user rm --revoke` and the
push, the revocation exists only in your local store, so the revoked
creds still connect and publish. The final publish shows the other half
of the mechanic: revocation pins the old user's public key, so the
re-issued `order-svc` — a new key under the same name — connects fine
after the next push.

## Bearer tokens

Check 1, the nonce signature, has one exception. A user can be
marked as a **bearer** user; its JWT then connects with no seed and no
nonce signature, so anyone holding the JWT can connect. Accounts disallow
this by default (`Bearer Tokens Allowed: false` in the account listing).
To use it, allow bearer tokens on the account (`--bearer` on
`nats auth account add` or `account edit`) and mark the user (`--bearer`
on `nats auth user add`). It's a convenience for browser and websocket
clients that have nowhere safe to keep a seed, and it reduces the
credential to a single document that must never leak. A non-bearer JWT
presented alone is still rejected with `Authorization Violation`. Try
both with the creds you already have:

<div class="nats-example" data-type="learn-security-decentralized-auth-bearer-token" data-languages="cli"></div>

```
nats: error: nats: Authorization Violation
...
       Bearer Token: true
...
nats: error: nats: Authorization Violation
...
  Bearer Tokens Allowed: true
...
18:05:09 Published 62 bytes to "orders.created"
```

Both rejections print the same `Authorization Violation`: the first
because a non-bearer JWT arrives with no nonce signature, the second
because the account still disallows bearer tokens. Only after the
account-level allow is pushed does the JWT connect on its own.

## Multiple Operators

The nats-server supports having multiple operators configured.  They are
equivalent, and the namespace of accounts is flat across all operators.
If you need to rotate operators (operator key compromised) then it is
technically possible to rotate by adopting existing accounts into the new
operator and migrating gradually.

It is not easy and there are no current affordances in the tooling to assist
with such a migration.

Use operator signing keys and keep at least one off-line, and only keep one
operator signing key exposed to risk.  Then you can manage a migration between
the signing keys of the existing operator instead of between operators.  There
still aren't many helpers for this, at this time.

## Pitfalls

Four things commonly catch teams new to decentralized authentication.

**Losing the operator seed.** The operator's seed is the only thing that
can sign accounts. Lose it and you can't add or re-sign an account; the
tooling has nothing to sign with. Back the operator up before you build
anything on top of it: `nats auth operator backup ACME acme-operator.backup`
writes a portable backup file — a JSON document holding the operator's
keys and JWTs, so an unencrypted backup contains the operator seed in
cleartext — and `--key` encrypts it with a curve NKey (pass a file
containing the key). Restore it with
`nats auth operator restore ACME acme-operator.backup`. Store the file
offline.

**Pasting a seed where a public key belongs.** Server config and JWT
fields only ever take public NKeys (`O...`, `A...`, `U...`). If you paste
a seed (`S...`) into a config, a chat message, or a log, you've handed out
the one secret that must stay private, and the only fix is to rotate the
key. Treat every `S`-prefixed string like a password.

**Signing users with the account's identity key.** This is what plain
`nats auth user add` does, and it works — but permissions then live on
each user, and whoever holds the account's seed can issue a user with any
permissions. A scoped key pins the permissions up front, so a leaked
signing key can only issue users with the scope you already chose (see
[ADR-14](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-14.md)).
One operational limit to know: the CLI has no command to edit a scope
in place, so the only way to change one is to remove its key
(`nats auth account keys rm --key` takes the role name or the public
key) and re-add the role. That creates a new key,
and every user signed by the old one is locked out at the next push with
`nats: Authorization Violation`. Treat key removal as mass revocation, not
as an edit.

**Not planning for credential expiry.** A user JWT minted by
`nats auth user add` never expires, so a leaked creds file is valid until
you revoke it. The only expiry control in v0.4.0 is on the credentials
file: `nats auth user credential order-svc.creds order-svc ORDERS --expire 720h -f`
mints a fresh user JWT that lapses after 720 hours; there's no expiry flag
on `user add` or `user edit`. Pair a short expiry with a renewal step,
because a lapsed client is rejected with plain `Authorization Violation`.
The server's default log records only an `authentication error`; the
underlying reason, `claim is expired`, appears in its debug log.

## Where you are

The `ACME` setup from the previous page is unchanged; this page layered
the model onto it and tightened `order-svc`:

- The server trusts one operator JWT and verifies three signatures per
  connection: the nonce, the user JWT, and the account JWT.
- `order-svc` is re-issued from the `order-writer` scoped key: publish
  limited to `orders.>`, subscribe to `_INBOX.>`, matching its config-mode
  permissions.
- Its creds file expires in 720 hours, and the old unrestricted user key
  is revoked.
- `analytics-reader` is still a plain user of `ANALYTICS`, not signed by
  a scoped key.

## What's next

Both authentication styles so far have the server decide from something
it holds: a user list in its config, or a trust chain in JWTs. Sometimes
the data that decides who may connect lives in a system NATS can't read,
and the next page hands the decision to a service you run.

Continue to [Auth callout](/learn/security/auth-callout).

## See also

- [Reference → operator](/reference/config/operator) — the config field
  that embeds the operator JWT.
- [Core Concepts → Security](/concepts/security) — the five-minute
  overview of the same trust model.
- [Operator mode](/learn/security/operator-mode) — the hands-on build
  this page explains.
- [ADR-14](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-14.md)
  — issuing user JWTs under scoped signing keys, and why scoped keys
  limit the blast radius of a leaked key.
