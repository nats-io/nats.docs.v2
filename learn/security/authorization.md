---
id: authorization
title: "Authorization"
sidebar_position: 6
description: Subject permissions, allow and deny lists, and the rule that an allow-list closes everything else
---

# Authorization

By the end of the last page, `order-svc` can prove who it is. The
server admits the connection and lets it onto the `ORDERS` account.

That's authentication: who you are. It says nothing about what you
may do. Right now `order-svc` can publish to any subject in the
account and subscribe to any subject in the account. Authentication
admitted the connection but placed no limits on what it can do once
connected.

This page adds those limits. Authorization is the second part of
security: not who you are, but what you may do. In NATS, what you may
do is always expressed as a set of subjects.

## Permissions are about subjects

A **permission** is a grant to publish to, or subscribe to, a set of
subjects, and that is all it is. There's no separate notion of an admin
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
`orders.created`, `orders.shipped`, and `orders.cancelled` in one
grant, the same wildcard the `ORDERS` stream uses to capture them.

## Restricting order-svc

`order-svc` exists to publish order events. It publishes
`orders.created`, `orders.shipped`, and `orders.cancelled`. It has no
reason to publish anywhere else, and no reason to subscribe to
anything at all.

State that directly. In the centralized config from the authentication
page, `order-svc` was a bare user with a password. Now it gets a
`permissions` block:

```conf
accounts {
  ORDERS: {
    users: [
      {
        user: order-svc
        password: "s3cr3t"
        permissions: {
          publish: {
            allow: ["orders.>"]
          }
          subscribe: {
            deny: [">"]
          }
        }
      }
    ]
  }
}
```

Reading the block top to bottom, here is what each part does.

The `publish` permission has an `allow` list with one entry,
`orders.>`. `order-svc` may publish to any subject under `orders.`.

The `subscribe` permission has a `deny` list with one entry, `>`. That
denies every subject. `order-svc` may not subscribe to anything, which
is correct for a service that only ever publishes.

## An allow-list closes everything else

Here's the rule that makes the `publish` block above safe.

The moment you write an `allow` list, every subject not on it is
denied. Rather than listing the subjects you want to block, you list
the subjects you want to permit, and the absence of a subject from the
list is itself the block.

So `publish: { allow: ["orders.>"] }` grants `orders.>` and at the same
time denies everything else: `billing.charge`, `inventory.adjust`,
`$JS.API.>`, all of it. The single allow entry is a complete publish
permission on its own.

This is why a permission with no `allow` and no `deny` means
unrestricted. There's no allow-list to close things off, and no deny
entry to block anything, so every subject is open. That was
`order-svc` before this page: a user with no `permissions` block can do
anything in its account.

The lesson carries to every user you'll write. Authorization is
opt-in, and the way you opt in is by writing an `allow` list.

## Deny beats allow

The second rule covers the overlap case.

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

Keep the two rules in order. An allow-list closes everything off by
default, and a deny entry then removes a specific subject from what the
allow-list opened. You rarely need both, but when you do, deny is what
the server applies last.

## Observing a denial

Restart the server with the config above and connect as `order-svc`. A
publish to `orders.created` is on the allow-list and goes through. A
publish to `billing.charge` isn't on the allow-list, so the server
rejects it.

<div class="nats-example" data-type="learn-security-authorization-denied" data-languages="cli,js,go,python,java,rust,csharp"></div>

The rejection is reported, not silent. The server sends the client an
error and, for a publish, drops the message. The error names the
subject:

```
Permissions Violation for Publish to "billing.charge"
```

This is a failure mode worth understanding. A denied publish doesn't
crash the client and doesn't come back as a reply; it arrives as a
protocol error on the connection. Clients surface it differently: some
log it, some raise it on the next operation, and some expose it through
an async error handler. When a publish "disappears" with no delivery and
no obvious error, an unmet permission is the first thing to check.

## The same model under decentralized auth

Everything above was written in centralized config, because that's
where `order-svc` lives at this point in the chapter. The permissions
model itself isn't tied to config mode.

Under decentralized authentication, the same `allow` and `deny` lists
live inside the user's JWT instead of the server's config file. You
set them with `nsc` when you create or edit the user:

