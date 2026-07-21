---
id: cross-account
title: Cross-account
sidebar_position: 5
description: Open exactly one subject between two isolated accounts with an export/import pair
---

# Cross-account

Two accounts can't see each other's traffic. That's the point of an
account: it's an isolated subject space, and the previous page left
`ORDERS` and `ANALYTICS` isolated from one another. `order-svc`
publishes `orders.>` inside `ORDERS`; `analytics-reader` subscribes
inside `ANALYTICS`; nothing crosses between them.

That isolation is the right default, but sometimes you need to share
across it.

`ORDERS` publishes `orders.shipped` every time a box leaves the
warehouse. The analytics team, in the separate `ANALYTICS` account,
wants to count those shipments. Today they can't: `analytics-reader`
subscribing to
`orders.shipped` receives nothing, because that subject lives in a
different account.

This page deliberately opens sharing for exactly one subject and
leaves every other subject isolated.

## Export and import

Sharing a subject across the account boundary takes a matching pair of
declarations. One account offers the subject, and the other account
asks for it. Both must agree, or nothing crosses.

An **export** is the offer. The owning account names a subject and
marks it as available to other accounts. `ORDERS` exports
`orders.shipped`.

An **import** is the request. The receiving account names the same
subject, names the account that exports it, and pulls it into its own
space. `ANALYTICS` imports `orders.shipped` from `ORDERS`.

Neither half works alone. An export with no matching import shares
nothing, because the offer goes unused. An import with no matching
export is refused: the server rejects the configuration at startup.

## What kind of export

An export carries a `type`, and the type follows the subject's
messaging pattern. The pattern here is publish/subscribe: `ORDERS`
publishes shipment events, `ANALYTICS` reads them, and nothing flows
back. That makes this a **stream export**: the exporting account
publishes, importing accounts subscribe, and messages flow one way.
Despite the name, a stream export has nothing to do with JetStream
streams — here the word only means a one-way flow of messages across
the account boundary. It's the type we use for the rest of this page.

The other type, a **service export**, mirrors the request/reply
pattern instead: a caller asks and an owner answers, so messages flow
both ways. You'd reach for it to let `ANALYTICS` call a pricing
lookup that `ORDERS` owns. The order platform has no such need, so we
mention the service type only so you can tell the two apart. The
[exports reference](/reference/config/accounts/exports) covers service
exports in full.

## Export the subject from ORDERS

The export lives in the `ORDERS` account, in the server's
configuration. The accounts, users, and permissions carry over from
the previous page unchanged; the only new lines are the `exports`
array (the `SYS` account and `system_account: SYS` line from the
previous page also stay; the listings show only the two tenant
accounts):

```conf
accounts {
  ORDERS: {
    jetstream: enabled
    users: [
      { user: order-svc, password: s3cr3t,
        permissions: {
          publish: { allow: ["orders.>"] }
          subscribe: { allow: ["_INBOX.>"] }
        }
      }
    ]
    exports: [
      { stream: "orders.shipped" }
    ]
  }
  ANALYTICS: {
    users: [
      { user: analytics-reader, password: an4lytics }
    ]
  }
}
```

The `stream:` key does two jobs. It declares the export `type` as a
stream, and it names the subject being offered: `orders.shipped`. A
service export would use a `service:` key in the same slot.

With no further options, this is a **public export**. Any account on
the server may import `orders.shipped`. To lock an
export down to named accounts, list them on the export entry:

```conf
{ stream: "orders.shipped", accounts: [ANALYTICS] }
```

The order platform is fine with a public export here.

(More sophisticated export restrictions are available when using
[Operator mode](./operator-mode).)

## Import the subject into ANALYTICS

The export alone shares nothing yet: `ANALYTICS` has to ask, by
adding a matching entry to its own `imports` array:

```conf
accounts {
  ORDERS: {
    jetstream: enabled
    users: [
      { user: order-svc, password: s3cr3t,
        permissions: {
          publish: { allow: ["orders.>"] }
          subscribe: { allow: ["_INBOX.>"] }
        }
      }
    ]
    exports: [
      { stream: "orders.shipped" }
    ]
  }
  ANALYTICS: {
    users: [
      { user: analytics-reader, password: an4lytics }
    ]
    imports: [
      { stream: { account: ORDERS, subject: "orders.shipped" } }
    ]
  }
}
```

The import names three things. The `stream` key matches the export
type. The `account` field says which account owns the export:
`ORDERS`. The `subject` field is the subject as the exporter publishes
it: `orders.shipped`.

Apply the change with `nats-server --signal reload=<pid>` (or restart
the server). The subject is then shared: a message published to
`orders.shipped` in `ORDERS` now also appears on `orders.shipped`
inside `ANALYTICS`, and `analytics-reader` can subscribe to it.

The import lands at the same subject name by default. An import may
also rename the subject on the way in (prepend a `prefix:` or remap
with `to:`) so it doesn't collide with local subjects. The order
platform keeps the name as-is. The
[imports reference](/reference/config/accounts/imports) documents the
full set of import options, including renaming. We use only
`account` and `subject` here.

## See the sharing work

