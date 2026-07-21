---
id: authorization
title: "Authorization"
sidebar_position: 3
description: Subject permissions, allow and deny lists, and the rule that an allow-list closes everything else
---

# Authorization

By the end of [Authentication
basics](/learn/security/authentication-basics), `order-svc` and
`analytics-reader` can prove who they are. The server checks their
authentication data (e.g., passwords) and admits the connections.

That's authentication: the server knows _who_ each connection is, but
nothing limits _what_ it can do. Right now `order-svc` can publish to any
subject on the server and subscribe to any subject.

This page adds those limits. Authorization is what a user may do, and
in NATS that's always expressed as a set of subjects.

## Permissions are about subjects

A **permission** is a grant to publish to, or subscribe to, a set of
subjects. There's no separate notion of an admin
role or a resource type. Every right a user has is a subject it may
publish to or a subject it may subscribe to.

This follows from how NATS works. Everything a client does travels
over a subject: a publish names a subject, a subscribe names a subject,
and a request/reply is a publish plus a subscribe on a reply subject.
Because of that, controlling the subjects controls everything the user
can reach.

So a user's authorization is two lists: the subjects it may publish
to, and the subjects it may subscribe to. The two are independent. A
user can be allowed to publish to a subject it can't subscribe to, or
the reverse.

Permissions use the same subject wildcards you already know from
[Core Concepts → Subjects](/concepts/subjects). `*` matches one token;
`>` matches one or more trailing tokens. `orders.>` covers
`orders.created`, `orders.shipped`, and `orders.canceled`, all in one grant.
(Here, using `orders.*` would work equally well, but would not match a subject
such as `orders.at.northpole`, where `orders.>` does match it.)

## Restricting order-svc

`order-svc` exists to publish order events: `orders.created`,
`orders.shipped`, and `orders.canceled`. It also makes the occasional
request — a lookup before confirming an order — and a request needs a
reply, which arrives on a temporary inbox subject under `_INBOX.`.
That's its whole footprint: publish under `orders.`, subscribe to its
own inboxes.

In the config from [Authentication
basics](/learn/security/authentication-basics), `order-svc` was a bare
user with a password. Now it gets a `permissions` block:

```conf
authorization {
  users: [
    {
      user: order-svc
      password: s3cr3t
      permissions: {
        publish: {
          allow: ["orders.>"]
        }
        subscribe: {
          allow: ["_INBOX.>"]
        }
      }
    }
    {user: analytics-reader, password: an4lytics}
  ]
}
```

The `publish` permission has an `allow` list with one entry,
`orders.>`. `order-svc` may publish to any subject under `orders.`.

The `subscribe` permission allows `_INBOX.>`, the prefix where request
replies arrive. Allowing the prefix lets
`order-svc` receive replies and nothing else. (The inbox prefix is
configurable, but `_INBOX.` is the default.)

`analytics-reader` has no `permissions` block, so it stays
unrestricted for now. The next section explains why that's the rule.

## An allow-list closes everything else

The moment you write an `allow` list, every subject not on it is
denied.

So `publish: { allow: ["orders.>"] }` grants `orders.>` and at the same
time denies everything else, from `billing.charge` to the JetStream API
under `$JS.API.>`.

This is why a permission with no `allow` and no `deny` means
unrestricted. That's `analytics-reader` right now: a user with no
`permissions` block can do anything on the server.

One warning: an empty allow list is not a lock-down. `publish: []`
parses as no list at all, so the user can publish anywhere. To block
all publishes, write `publish: { deny: [">"] }`.

There's also a fallback for users you haven't scoped yet. A
`default_permissions` block inside `authorization {}` applies to every
user that has no `permissions` block of its own. A user with its own
block ignores the defaults entirely — the two are never merged. The
fields are in [Reference →
default_permissions](/reference/config/authorization/default_permissions).

Authorization is opt-in: you opt in by writing an `allow` list.

## Deny beats allow

Sometimes you want "all of `orders.>`, except one subject." You could
craft a precise allow-list that enumerates everything but the
exception, but that's brittle. Instead you allow the broad pattern and
deny the exception:

```conf
publish: {
  allow: ["orders.>"]
  deny: ["orders.secret"]
}
```

