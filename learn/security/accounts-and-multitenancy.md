---
id: accounts-and-multitenancy
title: "Accounts and multitenancy"
sidebar_position: 4
description: How an account isolates a tenant's subject space, and the two accounts every server already has
---

# Accounts and multitenancy

By the end of the previous page, `order-svc` and `analytics-reader` are
top-level users in the config. `order-svc` may publish `orders.>` and
subscribe to `_INBOX.>`, and nothing else; `analytics-reader` is still
unrestricted. Both live in one shared subject space.

That's a problem for the order platform. The order service and the
analytics team run different code, have different owners, and shouldn't
be able to read each other's private traffic. You could keep them
separated with ever-longer permission lists, but every new subject
means another edit to somebody's allow list. This page separates them
structurally instead: it gives each team its own account.

## What an account is

An **account** is an isolated tenant with its own subject space.

Two accounts on the same server never see each other's traffic. A
publish inside account `ORDERS` reaches subscribers in `ORDERS` and
nobody else. The subject `orders.shipped` in `ORDERS` and a subject
`orders.shipped` in another account are two different subjects that
happen to share the same user-visible name.

This is stronger than the permissions the
[previous page](/learn/security/authorization) built. Permissions
narrow what one user may do inside its account. An account boundary is
absolute: the message doesn't cross it.

The order platform needs two of these tenants:

- `ORDERS`: the order service's account. Its user publishes `orders.>`.
- `ANALYTICS`: a read-only account. Its user wants `orders.shipped`.

We build both now. Sharing one subject across the boundary comes later,
on the [Cross-account](/learn/security/cross-account) page; until then
the two accounts are fully isolated.

<div class="nats-flow" data-scenario="accountIsolationAnimated" data-width="600" data-height="380"></div>

Both subscribers in the animation ask for the identical subject string,
`orders.shipped`, but only the one inside `ORDERS` receives the
publish. `analytics-reader` never hears about it.

## The two accounts you already have

Before adding any of your own, a NATS server already runs two accounts.

The first is **`$G`**, the global account. Every connection on a server
with no `accounts` block lands in `$G` — including the two users you
built on the last two pages. The single flat subject space you started
with is one account named `$G` that holds everything, rather than an
absence of accounts.

The second is **`$SYS`**, the system account. The server publishes its
own monitoring and management events here, on subjects like
`$SYS.SERVER.>`. Those subjects aren't blocked for other accounts —
they live in the system account's subject space, so a subscription to
them from an ordinary account is accepted and never receives
anything. The responders exist only inside the system account.

Both accounts are created for you, and only `$G` is a reserved name:
declaring your own account called `$G` is a config error. You can
declare `$SYS` yourself — an account with that name automatically
becomes the system account — but it's clearer to avoid the `$` prefix
for your own account names.  You can rename the system account using
the `system_account` configuration top-level directive.

The full set of system-account subjects and events is documented in
[Reference](/reference/system). We use only the two account names here.

## A minimal two-account config

To declare accounts, you add a top-level `accounts` block to the
`nats.conf` you've been editing since
[Authentication basics](/learn/security/authentication-basics). It
takes over from the top-level `authorization` block: the users move
inside the accounts they belong to, and `order-svc` carries the
permissions the previous page gave it. Delete the old `authorization`
block once the users have moved — users left there stay in `$G`.

```conf
accounts {
  ORDERS: {
    jetstream: enabled
    users: [
      {
        user: order-svc
        password: s3cr3t
        permissions: {
          publish: { allow: ["orders.>"] }
          subscribe: { allow: ["_INBOX.>"] }
        }
      }
    ]
  }
  ANALYTICS: {
    users: [
      { user: analytics-reader, password: an4lytics }
    ]
  }
}
```

Each named first-level entry (`ORDERS`, `ANALYTICS`) is one account.
The name is the tenant's identity. It appears in
[cross-account](/learn/security/cross-account) sharing later and in the
server's own logs.

