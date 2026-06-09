---
id: cross-account
title: "6. Cross-Account"
sidebar_position: 7
description: How two isolated accounts share exactly one subject, on purpose
---

# 6. Cross-Account

Two accounts cannot see each other's traffic. That is the whole point
of an account: it is a sealed subject space, and `ORDERS` and
`ANALYTICS` are sealed off from one another.

The seal is the right default. It is also, sometimes, in the way.

The order platform has a real need. `ORDERS` publishes
`orders.shipped` every time a box leaves the warehouse. The analytics
team, living in the separate `ANALYTICS` account, wants to count those
shipments. Today they cannot — a subscriber in `ANALYTICS` never sees
a subject published in `ORDERS`.

This page opens exactly one hole in the wall, deliberately, and leaves
everything else sealed.

## Where you are

The scenario so far:

- `ORDERS` holds the user `order-svc`, which publishes `orders.>`.
- `ANALYTICS` holds the user `analytics-reader`, which can subscribe
  inside its own account.
- The two accounts are isolated. `analytics-reader` subscribing to
  `orders.shipped` receives nothing — that subject lives in a
  different account.

We are going to connect those two subjects, and only those two.

## Two halves of one hole

Sharing a subject across the account boundary takes a matching pair of
declarations. One account offers the subject. The other account asks
for it. Both must agree, or nothing crosses.

An **export** is the offer. The owning account names a subject and
marks it as available to other accounts. `ORDERS` exports
`orders.shipped`.

An **import** is the request. The receiving account names the same
subject, names the account that exports it, and pulls it into its own
space. `ANALYTICS` imports `orders.shipped` from `ORDERS`.

Neither half works alone. An export with no matching import shares
nothing — the offer just sits there. An import with no matching export
is refused — there is nothing to receive. The hole exists only where
both line up.

## What kind of export

An export carries a `type`, and the type follows the subject's
messaging pattern. The pattern here is publish/subscribe — `ORDERS`
publishes shipment events, `ANALYTICS` reads them, nothing flows back —
so this is a **stream export**. The exporting account publishes,
importing accounts subscribe, and messages flow one way, from owner to
importer. The owner never learns who is listening. That matches
`orders.shipped` exactly, and it is the type we use for the rest of
this page.

The other type, a **service export**, mirrors the request/reply
pattern instead: a caller asks and an owner answers, so messages flow
both ways. You would reach for it to let `ANALYTICS` call a pricing
lookup that `ORDERS` owns. The order platform has no such need, so we
note the service type only so you can tell the two apart — the
direction of the data is the tell, and [Reference](/reference/) covers
service exports in full.

## Export the subject from ORDERS

The export lives in the `ORDERS` account, in the server's
configuration. You add one entry to the account's `exports` array:

```conf
accounts {
  ORDERS {
    users: [
      { user: order-svc, password: "s3cr3t" }
    ]
    exports: [
      { stream: "orders.shipped" }
    ]
  }
  ANALYTICS {
    users: [
      { user: analytics-reader, password: "an4lytics" }
    ]
  }
}
```

The `stream:` key does two jobs. It declares the export `type` as a
stream, and it names the subject being offered: `orders.shipped`. A
service export would use a `service:` key in the same slot.

With no further options, this is a **public export**. Any account on
the server may import `orders.shipped` — the offer is open. Locking an
export down to named accounts uses an activation token, which we leave
to Reference. The order platform is fine with a public export here.

## Import the subject into ANALYTICS

The export is now on offer. Nobody receives it yet. `ANALYTICS` has to
ask, by adding a matching entry to its own `imports` array:

```conf
accounts {
  ORDERS {
    users: [
      { user: order-svc, password: "s3cr3t" }
    ]
    exports: [
      { stream: "orders.shipped" }
    ]
  }
  ANALYTICS {
    users: [
      { user: analytics-reader, password: "an4lytics" }
    ]
    imports: [
      { stream: { account: ORDERS, subject: "orders.shipped" } }
    ]
  }
}
```

The import names three things. The `stream` key matches the export
type. The `account` field says which account owns the export —
`ORDERS`. The `subject` field is the subject as the exporter publishes
it: `orders.shipped`.