When a subject matches both lists, deny wins. The server checks
`allow` first, then checks `deny`, and a match in `deny` overrides the
allow. With this block `order-svc` could publish `orders.created` and
`orders.shipped` but never `orders.secret`, even though the wildcard
covers it.

You rarely need both lists, but when you do, an explicit deny is what
the server applies last.

## Observing a denial

Restart the server with the config above and connect as `order-svc`. A
publish to `orders.created` is on the allow-list and goes through. A
publish to `billing.charge` isn't on the allow-list, so the server
rejects it.

<div class="nats-example" data-type="learn-security-authorization-denied" data-languages="cli"></div>

```
14:19:45 Published 91 bytes to "orders.created"
nats: error: nats: permissions violation: Permissions Violation for Publish to "billing.charge"
```

The first publish reports its 91 bytes delivered and exits 0. The
second exits 1 with the error above. On the wire, the server's raw
protocol message is `-ERR 'Permissions Violation for Publish to
"billing.charge"'`; the CLI wraps it in its own prefix.

The rejection is reported, not silent. The server sends the client an
error and, for a publish, drops the message. The error is asynchronous
and the connection stays open, so the client can keep working. Clients
surface it differently: some log it, some raise it on the next
operation, and some expose it through an async error handler.

One shape of denial does look silent: a denied request. A request is a
pairing of publish with a reply "inbox" subscribe;
so when the publish is denied, no responder ever sees it and
the requester just times out waiting for the expected reply.
Every JetStream API call is a request
under the hood, so a locked-down user running `nats stream info` fails
with `context deadline exceeded` rather than a permission error. When a
request times out for no clear reason, check the server log — every
violation is recorded there:

```
[ERR] 127.0.0.1:57456 - cid:6 - "v1.51.0:go:NATS CLI Version v0.4.0" - "$G/user:order-svc" - Publish Violation - Subject "billing.charge"
```

The log line names the user — still in the global account `$G` — and
the subject, which is usually all you need to find the missing grant.

## The same model under decentralized auth

Later in this chapter the same `allow` and `deny` lists move out of the
config file and into signed JWTs — that's [Decentralized
authentication](/learn/security/decentralized-auth). There you edit the
lists with the `nats auth` CLI instead of a text editor:

```bash
nats auth user edit order-svc ORDERS --pub-allow "orders.>"
```

One caveat to remember when you get there: each flag replaces that
entire list, so always pass the complete set of subjects. And with
scoped signing keys — the recommended setup — the user's JWT carries
empty publish and subscribe lists, and the permissions live in the
account's signing-key scope instead. The server enforces the same two
rules either way.

## What we're leaving out

Three related grants belong to authorization but aren't needed to scope
`order-svc`, so we name them and move on.

- **Response permissions** (`allow_responses`) — let a service reply to
  requests without a broad publish allow; the server tracks each reply
  subject it handed out and permits exactly that one reply. Used once a
  request/reply service exists.
- **Queue-group permissions** — scope a subscription to a named queue
  group. A subscribe entry of the form `"orders.created billing-workers"`
  permits subscribing to `orders.created` only as a member of the
  `billing-workers` queue group; a plain subscribe to the same subject
  stays denied. The matching rules are in [Reference →
  permissions](/reference/config/authorization/users/permissions).
- **Import and export permissions** — govern subjects shared across
  account boundaries. Those are a property of an account, not a user,
  and the [Cross-account](/learn/security/cross-account) page covers
  them once accounts exist.

The full set of permission fields is documented in [Reference →
permissions](/reference/config/authorization/users/permissions). We use
only `publish`, `subscribe`, `allow`, and `deny` here.

## Pitfalls

Four failures cover most of the ways the two rules above go wrong.

**A subscribe deny silently breaks request-reply.** A request needs a
reply, and the reply lands on a temporary inbox subject the client
subscribes to before it publishes. A user with
`subscribe: { deny: [">"] }` can never create that subscription, so the
reply has nowhere to go. Adding `allow: ["_INBOX.>"]` next to the deny
doesn't help — deny beats allow, and the violation persists. The fix is
to replace the deny with the allow, which is exactly what `order-svc`'s
config on this page does.

<div class="nats-example" data-type="learn-security-authorization-inbox-timeout" data-languages="cli"></div>

