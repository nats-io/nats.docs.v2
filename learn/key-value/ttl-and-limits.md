---
id: ttl-and-limits
title: "TTL and limits"
sidebar_position: 5
description: Expire a single key with a per-key TTL, bound the bucket with limits, and watch a value disappear on its own
---

# TTL and limits

Every key in `INVENTORY` so far lives until you overwrite or delete it.
That's the right default for a stock count, but it's not the only thing
a bucket holds. Some values should clean themselves up, such as a
flash-sale price, a short-lived session token, or a "this SKU is locked
for the next 30 minutes" flag.

This page adds two ways to bound the bucket by time. The first is the
per-key TTL, a single key that expires on its own. The second is the
set of bucket limits that bound the whole thing: total size, value
size, history depth. When a key expires, the server leaves a marker so
the warehouse dashboard learns the value is gone, the same way it learned
about every other change.

You still have the `INVENTORY` bucket from the previous pages, with
`widget-blue` decremented to 40 and the warehouse dashboard watching.
You'll add a key with a TTL to it.

## A per-key TTL expires a single value

A **TTL** (time-to-live) is how long a value stays in the bucket before
the server removes it. A **per-key TTL** attaches that clock to one key.
The key lives for its TTL, then disappears on its own, with no service
having to remember to delete it.

Per-key TTL is set at **create** time, and only at create time. You hand
the TTL to create alongside the value, and the key starts its countdown
the moment it lands. This is a deliberate restriction: a TTL belongs to
the value you're writing now, not to a value that might be put over it
later.

One setup step comes first. Per-key TTLs ride on a bucket feature called
**limit markers**, the same mechanism that leaves a trace when a value
expires. A bucket needs limit markers enabled before any key in it
can carry a TTL. `INVENTORY` was created without them, so you turn them on
once, then create the timed key:

<div class="nats-example" data-type="learn-key-value-ttl-and-limits-perKeyTTL" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

The `flash-sale` key now holds `99` and will remove itself 30 minutes
later. Because the TTL is stored with the value, this happens without a
cron job, a separate cleanup service, or a sweep.

Per-key TTL needs **nats-server 2.11 or newer**; that's the release that
added limit markers. On an older server, enabling markers on the bucket is
rejected, and the timed create fails with it. If you're on 2.11, the
feature is available.

## Bucket limits bound the whole bucket

Where a per-key TTL bounds one value, **bucket limits** bound the whole
bucket. They keep a key-value store from growing without end, and you set
them when you create the bucket. Three of them matter most:

- **Max bucket size**: the total bytes the bucket may hold across every
  key and every kept revision. The bucket won't grow past it.
- **Max value size**: the largest a single value may be. A put of
  something bigger is rejected. Key-value values are meant to be small;
  large values belong in the [Object Store](/learn/object-store).
- **History depth**: how many prior revisions each key keeps, which you
  already met on the previous page. It caps at 64, and it doubles as a
  per-key cap: it's the most messages any single key may hold.

Here those limits go on a throwaway `CACHE` bucket, so the numbers
stand on their own and don't imply anything about `INVENTORY`:

<div class="nats-example" data-type="learn-key-value-ttl-and-limits-bucketWithLimits" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

The `--ttl` on the bucket above is a different clock from the per-key TTL.
A bucket TTL expires *every* value once it reaches that age; the per-key
TTL expires *one* value. The bucket-wide form is the stream's `MaxAge`
limit — one deadline applied to every value in the bucket — and it lives
with the other [stream limits](/learn/jetstream/shaping-the-stream). The
per-key form is the one built on JetStream's
[per-message TTL](/learn/jetstream/message-ttl), and it's the form unique to
key-value that this chapter teaches.

The full set of bucket configuration options is documented in
[Reference → Create Stream](/reference/jetstream/api/stream/create),
because a bucket is created as a stream and these limits map onto stream
fields. Here you only need the three above.

## Expiry leaves a marker for watchers

When a per-key TTL fires, the server leaves a **marker** instead of
silently dropping the value: a small message that records the key is gone and why.
You may have heard the marker called a *tombstone* elsewhere; the term in
key-value is marker, and a TTL expiry leaves one with the reason
`MaxAge`: the value aged out.

The marker matters because of the warehouse dashboard. A watcher receives
the marker as a purge on the key — the CLI prints `PURGE` — just as if
someone had purged it by hand. Without the marker, a watcher that saw
`flash-sale` appear would never learn it had vanished, and its view of the
bucket would drift out of date. The marker is how live readers stay correct
when a value expires on its own.

<div class="nats-flow" data-scenario="kvTtlExpiryAnimated" data-width="600" data-height="350"></div>

The animation walks the timeline: the inventory service creates
`flash-sale` with a 30-minute TTL; the clock advances past it; the server
places a marker on the key with reason `MaxAge`; and the warehouse
dashboard receives that marker as a purge. The value expired without
any service modifying it, and the watcher was still notified through the
marker.

## Pitfalls

Two mistakes are common the first time you add a TTL or a limit to a
bucket. Both come from expecting a TTL or a limit to behave in a way it
does not.

**A per-key TTL is set at create, and only at create.** Neither put nor
update takes a `--ttl`; the CLI rejects the flag outright. And writing the
key again doesn't extend its TTL: a put or an update appends a new latest
value with no TTL of its own, so the key simply stops expiring — put and
update behave the same way here. To give a key a different TTL, delete it
and create it again with the new one. Use delete-then-create to change a
TTL, not put or update.

The handling is in the create snippet above: after the timed create, it
deletes `flash-sale` and creates it again with a shorter TTL, which is the
only way to change one.

**Limits reject, they do not make room for an oversized value.** A put of
a value larger than the bucket's max value size is rejected outright, and
so is a put that would push the bucket past its max size; the server
returns an error and leaves every existing value in place. The inventory
service sees that error on the put, not later on a get, so a `CACHE`
bucket sized for the average load starts refusing writes the moment a
burst pushes it to the cap. Size the bucket for the working set you
actually need to hold, not the average, so a busy minute doesn't bounce
writes you needed to land, and cap max value size above the largest value
you legitimately store.

## Where you are

You now have:

- An `INVENTORY` bucket with limit markers enabled and a `flash-sale` key
  that expires on its own after a per-key TTL.
- A feel for the three bucket limits (max bucket size, max value size,
  and history depth) that bound the whole bucket.
- A working model of the expiry marker: when a value ages out, the server
  leaves a marker with reason `MaxAge`, and the warehouse dashboard
  receives it as a purge.

The bucket is now complete. It holds keys with values, keeps history,
supports safe concurrent writes, and has values that remove themselves
on a TTL.

## What's next

The next page shows the internals. It covers the `KV_INVENTORY` stream
that's been under the bucket the whole time, the direct read path, and the
difference between delete and purge.

Continue to [Under the hood](/learn/key-value/under-the-hood).

## See also

- [Reference → Create Stream](/reference/jetstream/api/stream/create) —
  every bucket limit and its valid range.
- [JetStream → Message TTL](/learn/jetstream/message-ttl) — the
  per-message expiry mechanism the per-key TTL is built on.
- [JetStream → Shaping the stream](/learn/jetstream/shaping-the-stream) —
  `MaxAge` and the other stream limits the bucket-wide TTL and size caps
  map onto.
- [Object Store](/learn/object-store) — where large values belong when
  they outgrow a key-value bucket.