Inside each account, `users` lists who may connect as that tenant. A
user lives in exactly one account, and connecting as that user places
the client inside that account's subject space. Because the username is
what selects the account, it must be unique across all accounts — a
duplicate is a startup error: `Duplicate user "order-svc" detected`.
The entries themselves are the same shape as before: user and password
here, and an NKey user drops into the same list.

`order-svc`'s permissions block is unchanged from the previous page.
The subjects it names now resolve inside `ORDERS`: the allow list
scopes the user within its account, and the account isolates it from
everyone else.

The one new field is
[`jetstream: enabled`](/reference/config/accounts/jetstream). On a server that runs
JetStream, declaring an `accounts` block makes JetStream opt-in per
account: an account without the field gets
`JetStream not enabled for account (10039)` on every JetStream call.
This line lets `order-svc` keep using streams; `ANALYTICS` doesn't need
one. Each account gets its own JetStream store, though — a stream
created back in `$G` before the accounts existed doesn't follow
`order-svc` into `ORDERS`, so recreate the `ORDERS` stream inside the
account if you want the JetStream chapter's setup here.

Start the server with this config:

```sh
nats-server -c nats.conf
```

Because the config defines tenant accounts, connections no longer land
in `$G` by default. Every client must now name a user that exists in
one of the two accounts; an unauthenticated connect is rejected:

```sh
nats pub orders.shipped 'hi'
```

```text
nats: error: nats: Authorization Violation
```

One caveat: the lockdown comes from the tenant accounts, not from the
`accounts` block itself. A config whose only account is the system
account still admits unauthenticated clients into `$G`.

## Verifying the account boundary

Now prove the boundary. The order service connects as `order-svc` and
publishes a shipment. The analytics reader connects as
`analytics-reader` and subscribes to the same subject string. Because
the two users live in different accounts, the message never arrives.

<div class="nats-example" data-type="learn-security-accounts-and-multitenancy-isolation" data-languages="cli"></div>

```text
14:20:15 Subscribing on orders.shipped
14:20:16 Published 91 bytes to "orders.shipped"
```

The publish succeeds — 91 bytes accepted on `orders.shipped` — and the
subscriber in `ANALYTICS` prints nothing beyond its own
`Subscribing on` line. The publish from `ORDERS` lands only on
`orders.shipped` inside `ORDERS`.

The snippet's last step is the positive control: publish the same
payload as `analytics-reader`, and the subscriber from step one
receives it immediately, because both sides are now in `ANALYTICS`:

```text
[#1] Received on "orders.shipped"
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}
```

The control runs inside `ANALYTICS` rather than `ORDERS` because
`order-svc`'s own subscribe allow list only covers `_INBOX.>` — a
control subscription as `order-svc` would be rejected with
`Permissions Violation for Subscription to "orders.shipped"`.

Isolation also shows up differently on requests, and the snippet's
final step demonstrates it: with the `ANALYTICS` subscriber still on
`orders.shipped`, `order-svc` sends a request to the same subject:

```text
14:20:18 Sending request on "orders.shipped"
14:20:18 No responders are available
```

The request comes back immediately with `No responders are available`,
not a permissions error: the only subscriber on that name lives in
`ANALYTICS`, so inside `ORDERS` the subject has no responders. When a
request that "should" work reports no responders, check which account
each side is in.

Letting exactly one subject through, deliberately, is what the
[Cross-account](/learn/security/cross-account) page is for.

## What we aren't configuring yet

An account can carry more than a user list. Two capabilities are worth
naming now so you know they exist, even though this page leaves them
out.

An account can set **limits**: how many connections it allows, how much
JetStream storage it may use. Those limits, and the server events that
report on them, belong with operations; we point to
[Reference](/reference/config/accounts/limits) for the field list
rather than enumerate them here.

An account can also **export** a subject for another account to
**import**. That's the one deliberate way to let a subject cross the
boundary, and the [Cross-account](/learn/security/cross-account) page
covers it.