```bash
nsc edit user --name order-svc --account ORDERS \
  --allow-pub "orders.>" \
  --deny-sub ">"
```

The server enforces them identically. It doesn't matter whether a
permission arrived in a config file or in a signed JWT. By the time
the server evaluates a publish, it's checking the same two lists with
the same deny-beats-allow rule. It's one authorization model with two
ways to deliver it.

## What we are leaving out

Two related grants belong to authorization but aren't needed to scope
`order-svc`, so we name them and move on.

**Response permissions** (`allow_responses`) let a service reply to
requests without granting it a broad publish allow. The server tracks
each reply subject it handed out and permits exactly that one reply.
This is what a request/reply service uses, and we won't apply it until
a service exists to use it.

**Import and export permissions** govern subjects shared across
account boundaries. Those are a property of the account, not the user,
and they get their own page next.

The full set of permission options is documented in
[Reference](/reference/). We use only `publish`, `subscribe`, `allow`,
and `deny` here.

## Pitfalls

The two rules above are exactly where authorization causes problems. Three
failures account for most of them.

**A subscribe deny silently breaks request-reply.** A request needs a reply,
and the reply lands on a temporary inbox subject the client subscribes to
before it publishes. That inbox lives under `_INBOX.` by default (the prefix
is configurable, but the default is what you allow against unless you've
changed it). A user with
`subscribe: { deny: [">"] }`, exactly what `order-svc` has on this page, can
never create that subscription, so the reply has nowhere to go and the request
times out with no responders. To avoid denying a request/reply client its own
inbox, allow `_INBOX.>` on the subscribe side when a user makes requests.

<div class="nats-example" data-type="learn-security-authorization-inbox-timeout" data-languages="cli,js,go,python,java,rust,csharp"></div>

The subscription is rejected with `Permissions Violation for Subscription to
"_INBOX..."`, and the request itself returns a timeout. A pure publisher like
`order-svc` doesn't need this; a service or a requester does. The same problem
applies in the other direction: a service that answers requests must be able to
*publish* to the reply subject it was handed, so a publish `allow` list that
omits those reply subjects leaves the request unanswered. Both pub and sub
permissions have to account for the inbox subjects that request-reply uses.

**An allow-list that forgets a needed subject closes it off too.** Because an
`allow` list denies everything not on it, a missing entry is a silent block,
not a warning. The day `order-svc` needs to publish `orders.refunded`, a
`publish: { allow: ["orders.>"] }` already covers it, but a narrower
`allow: ["orders.created", "orders.shipped"]` would reject it with a
`Permissions Violation` and no other signal. Prefer the wildcard that matches
the user's real subject space over an enumerated list you must remember to grow.

**An over-broad `>` grants the whole account.** Granting
`publish: { allow: [">"] }` or `subscribe: { allow: [">"] }` to save typing
gives the user every subject in the account, including system subjects under
`$SYS.>` and, if JetStream is on, the `$JS.API.>` control plane. That's the
same "no permissions means anything" gap from earlier, written out explicitly.
Scope each user to the subject prefix it actually uses: `orders.>` for
`order-svc`, `orders.shipped` for `analytics-reader`, never `>`.

## Where you are

`order-svc` is now scoped to exactly what it does:

- It may publish to `orders.>` and nothing else.
- It may not subscribe to anything.
- A publish to any other subject returns a `Permissions Violation` and
  is dropped.

You also have the two rules that govern every permission you'll ever
write: an `allow` list closes everything else off, and `deny` beats
`allow` on overlap. The same model applies whether the lists live in
config or in a JWT.

## What's next

`order-svc` is locked down inside the `ORDERS` account. But the
`ANALYTICS` account still needs to read `orders.shipped`, and account
isolation means it can't see `ORDERS` traffic at all. The next page
opens exactly one subject across that boundary, on purpose, with
exports and imports.

Continue to [Cross-Account](/learn/security/cross-account).

## See also

- [Core Concepts → Subjects](/concepts/subjects) — the wildcard rules
  that permissions are built on.
- [Cross-Account](/learn/security/cross-account) — sharing one subject
  across the account wall.
- [Reference](/reference/) — every permission field and its defaults.
