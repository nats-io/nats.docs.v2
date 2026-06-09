---
id: accounts-and-multitenancy
title: "1. Accounts & Multitenancy"
sidebar_position: 2
description: How an account isolates a tenant's subject space, and the two accounts every server already has
---

# 1. Accounts & Multitenancy

The order platform from the JetStream chapter has more than one team
reading from it. The order service publishes the orders. A separate
analytics team wants to count shipments. They run different code, they
have different owners, and they should not be able to read each other's
private traffic.

A single flat subject space cannot express that. Every connection on a
plain server sees every subject. This page introduces the wall that
separates them.

## What an account is

An **account** is an isolated tenant with its own subject space.

Two accounts on the same server never see each other's traffic. A
publish inside account `ORDERS` reaches subscribers in `ORDERS` and
nobody else. The subject `orders.shipped` in `ORDERS` and a subject
`orders.shipped` in another account are two different subjects that
happen to share a name.

This is stronger than permissions, which we cover later in the chapter.
Permissions narrow what one user may do inside its account. An account
boundary is absolute: the message simply does not cross.

The order platform needs two of these tenants:

- `ORDERS` — the order service's account. Its user publishes `orders.>`.
- `ANALYTICS` — a read-only account. Its user wants `orders.shipped`.

We build both in a minimal config file now. Sharing one subject across
the boundary comes later, on the [Cross-Account](/learn/security/cross-account)
page; until then the two accounts are fully sealed off.

## The two accounts you already have

Before adding any of your own, a NATS server already runs two accounts.
They have reserved names that begin with `$`.

The first is **`$G`**, the global account. Every connection on a server
with no `accounts` block lands in `$G`. The single flat subject space
you started with is not the absence of accounts — it is one account
named `$G` holding everything.

The second is **`$SYS`**, the system account. The server publishes its
own monitoring and management events here, on subjects like
`$SYS.SERVER.>`. Ordinary accounts cannot read or publish those
subjects. Keeping server internals in their own account is why a tenant
never accidentally sees another tenant's connection events.

Both accounts are created for you. You do not declare `$G` or `$SYS` to
get them, and you avoid the `$` prefix when you name your own accounts.

The full set of system-account subjects and events is documented in
[Reference](/reference/). We use only the two account names here.

## A minimal two-account config

A NATS server reads its configuration from a `nats.conf` file. To
declare accounts, you add a top-level `accounts` block. Each entry names
an account and lists the users that belong to it.

Here is the smallest config that gives the order platform its two
tenants. Save it as `nats.conf`:

```conf
accounts {
  ORDERS {
    users = [
      { user: "order-svc", password: "s3cret" }
    ]
  }
  ANALYTICS {
    users = [
      { user: "analytics-reader", password: "an4lytics" }
    ]
  }
}
```

Three things are happening in that block.

Each named entry — `ORDERS`, `ANALYTICS` — is one account. The name is
the tenant's identity. It appears in cross-account permissions later and in
the server's own logs.

Inside each account, `users` lists who may connect as that tenant. A
**user** is an authentication identity. The user `order-svc` belongs to
`ORDERS`; the user `analytics-reader` belongs to `ANALYTICS`. A user
lives in exactly one account, and connecting as that user places the
**client** — the connecting application — inside that account's subject
space.

The `user` and `password` fields are one way to prove who you are. They
are the simplest credential, and the only one we need to demonstrate
isolation. The full range of credential types is the subject of the next
page, [Authentication Basics](/learn/security/authentication-basics);
treat the passwords here as placeholders.

Start the server with this config:

```bash
nats-server -c nats.conf
```

The `-c` flag points the server at the file. Because the config defines
an `accounts` block, the server no longer puts connections in `$G` by
default — every client must now name a user that exists in one of the two
accounts.

## Watching the wall hold

Now prove the boundary. The order service connects as `order-svc` and
publishes a shipment. The analytics reader connects as `analytics-reader`
and subscribes to the same subject string. Because the two users live in
different accounts, the message never arrives.

<div class="nats-example" data-type="learn-security-accounts-and-multitenancy-isolation" data-languages="cli,js,go,python,java,rust,csharp"></div>

The subscriber in `ANALYTICS` sits on `orders.shipped` and hears
nothing. The publish from `ORDERS` lands only on `orders.shipped`
inside `ORDERS`. Same subject name, two separate subject spaces, no
delivery across them.

To see the message actually flow, subscribe inside the publisher's own
account. A second `order-svc` subscription on `orders.shipped` receives
the message immediately, because both sides are now in `ORDERS`. The
boundary is the account, not the subject.

This is the isolation guarantee in one experiment: identical subject,
different accounts, no crossing. Letting exactly one subject through —
deliberately — is what the [Cross-Account](/learn/security/cross-account)
page is for.

## What we are not configuring yet

An account can carry more than a user list. Two capabilities are worth
naming now so you know they exist, even though this page leaves them
out.

An account can set **limits** — how many connections it allows, how much
JetStream storage it may use. Those limits, and the server events that
report on them, belong with operations; we point to
[Reference](/reference/) for the field list rather than tour them here.

An account can also **export** a subject for another account to
**import**. That is the one deliberate hole in the wall, and it has its
own page later in the chapter.

The full set of account configuration options is documented in
[Reference](/reference/). We use only `users` here.

## Pitfalls

A few account mistakes only surface in production. Each one is easy to
avoid once you know it is there.

**`no_auth_user` quietly reopens the door.** Setting `no_auth_user`
admits unauthenticated clients as the named user, placing them in that
user's account. Point it at a user in `$G` and every anonymous client
lands in the global account again, undoing the wall you just built. Do
name a deliberately narrow user, and do not point it at a wide-open
account. The server also rejects `no_auth_user` together with a trusted
operator, so it never applies in operator mode.

**Forgetting a reachable system account.** Define your own `accounts`
block and the server still creates `$SYS`, but with no user inside it you
cannot connect there. The server's monitoring and management events on
`$SYS.SERVER.>` become unreachable, so `nats server account info` and
event tooling go dark. Do declare a `SYS` account with a user and set
`system_account: SYS`. The example below proves a tenant user sees only
its own account while the system-account user reaches the server events:

<div class="nats-example" data-type="learn-security-accounts-and-multitenancy-system-account-reachable" data-languages="cli,js,go,python,java,rust,csharp"></div>

The `order-svc` connection reports only the `ORDERS` account. The
`sys-admin` connection reads `SYS` and the live `$SYS.SERVER.>` stream
that ordinary tenants can never touch.

**Assuming a shared subject name means shared delivery.** Two accounts
can both use `orders.shipped` and still never exchange a message — the
name is shared, the subject space is not. Do not reach for a matching
name to connect tenants. Letting one subject cross the boundary is a
deliberate act covered on the
[Cross-Account](/learn/security/cross-account) page.

## Where you are

Your `nats.conf` now defines two isolated tenants:

- `ORDERS`, holding the user `order-svc`.
- `ANALYTICS`, holding the user `analytics-reader`.
- Plus `$G` and `$SYS`, which the server always provides.

A publish in one account does not reach the other. You proved it: the
same subject name in two accounts is two different subjects, and nothing
crosses the boundary on its own.

## What is next

The accounts exist, but the passwords above are placeholders. The next
page, [Authentication Basics](/learn/security/authentication-basics),
covers how `order-svc` actually proves who it is — user and password,
token, or nkey — all from the same config file.

## See also

- [Core Concepts → Security](/concepts/security) — the five-minute
  overview of accounts, users, and the trust model.
- [Cross-Account](/learn/security/cross-account) — how to let exactly
  one subject through the wall on purpose.