```
14:20:30 Sending request on "orders.lookup"
```

In the broken state that first line is all the CLI prints: it waits out
its timeout and exits 0, with no error at all. The denial shows up only
in the server log, as `Subscription Violation - Subject
"_INBOX.<random>", SID 1`. Client libraries surface it more clearly:
they raise a timeout error on the request. After the subscribe section is replaced with
`allow: ["_INBOX.>"]` and a responder is listening, the same request
completes:

```
14:20:11 Sending request on "orders.lookup"
14:20:11 Received with rtt 652µs
{"order_id":"ord_8w2k","status":"shipped"}
```

The same problem exists in the other direction: a service that answers
requests must be able to *publish* to the reply subject it was handed.
`allow_responses`, named above, is the clean way to grant that.

**An allow-list that forgets a needed subject closes it off too.**
Because an `allow` list denies everything not on it, a missing entry is
a silent block, not a warning. The day `order-svc` needs to publish
`orders.refunded`, a `publish: { allow: ["orders.>"] }` already covers
it, but a narrower `allow: ["orders.created", "orders.shipped"]` would
reject it with a `Permissions Violation` and no other signal. Prefer
the wildcard that matches the user's real subject space over an
enumerated list you must remember to grow.

**An over-broad `>` grants every subject on the server.** Granting
`publish: { allow: [">"] }` or `subscribe: { allow: [">"] }` to save
typing gives the user every subject, including, when JetStream is on,
the `$JS.API.>` control plane. That's the same "no permissions means
anything" gap from earlier, written out explicitly. Scope each user to
the subject prefix it actually uses: `orders.>` for `order-svc`, never
`>`.

**A deny can be invisible under a wildcard subscription.** A literal
subscribe to a denied subject is rejected loudly: under
`subscribe: { allow: ["orders.>"], deny: ["orders.audit.>"] }`, a
`nats sub orders.audit.entry` fails with `Permissions Violation for
Subscription to "orders.audit.entry"`. But a wildcard subscription that
merely overlaps the deny is accepted, and the server filters the denied
subjects out at delivery time. The same user subscribed to `orders.>`
receives `orders.created` and `orders.shipped` but never
`orders.audit.entry` — no error, no gap marker. If a subscriber seems
to miss messages, check its deny lists before suspecting the publisher.

<div class="nats-example" data-type="learn-security-authorization-wildcard-deny-filter" data-languages="cli"></div>

```
18:02:37 Subscribing on orders.audit.entry
nats: error: nats: permissions violation: Permissions Violation for Subscription to "orders.audit.entry"
```

The literal subscribe exits 1 with the violation above. The wildcard
subscribe is accepted, and with both subjects published while it runs,
only one message arrives:

```
18:02:45 Subscribing on orders.>
[#1] Received on "orders.created"
{"order_id":"ord_8w2k","status":"created"}
```

The publish to `orders.audit.entry` reports success, but the server
drops it at delivery: no client error, and — unlike the literal
subscribe — no violation line in the server log either.

## Where you are

`order-svc` is now scoped to exactly what it does:

- It may publish to `orders.>` and subscribe to `_INBOX.>`, nothing
  else.
- A publish to any other subject returns a `Permissions Violation` and
  is dropped.
- `analytics-reader` is still unrestricted, and both users still share
  one subject space: the global account `$G`.

You also have the two rules that govern every permission you'll ever
write: an `allow` list closes everything else off, and `deny` beats
`allow` on overlap. The same model applies whether the lists live in
config or in a JWT.

## What's next

`order-svc` is scoped, but both users still operate in one shared
subject space — anything one can reach, an unrestricted user can reach
too. The next page gives each service its own account, with a subject
space nobody else can see into.

Continue to [Accounts &
multitenancy](/learn/security/accounts-and-multitenancy).

## See also

- [Reference →
  permissions](/reference/config/authorization/users/permissions) —
  every permission field and its defaults.
- [Reference →
  default_permissions](/reference/config/authorization/default_permissions)
  — fallback permissions for users without their own block.
- [Core Concepts → Subjects](/concepts/subjects) — the wildcard rules
  that permissions are built on.
- [Accounts &
  multitenancy](/learn/security/accounts-and-multitenancy) — giving
  each user its own subject space.
