---
id: index
title: Security Deep Dive
sidebar_position: 1
description: Authentication, authorization, and encryption, scoped per account and built up step by step
---

# Security Deep Dive

Security in NATS comes down to three questions about every connection:
who are you, what are you allowed to do, and is the wire safe. This
chapter answers each one in turn, then ties them together by securing a
real workload.

The workload is the order platform from the JetStream chapter. It uses
the same `ORDERS` name (now an account, not a stream) and the same
message shape, with access controls in place. The same server runs
across the whole chapter, reconfigured a step at a time.

## The three parts of security

Every page in this chapter belongs to one of three parts.

**Authentication** answers who you are. A connecting application
presents proof of identity (a password, a token, a bearer JWT; or presents a
signature using a secret: mTLS or NKeys (perhaps with non-bearer JWTs)),
and the server decides whether to admit it. The authentication
pages cover this, from [Authentication basics](./authentication-basics)
through [Operator mode](./operator-mode) and
[Decentralized authentication](./decentralized-auth), plus
[Auth callout](./auth-callout).

**Authorization** answers what you're allowed to do. Once admitted, a
user can publish and subscribe only to the subjects you grant it; the
server denies everything else. The [Authorization](./authorization) page
covers this.

**Encryption** answers whether the wire is safe. TLS protects each
connection from eavesdropping and tampering, and a client certificate
can serve as the identity itself. The [Encryption & TLS](./encryption) page
covers this.

## Accounts scope all three

A fourth idea scopes all three: the **account**.

An account is an isolated tenant. Each account has its own users and its
own subject space. Two accounts never see
each other's messages unless you deliberately connect them.
[Accounts and multitenancy](./accounts-and-multitenancy) builds the two
accounts this chapter uses, and [Cross-account](./cross-account)
connects them.

A user authenticates into an account, where permissions decide what it
may do, over a connection that TLS keeps safe.

If your server configuration does not appear to configure accounts, then
you are using the implicit global account (`$G`).

## What you'll have built

By the end of this chapter you'll have secured the order platform two
different ways, both producing the same running system.

- Two accounts, `ORDERS` and `ANALYTICS`, that can't see each other's
  traffic by default.
- A user `order-svc` in `ORDERS` that may publish `orders.>` and nothing
  else, and a user `analytics-reader` in `ANALYTICS` that may read only
  the orders it's shown.
- A deliberate bridge: `ORDERS` exports the subject `orders.shipped`
  and `ANALYTICS` imports it, so analytics sees shipped orders and
  no other order events.
- The same setup rebuilt under an operator named `ACME`, where the
  server trusts the operator's public key instead of a config user list.
- TLS on the client connection, with mutual TLS as the next step up.
- An external `auth-svc` that authenticates clients on the server's
  behalf through an auth callout.

## Who this is for

You've read the [Core Concepts → Security](/concepts/security) primer
or are otherwise comfortable with NATS basics: publishing, subscribing,
and [subjects](/concepts/subjects). This chapter doesn't re-teach those.

It also assumes you know JetStream, since the running scenario is the
same `ORDERS` platform. If you haven't, the
[Core Concepts → JetStream](/concepts/jetstream) primer is enough
background, and the [JetStream deep dive](/learn/jetstream) covers it in
full. You don't need to have built the streams to follow the security
work.

## How to read it

Each page introduces at most two new concepts. The same accounts and
users carry forward, and each page states exactly how the configuration
changes from the last.

Security in NATS has many knobs: cipher suites, every JWT claim, every
resolver type. Where a feature has a long list of options, the page
covers only what you need to understand the concept and links to
[Reference](/reference/) for the rest.

## Map

| Page | What you learn |
|---|---|
| [Authentication basics](./authentication-basics) | Centralized, config-based auth and the credential types |
| [Authorization](./authorization) | Subject permissions: publish and subscribe allow and deny lists |
| [Accounts and multitenancy](./accounts-and-multitenancy) | An account is an isolated tenant; the `$G` and `$SYS` accounts |
| [Cross-account](./cross-account) | Exports and imports that share one subject across tenants |
| [Operator mode](./operator-mode) | The `nats auth` workflow and the account resolver |
| [Decentralized authentication](./decentralized-auth) | The operator, account, and user trust chain, with nkeys and JWTs |
| [Auth callout](./auth-callout) | Delegating the authentication decision to an external service |
| [Encryption & TLS](./encryption) | TLS per connection type, mutual TLS identity mapping, TLS-first handshakes, and encryption at rest |
| [Where to go next](./where-next) | A map of what's beyond this chapter |

## Prerequisites

You'll need:

- A working `nats-server`. The early pages start it with
  `nats-server -c nats.conf`, editing the config file by hand.
- The `nats` CLI installed. The chapter's examples are CLI; the operator
  pages use the `nats auth` commands built into the same `nats` CLI.
  Client libraries take the same credentials on their connect call.

Open a terminal and keep a config file handy. Continue to
[Authentication basics](./authentication-basics).