Publish a shipment as `order-svc` in `ORDERS`, and subscribe to it as
`analytics-reader` in `ANALYTICS`. The message crosses the boundary
only because the export and import line up.

<div class="nats-flow" data-scenario="crossAccountExportAnimated" data-width="600" data-height="380"></div>

The animation also publishes `orders.created`, a subject that was never
exported — it stays inside `ORDERS`. Run the `orders.shipped` half
yourself:

<div class="nats-example" data-type="learn-security-cross-account-consume-imported" data-languages="cli"></div>

The subscriber's terminal shows:

```
14:19:26 Subscribing on orders.shipped
[#1] Received on "orders.shipped"
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}
```

`analytics-reader` receives order `ord_8w2k` on `orders.shipped`, the
same subject name the exporter uses, even though the message was
published in a different account. The publisher doesn't know an
importer exists: `order-svc` publishes `orders.shipped` exactly as it
always has, and its own terminal prints the usual
`Published 91 bytes to "orders.shipped"`. Neither side observes the
cross-account wiring; it lives entirely in the server's account
configuration.

## The isolation still holds everywhere else

Sharing one subject changes nothing else. `analytics-reader` still
sees only `orders.shipped`. Subscribing to `orders.created` or
`orders.canceled` delivers nothing, because those subjects were never
exported.

The boundary stays closed by default and opens one named subject at a
time: you can read an account's `exports` array and know the complete
list of what leaves it.

A third account will not see the messages unless it too imports the exported
subject.  It could import on a distinct name, without impacting upon
existing importers.

## The same share in operator mode

Later in this chapter, [Operator mode](/learn/security/operator-mode)
moves account definitions out of the server config and into signed
JWTs — and exports and imports move with them:
`nats auth account exports add Shipments "orders.shipped" ORDERS`
declares the offer, and
`nats auth account imports add Shipments "orders.shipped" ANALYTICS
--source <ORDERS-public-key> --local orders.shipped` declares the
request. Both changed account JWTs must then be pushed to the server;
until then the share silently doesn't exist, because JWT mode has no
startup check to catch a mismatch. `nats auth` has no activation
tokens for private exports; its substitute is `--token-position`,
which keys a wildcard export so each importing account can only
import the subject carrying its own account key.

## Pitfalls

A few mismatches catch people on a first share.

**An export with no import is silent; an import with no export stops
the server.** The two halves fail differently. An export nobody
imports isn't an error: the server starts, the config is valid, and no
messages move — confirm the import half exists and names the right
`account`. An import with no matching export is loud: the server exits
at startup with

```
nats-server: nats.conf:2:1: Error adding stream import "orders.shipped": stream import not authorized
```

In operator mode this failure is silent instead: an unpushed import
never matches anything (see the section above). In config mode the fastest check is the runnable
flow on this page: publish in `ORDERS`, subscribe in `ANALYTICS`, and
watch the message arrive.

**Service and stream are not interchangeable.** A `stream` export is
publish/subscribe and flows one way; a `service` export is
request/reply and flows both ways. If `ANALYTICS` imports
`orders.price` as a service and no responder runs in `ORDERS`, the
request comes back at once as `No responders are available`:

<div class="nats-example" data-type="learn-security-cross-account-service-no-responders" data-languages="cli"></div>

```
14:19:42 Sending request on "orders.price"
14:19:42 No responders are available
```

The CLI prints the status and exits 0; the server answered
immediately, so there's no timeout to wait out. `No responders` here
means the import matched the service export but nothing answered —
start a responder in `ORDERS`. A request with no import at all gets
the same immediate answer, because it never leaves `ANALYTICS`, where
nothing listens on `orders.price`. And an import that doesn't match
any export fails earlier, at startup, as the previous pitfall shows.

**A renamed import is not the original subject.** An import that adds a
`prefix:` or remaps with `to:` delivers on the new subject, not the
exported one. Subscribe to the name the import lands on, not the name
`ORDERS` published. The order platform keeps `orders.shipped` as-is, so
this only matters once you remap.

## Where you are

The scenario now has a single, deliberate connection between two
otherwise isolated accounts:

- `ORDERS` exports the stream `orders.shipped` as a public export.
- `ANALYTICS` imports `orders.shipped` from `ORDERS`.
- `analytics-reader` subscribes to `orders.shipped` and receives every
  shipment `order-svc` publishes.
- Every other subject in `ORDERS` remains invisible to `ANALYTICS`.

## What's next

Config mode is now complete: authentication, permissions, two
accounts, and one shared subject, all in the server's config file.
The next page rebuilds the same setup where the server holds no user
list at all.

Continue to [Operator mode](/learn/security/operator-mode).

## See also

- [Exports configuration](/reference/config/accounts/exports) — every
  export option, including restricting importers with `accounts` and
  the service `response_type`.
- [Imports configuration](/reference/config/accounts/imports) —
  renaming with `prefix` and `to`, and the full import field list.
- [Operator mode](/learn/security/operator-mode) — the next page:
  the same accounts as signed JWTs, with no user list on the server.
- [Core Concepts → Security](/concepts/security) — the five-minute
  overview of accounts and cross-account sharing.