The full set of account configuration options is documented in
[Reference](/reference/config/accounts). We use only `users` and
`jetstream` here.

## Pitfalls

A few account mistakes only surface in production.

**`no_auth_user` can reopen access you intended to close.** Setting
[`no_auth_user`](/reference/config/no_auth_user) admits unauthenticated
clients as the named user, placing them in that user's account. Point
it at a user in `$G` and every anonymous client lands in the global
account again, undoing the isolation you just built. Do name a
deliberately narrow user, and don't point it at a wide-open account.
Two operational traps come with it. The setting can't be introduced or
changed by a config reload: the reload fails with
`config reload not supported for NoAuthUser` and the old config stays
active, so plan a restart. And `nats-server -t` doesn't catch a
`no_auth_user` that names a missing user; that error only appears at
startup. The server also rejects `no_auth_user` together with a trusted
operator, so it never applies in operator mode.

**The system account has no user, so server events are unreachable.**
Define your own `accounts`
block and the server still creates `$SYS`, but with no user inside it
you can't connect there. The server's monitoring and management events
on `$SYS.SERVER.>` become unreachable, so `nats server account info`
and event tooling stop working. Do declare a `SYS` account with a user
and set [`system_account: SYS`](/reference/config/system_account) —
this addition to the config above stays for the rest of the chapter's
config-mode pages:

```conf
accounts {
  # ORDERS and ANALYTICS unchanged
  SYS: {
    users: [ { user: sys-admin, password: syspass } ]
  }
}
system_account: SYS
```

The example below proves a tenant user
sees only its own account while the system-account user reaches the
server events:

<div class="nats-example" data-type="learn-security-accounts-and-multitenancy-system-account-reachable" data-languages="cli"></div>

```text
                      User: analytics-reader
                   Account: ANALYTICS (ANALYTICS)
            System Account: false
```

`analytics-reader` reports its own account and `System Account: false`;
nothing about other tenants or the server is visible. The `sys-admin`
connection reports `Account: SYS (SYS)` with `System Account: true`,
can query any account with `nats server account info`, and sees live
advisories such as `$SYS.SERVER.ACCOUNT.ANALYTICS.CONNS` as clients
come and go. Running the tenant check as `order-svc` instead prints an
info block with no `Account:` line at all — the CLI asks the server for
it over `$SYS.REQ.USER.INFO`, and `order-svc`'s publish allow list
blocks that request.

**A shared subject name doesn't mean shared delivery.** Two accounts
can both use `orders.shipped` and still never exchange a message. Don't
reach for a matching name to connect tenants. Letting one subject cross
the boundary is a deliberate act covered on the
[Cross-account](/learn/security/cross-account) page.

## Where you are

Your `nats.conf` now defines two isolated tenants:

- `ORDERS`, with `jetstream: enabled`, holding `order-svc` and its
  `orders.>` publish and `_INBOX.>` subscribe permissions.
- `ANALYTICS`, holding the unrestricted user `analytics-reader`.
- A `SYS` account with a user, named as the `system_account`, so server
  events stay reachable.
- Plus `$G` and `$SYS`, which the server always provides.

A publish in one account doesn't reach the other — you proved it with
the isolation check above.

## What's next

`ANALYTICS` exists to count shipments, and right now it can't see one.
The next page lets exactly one subject through: `ORDERS` exports
`orders.shipped`, `ANALYTICS` imports it, and everything else stays
isolated. Continue to
[Cross-account](/learn/security/cross-account).

## See also

- [Reference → accounts](/reference/config/accounts) — every field an
  account entry accepts, including per-account limits and JetStream.
- [Reference → system](/reference/system) — the system-account
  subjects, advisories, and monitoring endpoints.
- [Cross-account](/learn/security/cross-account) — how to let exactly
  one subject cross the account boundary on purpose.
- [Core Concepts → Security](/concepts/security) — the five-minute
  overview of accounts, users, and the trust model.
