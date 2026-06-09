---
id: shaping-the-stream
title: "13. Shaping the stream"
sidebar_position: 14
description: Control stream size and age with limits, and decide what happens when a limit is reached
---

# 13. Shaping the stream

The `ORDERS` stream you created back on page 2 has no limits. It keeps
every message forever, on however much disk the server has. That was
fine for learning. It is not fine for production.

A stream with no limits is a slow-motion outage. Orders keep arriving,
the stream keeps growing, and one day the disk fills. Nothing warns you
in advance.

This page covers two ideas, and only two. The first is the **limit**:
the ceiling that decides when the stream must start dropping messages.
The second is the **Discard policy**: what the server does at the moment
a limit is reached. Set the ceiling, then decide who wins under pressure.

## The limit: pick a ceiling

A stream under the default **Limits** retention policy keeps messages
until a limit forces it to drop them. You saw that policy in the config
printout on page 2. A limit is a single idea — a ceiling on the stream —
expressed through any of three knobs, depending on what you measure the
stream by:

- **MaxAge** caps how old a message may get. Set it to seven days and a
  message is removed roughly seven days after it was stored. This is the
  knob most order systems reach for, since you rarely need an order event
  from last quarter sitting in a live stream.
- **MaxBytes** caps how much disk the stream may occupy. Set it to one
  gigabyte and the stream never grows past a gigabyte, regardless of how
  old or new the messages are. This is the knob that protects the server
  itself.
- **MaxMsgs** caps how many messages the stream may hold. Set it to one
  million and the millionth-and-first message forces a drop. This fits
  when message count, rather than size or age, is what you reason about.

The three knobs are independent and all active at once. Whichever one is
hit first triggers a drop. You do not have to set all three — set the
ones that match how you think about the stream, and leave the rest
unlimited.

## Cap the ORDERS stream

Give `ORDERS` a seven-day age limit and a one-gigabyte ceiling. The
`nats stream edit` command changes an existing stream in place, so the
three messages already stored stay where they are.

<div class="nats-example"
     data-type="learn-jetstream-shaping-the-stream-setLimits"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

`nats stream edit` shows the change and asks for confirmation before
applying it. Confirm, then read the stream back:

```bash
nats stream info ORDERS
```

The configuration block now reports the two limits instead of
`unlimited`:

```
Configuration:

             Subjects: orders.>
     Retention Policy: Limits
       Discard Policy: Old
     Maximum Messages: unlimited
        Maximum Bytes: 1.0 GiB
          Maximum Age: 7d0h0m0s
 Maximum Message Size: unlimited
```

`Maximum Messages` is still `unlimited` — you set only age and bytes.
The stream is now a finite, managed resource: it cannot outgrow a
gigabyte, and it cannot hold anything older than a week.

## The Discard policy: who wins under pressure

The limit was the first idea. The **Discard policy** is the second, and
it answers one question: at the moment a new message would push the
stream past a limit, who wins — the new message or the old one? It has
two settings.

**Discard Old** is the default, and it is what you have right now. When a
limit is hit, the server drops the *oldest* messages to make room for the
new one. The publish always succeeds. The stream behaves like a rolling
window: newest messages in, oldest messages out.

**Discard New** is the opposite. When a limit is hit, the server *rejects
the new message* and the publish fails with an error. Existing messages
are never dropped. The stream behaves like a fixed container that, once
full, refuses more.

For `ORDERS`, Discard Old is the right answer. A live order stream wants
the most recent week of events. If disk pressure forces a trade-off, the
order from eight days ago is the one to drop, not today's. Leave the
default in place.

Discard New earns its keep when dropping an old message would lose data
you are required to keep, and you would rather the publisher feel
backpressure than lose history. The publisher must then handle the
rejected publish, which is why it is the less common default.

## Limits belong to the stream, not the consumer

A limit drops a message for everyone. When MaxAge removes a message, it
is gone from the stream, and every consumer reading that stream loses
access to it at once.

This is why limits and consumers are separate decisions. The `shipping`
consumer's cursor and the `analytics` consumer's filter do not protect a
message from the stream's limits. If a consumer is too slow and a message
ages out before that consumer reads it, the message is gone. We return to
that risk on the next page, where the retention policy itself changes.

## What we are not covering here

A stream can also limit messages *per subject* rather than across the
whole stream — useful when `orders.>` should keep, say, the last hundred
messages for each individual subject. That is the `MaxMsgsPerSubject`
option.

The full set of stream limit options is documented in
[Reference → Stream Configuration](/reference/jetstream/api/stream).
We use only MaxAge, MaxBytes, and Discard here.

## Pitfalls

Limits are easy to set and easy to misread. Two traps account for most
of the surprises.

**Discard Old drops the oldest message silently.** Discard Old never
fails a publish — when a limit is hit, the server removes the oldest
message and the publish succeeds as if nothing happened. That is exactly
the behavior you want for a rolling window, but it is silent data loss if
you expected the stream to push back. Nothing warns the publisher; the
order from eight days ago is simply gone. When you must keep history and
would rather the publisher feel backpressure, switch to Discard New, then
handle the rejected publish — it fails with `maximum bytes exceeded` (or
`maximum messages exceeded`) instead of dropping anything:

<div class="nats-example"
     data-type="learn-jetstream-shaping-the-stream-discardNew"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

The same silence applies to MaxAge and MaxBytes together. The two limits
are independent, so whichever is reached first triggers the drop. A
seven-day MaxAge does not guarantee seven days of history: if traffic
spikes, MaxBytes can hit first and evict messages that are only hours
old. Size MaxBytes for your peak, not your average, if the age window
matters to you.

**Whole-stream limits forget per-subject fairness.** MaxMsgs, MaxBytes,
and MaxAge measure `ORDERS` as a whole, across every subject under
`orders.>`. A flood of `orders.created` counts toward the same ceiling as
`orders.shipped`, so Discard Old can evict a shipped order to make room
for a created one — one noisy subject starves a quiet one. When each
subject deserves its own retention, add a per-subject ceiling with
`MaxMsgsPerSubject`:

<div class="nats-example"
     data-type="learn-jetstream-shaping-the-stream-perSubjectLimit"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

Under Discard Old, a per-subject ceiling evicts the oldest message *for
that subject* once it fills. Under Discard New, it rejects the publish
with `maximum messages per subject exceeded` — a third rejection string
alongside the whole-stream `maximum bytes exceeded` and
`maximum messages exceeded`.

## Where you are

You now have:

- An `ORDERS` stream capped at a 7-day MaxAge and a 1 GiB MaxBytes
  ceiling.
- The three messages from earlier still stored — editing limits does not
  drop messages that already sit within them.
- Discard Old in place, so a future limit drops the oldest order, never
  the newest.

## What is next

You set *limits* under the default Limits retention policy. The next page
steps up to the policy choice itself: Limits versus Interest versus
WorkQueue — the three retention policies, and which one to reach for per
use case.

## See also

- [Reference → Stream Configuration](/reference/jetstream/api/stream)
  — every limit option, its type, range, and default.
- [Delivery semantics](/learn/jetstream/delivery-semantics) — the next
  page, where the retention policy changes how messages are kept.