After a server reload, the hole is open. A message published to
`orders.shipped` in `ORDERS` now also appears on `orders.shipped`
inside `ANALYTICS`, and `analytics-reader` can subscribe to it.

The import lands at the same subject name by default. An import may
also rename the subject on the way in — prepend a `prefix:` or remap
with `to:` — so it does not collide with local subjects. The order
platform keeps the name as-is. The full set of import options,
including renaming and subject transforms, is documented in
[Reference](/reference/). We use only `account` and `subject` here.

## See the hole work

Publish a shipment as `order-svc` in `ORDERS`, and subscribe to it as
`analytics-reader` in `ANALYTICS`. The message crosses the boundary
because, and only because, the export and import line up.

<div class="nats-example" data-type="learn-security-cross-account-consume-imported" data-languages="cli,js,go,python,java,rust,csharp"></div>

The publisher does not know an importer exists. `order-svc` publishes
`orders.shipped` exactly as it always has. The subscriber sees a
normal `orders.shipped` message, with no hint it came from another
account. The cross-account plumbing is invisible to both sides — it
lives entirely in the server's account configuration.

## The seal still holds everywhere else

Open one subject; nothing else changes. `analytics-reader` still sees
only `orders.shipped`. It cannot subscribe to `orders.created` or
`orders.cancelled` — those were never exported, so there is no hole
for them.

This is the property that makes cross-account sharing safe to use. The
boundary is closed by default and opens one named subject at a time.
You can read an account's `exports` array and know the complete list
of what leaves it. There is no broad grant to audit, only the exact
subjects you chose to offer.

## Pitfalls

Cross-account sharing fails quietly. A missing half does not raise an
error — it just moves no messages. These are the mismatches that bite.

**Half a hole shares nothing.** An export with no matching import, or
an import with no matching export, is not an error. The server starts,
the config is valid, and `analytics-reader` receives nothing.
Do not assume an export alone shares the subject — confirm both halves
name the same subject and the import names the right `account`. The
fastest check is the runnable flow on this page: publish in `ORDERS`,
subscribe in `ANALYTICS`, and watch the message arrive. Silence means
the two halves do not line up.

**Service and stream are not interchangeable.** A `stream` export is
publish/subscribe and flows one way; a `service` export is
request/reply and flows both ways. If `ANALYTICS` imports `orders.price`
as a service but no responder runs in `ORDERS`, a request comes back as
*no responders* — not a timeout, and not silence. Do not reach for a
service export when the data only flows one way; use a stream. When a
request crosses into a service import, handle the no-responders result:

<div class="nats-example" data-type="learn-security-cross-account-service-no-responders" data-languages="cli,js,go,python,java,rust,csharp"></div>

A *no responders* result means the import matched a service export but
nothing answered. A request that hangs to the timeout means the import
never matched an export at all. The two failures point at different
fixes.

**A renamed import is not the original subject.** An import that adds a
`prefix:` or remaps with `to:` delivers on the new subject, not the
exported one. Subscribe to the name the import lands on — not the name
`ORDERS` published. The order platform keeps `orders.shipped` as-is, so
this only bites once you remap; when you do, subscribe to the remapped
subject.

## Where you are

The scenario now has a single, deliberate connection between two
otherwise sealed accounts:

- `ORDERS` exports the stream `orders.shipped` as a public export.
- `ANALYTICS` imports `orders.shipped` from `ORDERS`.
- `analytics-reader` subscribes to `orders.shipped` and receives every
  shipment `order-svc` publishes.
- Every other subject in `ORDERS` remains invisible to `ANALYTICS`.

You can now share exactly what you mean to, and nothing more.

## What is next

The next page secures the wire itself. So far every credential and
every message has crossed the network in the clear. Encryption & TLS
puts a TLS layer under each connection, and shows how a client
certificate can *be* the user's identity.

Continue to [7. Encryption & TLS](/learn/security/encryption).

## See also

- [Core Concepts → Security](/concepts/security) — the five-minute
  overview of accounts and cross-account sharing.
- [Encryption & TLS](/learn/security/encryption) — the next page:
  securing each connection with TLS.
- [Reference](/reference/) — activation tokens, private exports, and
  subject transforms in full.
