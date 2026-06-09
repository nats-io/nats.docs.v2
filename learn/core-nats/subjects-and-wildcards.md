---
id: subjects-and-wildcards
title: "2. Subjects & wildcards"
sidebar_position: 3
description: How NATS addresses messages with dot-delimited subjects, and how subscribers match many of them at once with wildcards
---

# 2. Subjects & wildcards

On the previous page Acme published `orders.created` and three services
subscribed to it. That subject was a flat name. This page gives the
subject some structure and lets a subscriber match a whole family of
them at once.

Acme is opening regional fulfilment. Orders no longer all look the same:
a US order and an EU order need to land somewhere a regional service can
tell them apart. The subject is where that distinction lives.

## A subject is a sequence of tokens

A **subject** is a string the server uses to match publishers to
subscribers. You already used one: `orders.created`.

The `.` (dot) is not decoration. It splits the subject into **tokens**.
`orders.created` is two tokens, `orders` then `created`. The server
treats each token as a separate unit when it matches.

That splitting turns a flat name into a hierarchy. Acme can put the
region in the middle:

```
orders.us.created
orders.eu.created
orders.us.cancelled
orders.eu.cancelled
```

Each of those is three tokens. The first token groups them all under
`orders`. The second token says which region. The third says what
happened. Nothing in the server is configured to know "region" means
anything — the meaning lives entirely in the names Acme chose.

A few rules govern what a token may contain.

Subjects are **case-sensitive**. `Orders.created` and `orders.created`
are two different subjects. A publisher to one will not reach a
subscriber on the other.

Tokens are split by single dots only. Spaces, tabs, and line breaks are
not allowed anywhere in a subject. Stick to letters, digits, `-`, and
`_` inside a token and you will never be surprised.

## Subjects are essentially free

Acme just invented four new subjects without telling the server first.
That is allowed, and it costs almost nothing.

The server keeps an **interest graph** — the in-memory record of which
subjects have subscribers, from the previous page. It only holds an
entry for a subject once something subscribes to it. A subject nobody
listens to has no presence on the server at all.

So you do not declare subjects, allocate them, or clean them up. You
publish to a name and the name exists for as long as that publish takes.
A system can use millions of distinct subjects without the server
slowing down, because matching walks the token tree rather than scanning
every subscription.

This is why subject design is cheap to get right. Put the region in the
subject, put the order ID in the subject if you want — the server does
not charge you per name.

## Wildcards: subscribe to many subjects at once

A publisher always names one full subject. `nats pub` to
`orders.*.created` is not "publish to every region" — it would publish
to the literal subject containing a `*`, which is not what anyone wants.
Wildcards are a **subscriber-only** tool.

A **wildcard** is a token in a subscription that matches more than one
literal subject. NATS has exactly two of them, and they differ in how
many tokens they swallow.

<div class="nats-flow" data-scenario="subjectsWildcardAnimated" data-width="700" data-height="450"></div>

In the animation, the subscriber's pattern matches some published
subjects and not others. The rest of this page is the two rules behind
which is which.

### The single-token wildcard `*`

The **single-token wildcard** `*` matches exactly one token — not zero,
not two.

Acme wants one analytics view of created orders across every region.
Instead of subscribing to `orders.us.created` and `orders.eu.created`
separately, it subscribes once to `orders.*.created`:

<div class="nats-example" data-type="learn-core-nats-subjects-and-wildcards-wildcard-single" data-languages="cli,js,go,python,java,rust,csharp"></div>

The `*` sits in the region position. Walk through what it catches:

- `orders.us.created` — matches. `*` takes the single token `us`.
- `orders.eu.created` — matches. `*` takes the single token `eu`.
- `orders.created` — does **not** match. There is no token in the
  region position; `*` needs exactly one.
- `orders.us.west.created` — does **not** match. Two tokens sit where
  `*` allows only one.

The position of `*` is fixed; the token in it is free. That is the whole
rule. You can also use more than one: `orders.*.*` matches any
three-token subject under `orders`, with both middle and last tokens
free.

### The multi-token wildcard `>`

The **multi-token wildcard** `>` matches one or more tokens, and it must
be the last token in the pattern.

Acme is adding an audit service that wants every order message, at every
depth, regardless of region or action. One subscription covers it:

<div class="nats-example" data-type="learn-core-nats-subjects-and-wildcards-wildcard-multi" data-languages="cli,js,go,python,java,rust,csharp"></div>

`orders.>` reaches the entire hierarchy under `orders`:

- `orders.created` — matches. `>` takes the one token `created`.
- `orders.us.created` — matches. `>` takes the two tokens `us.created`.
- `orders.us.west.created` — matches. `>` takes all three remaining
  tokens.
- `orders` — does **not** match. `>` needs at least one token after the
  prefix.

Because `>` matches a token *and everything after it*, it only makes
sense at the end. `orders.>.created` is invalid and the server will
reject it — there is no way to anchor a tail wildcard in the middle and
still know where it stops.

This is the difference to keep: `*` is a placeholder for one token in a
known shape; `>` is "everything from here down."

## A wildcard subscriber is a real subscriber

