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
the same `ORDERS` world and the same message shape, now with access
controls in place.

## The three parts of security

Every page in this chapter belongs to one of three parts. Naming them
up front gives you a place to file each new mechanism as it arrives.

**Authentication** answers _who are you_. A connecting application
presents some proof of identity (a password, a token, an nkey, or a
JWT), and the server decides whether to admit it. Pages 2 through 4 and
page 8 are about authentication.

**Authorization** answers _what may you do_. Once admitted, a user can
publish and subscribe only to the subjects you grant it.
Everything else is denied. Page 5 is about authorization.

**Encryption** answers _is the wire safe_. TLS protects each connection
from eavesdropping and tampering, and a client certificate can even
serve as the identity itself. Page 7 is about encryption.

## Accounts scope all three

The three parts are scoped by a fourth idea that comes first: the
**account**.

An account is an isolated tenant. Each account has its own users, its
own subject space, and its own view of the world. Two accounts never see
each other's messages unless you deliberately connect them. Page 1
builds the two accounts this chapter uses, and page 6 connects them on
purpose.

Put together, the full picture is that a **user** authenticates into an
**account**, where **permissions** decide what it may do, over a
connection that **TLS** keeps safe.

## What you'll have built

By the end of this chapter you'll have secured the order platform two
different ways, both producing the same running system.

- Two accounts, `ORDERS` and `ANALYTICS`, that can't see each other's
  traffic by default.
- A user `order-svc` in `ORDERS` that may publish `orders.>` and nothing
  else, and a user `analytics-reader` in `ANALYTICS` that may read only
  the orders it's shown.
- A deliberate bridge: `ORDERS` **exports** the subject `orders.shipped`
  and `ANALYTICS` **imports** it, so analytics sees shipped orders and
  no other order events.
- The same setup rebuilt under an **operator** named `ACME`, where the
  server trusts a single signing key instead of a config user list.
- TLS on the client connection, with mutual TLS as the next step up.
- An external `auth-svc` that authenticates clients on the server's
  behalf through an auth callout.

## Who this is for

You've read the [Core Concepts → Security](/concepts/security) primer
or are otherwise comfortable with NATS basics: publishing, subscribing,
and subjects. This chapter doesn't re-teach those.

It also assumes you've met JetStream, since the running scenario is the
same `ORDERS` platform. If you haven't, the
[Core Concepts → JetStream](/concepts/jetstream) primer is enough
background, and the [JetStream deep dive](/learn/jetstream) covers it in
full. You don't need to have built the streams to follow the security
work.

## How to read it

Each page introduces at most two new concepts. Pages build on the
previous one: the same accounts and users carry forward, and each
page states exactly how the configuration changes from the last.

Security in NATS has many knobs: cipher suites, every JWT claim, every
resolver type. Where a feature has a long list, the page covers only
what you need to understand the concept and links to
[Reference](/reference/) for the rest.

## Map

| # | Page | What you learn |
|---|---|---|
| 1 | [Accounts & multitenancy](./accounts-and-multitenancy) | An account is an isolated tenant; the `$G` and `$SYS` accounts |
| 2 | [Authentication basics](./authentication-basics) | Centralized, config-based auth and the credential types |
| 3 | [Decentralized authentication](./decentralized-auth) | The operator, account, and user trust chain, with nkeys and JWTs |
| 4 | [Operator mode](./operator-mode) | The `nsc` workflow and the account resolver |
| 5 | [Authorization](./authorization) | Subject permissions: publish and subscribe allow and deny lists |
| 6 | [Cross-account](./cross-account) | Exports and imports that share one subject across tenants |
| 7 | [Encryption & TLS](./encryption) | TLS per connection type and mutual TLS identity mapping |
| 8 | [Auth callout](./auth-callout) | Delegating the authentication decision to an external service |
| 9 | [Where to go next](./where-next) | A map of what's beyond this chapter |

## Prerequisites

You'll need:

- A working `nats-server`. The early pages run it with a config file you
  edit by hand; later pages add `nsc` for operator mode. Both ship with
  the standard NATS tooling.
- The `nats` CLI installed. The first pages use only the CLI to connect
  and check access. Later pages add JavaScript, Go, Python, Java, Rust,
  and C# client examples for connecting with credentials.

Open a terminal and keep a config file handy, then continue to the next
page.

## See also

- [Core Concepts → Security](/concepts/security) — the five-minute
  overview of the same material.
- [Core Concepts → Subjects](/concepts/subjects) — the addressing model
  that permissions are written against.