A wildcard does not change the delivery model from the last page. It
changes which subjects count as a match, nothing else.

The audit service on `orders.>` is just another interested subscriber.
When Acme publishes `orders.us.created`, every matching subscriber gets
its own copy: the warehouse on `orders.created` does *not* (different
subject now), the regional analytics on `orders.*.created` does, and the
audit service on `orders.>` does. The server fans one publish out to all
of them. Delivery is still at-most-once: a subscriber that is offline
when the message is published does not receive it, and nothing replays
it later.

That "nothing replays it later" is the ceiling of core NATS. A wildcard
lets a service that joins now see everything published *from now on* — it
does not let a service that joins now see what it missed. Capturing the
backlog so a late subscriber can catch up is what
[JetStream](/learn/jetstream) adds.

## Reserved prefixes to stay clear of

Acme can name subjects almost anything. Two prefixes are spoken for.

Subjects beginning with `$` belong to the server and its subsystems —
`$SYS` for system events, `$JS`, `$KV`, and `$SRV` for the JetStream,
Key-Value, and Services subsystems. Do not publish application messages
under `$`.

The `_INBOX` prefix is reserved for reply subjects that clients generate
automatically. You do not pick `_INBOX` names yourself, and you do not
publish business messages there. The next page, on request-reply, shows
exactly what `_INBOX` is for.

Keep Acme's order traffic under `orders.` and these reservations never
come up.

## Try it in two terminals

With `nats-server` running, watch a wildcard catch messages it was never
told about by name:

```bash
# Terminal 1 — the audit service: every order message, any depth
nats sub "orders.>"
```

```bash
# Terminal 2 — publish to two regions and a flat subject
nats pub orders.us.created '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
nats pub orders.eu.created '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
nats pub orders.shipped    '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
```

All three arrive in Terminal 1. Now restart Terminal 1 with
`nats sub "orders.*.created"` and re-run Terminal 2: only the two
`*.created` messages arrive — `orders.shipped` no longer matches.

The wire-level `PUB`/`SUB`/`MSG` protocol is documented in
[Reference → Client protocol](/reference/protocols/client). We only need
the behavior here.

## Pitfalls

A few subject mistakes bite quietly. Here are the ones to watch on this
page.

**`>` only works as the last token.** The multi-token wildcard means
"this token and everything after it," so there is no way to anchor it in
the middle. `orders.>.created` is not a valid subscription pattern, and
the server rejects it rather than guessing where the tail stops. When you
want a free token in the middle and a fixed token at the end, that is the
job of `*`: subscribe to `orders.*.created`, not `orders.>.created`.

**Publishers cannot publish "to a wildcard."** Wildcards are a
subscriber-only tool. A publisher always names one fully-qualified
subject. The trap is that publishing to `orders.*.created` does not fail
loudly — the `*` is taken as a literal character, so the message lands on
the odd subject `orders.*.created` and every regional subscriber misses
it. Publish the real subject (`orders.us.created`); reserve `*` and `>`
for `nats sub` and the subscribe call in your client.

**An over-broad `orders.>` pulls more than you want.** It is tempting to
subscribe to `orders.>` and filter in code, but that subscriber then
receives *every* order message at every depth — shipped, cancelled,
every region, forever. Subscribe to the narrowest pattern that covers
your need: `orders.*.created` for regional new-order analytics, the exact
subject for a single concern. Narrow interest keeps unwanted traffic off
the wire instead of off your CPU.

**Whitespace is never allowed in a subject.** A token may not contain a
space, tab, or line break. The client validates this before sending, so a
typo like a stray space in the region token fails fast with an
invalid-subject error rather than publishing somewhere surprising:

<div class="nats-example" data-type="learn-core-nats-subjects-and-wildcards-invalid-subject-whitespace" data-languages="cli,js,go,python,java,rust,csharp"></div>

(Reserved `$` and `_INBOX` prefixes are the other thing to avoid; see
[Reserved prefixes to stay clear of](#reserved-prefixes-to-stay-clear-of)
above.)

## Where you are

Acme's order traffic now has a shape:

- Orders publish to structured subjects: `orders.created`,
  `orders.us.created`, `orders.eu.created`, and friends.
- Regional analytics subscribes to `orders.*.created` to catch every
  region's new orders with one subscription.
- An audit service subscribes to `orders.>` to catch the whole
  hierarchy.

Subjects address messages; wildcards let one subscriber match a family
of them. That is the addressing layer everything else in core NATS uses.

## What is next

So far every message flows one way: a publisher speaks, subscribers
listen, nobody answers. The next page,
[Request-reply](/learn/core-nats/request-reply), adds a reply path —
Acme builds an inventory service that *answers* a question on
`orders.inventory.check`, using a reserved `_INBOX` subject you just met.

## See also

- [Core Concepts → Subjects](/concepts/subjects) — the short overview of
  tokens and wildcards.
- [Learn → Security](/learn/security) — granting or denying access per
  subject and wildcard.
- [Learn → Super-clusters](/learn/topologies/super-clusters) — how
  subject interest propagates across servers and regions.
