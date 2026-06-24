---
id: shaping-the-stream
title: "12. Shaping the stream"
sidebar_position: 14
description: Control stream size and age with limits, and decide what happens when a limit is reached
---

# 12. Shaping the stream

The `ORDERS` stream you created back on page 1 has no limits. It keeps
every message forever, on however much disk the server has. That was
fine for learning, but not for production.

Without a limit, the stream keeps growing until it fills the disk and
takes the server down with it.

This page covers two settings. The **limit** is the cap that decides
when the stream must start dropping messages. The **Discard policy** is
what the server does when a limit is reached.

## The limit

A stream under the default **Limits** retention policy keeps messages
until a limit forces it to drop them. You saw that policy in the config
printout on page 1. A limit is a ceiling on the stream. You set it with
one of three options, depending on how you want to measure the stream:

- **MaxAge** caps how old a message may get. Set it to seven days and a
  message is removed roughly seven days after it was stored. Most order
  systems use this one, since you rarely need an order event from last
  quarter in a live stream.
- **MaxBytes** caps how much disk the stream may use. Set it to one
  gigabyte and the stream never grows past a gigabyte, no matter how
  old or new the messages are. This option protects the server itself.
- **MaxMsgs** caps how many messages the stream may hold. Set it to one
  million and the millionth-and-first message forces a drop. Use this
  when message count, rather than size or age, is what you reason about.

The three options work separately, and all of them are active at once.
Whichever one is reached first triggers a drop. You don't have to set
all three. Set the ones that match how you think about the stream, and
leave the rest unlimited.

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

`Maximum Messages` is still `unlimited`, because you set only age and
bytes. The stream now has clear bounds. It can't grow past a gigabyte,
and it can't hold anything older than a week.

## The Discard policy

The Discard policy controls what happens at the moment a new message
would push the stream past a limit: the server keeps the new message or
the old one. It has two settings.

**Discard Old** is the default, and it's what you have right now. When a
limit is hit, the server drops the *oldest* messages to make room for the
new one. The publish always succeeds. Newest messages go in, oldest
messages come out.

**Discard New** is the opposite. When a limit is hit, the server *rejects
the new message* and the publish fails with an error. Existing messages
are never dropped. Once the stream is full, it refuses more.

For `ORDERS`, Discard Old is the right choice. A live order stream wants
the most recent week of events. If disk pressure forces a trade-off, the
order from eight days ago is the one to drop, not today's. Leave the
default in place.

Use Discard New when dropping an old message would lose data you're
required to keep, and you'd rather slow the publisher down than lose
history. The publisher then has to handle the rejected publish, which is
why it's the less common choice.

## Limits apply to the stream, not the consumer

A limit drops a message for everyone. When MaxAge removes a message,
it's gone from the stream, and every consumer reading that stream loses
access to it at once.

Limits and consumers are separate decisions. The `shipping` consumer's
position and the `analytics` consumer's filter don't protect a message
from the stream's limits. If a consumer is too slow and a message ages
out before that consumer reads it, the message is gone. The next page
returns to that risk, where the retention policy itself changes.

## Per-subject limits

A stream can also limit messages *per subject* rather than across the
whole stream, which is useful when `orders.>` should keep, say, the last
hundred messages for each individual subject. That's the
`MaxMsgsPerSubject` option.

The full set of stream limit options is documented in
[Reference → Stream Configuration](/reference/jetstream/api/stream).
We use only MaxAge, MaxBytes, and Discard here.

## Pitfalls

Limits are easy to set and easy to misread. Two traps account for most
of the surprises.

**Discard Old drops the oldest message silently.** Discard Old never
fails a publish. When a limit is hit, the server removes the oldest
message and the publish succeeds. That's what you want for a rolling
window. But you lose data without notice if you expected the stream to
refuse the new message. The publisher gets no warning, and the order
from eight days ago is gone. When you must keep history and would rather
slow the publisher down, switch to Discard New and handle the rejected
publish. It fails with `maximum bytes exceeded` (or
`maximum messages exceeded`) instead of dropping anything:

<div class="nats-example"
     data-type="learn-jetstream-shaping-the-stream-discardNew"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

The same quiet drop applies to MaxAge and MaxBytes together. The two
limits work separately, so whichever is reached first triggers the drop.
A seven-day MaxAge does not guarantee seven days of history. If traffic
spikes, MaxBytes can be reached first and remove messages that are only
hours old. Set MaxBytes for your busiest traffic, not your average, if
the age window matters to you.

**Whole-stream limits don't balance across subjects.** MaxMsgs,
MaxBytes, and MaxAge measure `ORDERS` as a whole, across every subject
under `orders.>`. A high volume of `orders.created` counts toward the
same ceiling as `orders.shipped`, so Discard Old can drop a shipped order
to make room for a created one. When each subject needs its own limit,
add a per-subject ceiling with `MaxMsgsPerSubject`:

<div class="nats-example"
     data-type="learn-jetstream-shaping-the-stream-perSubjectLimit"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

Under Discard Old, a per-subject ceiling drops the oldest message *for
that subject* once it fills. Under Discard New, it rejects the publish
with `maximum messages per subject exceeded`. That's a third rejection
string, alongside the whole-stream `maximum bytes exceeded` and
`maximum messages exceeded`.

## Where you are

You now have:

- an `ORDERS` stream capped at a seven-day MaxAge and a 1 GiB MaxBytes
  ceiling
- the three messages from earlier still stored (editing limits doesn't
  drop messages that already sit within them)
- Discard Old in place, so a future limit drops the oldest order, never
  the newest

## What's next

You set *limits* under the default Limits retention policy. The next page
covers the policy choice itself: the three retention policies, Limits
versus Interest versus WorkQueue, and which one to use when.

## See also

- [Reference → Stream Configuration](/reference/jetstream/api/stream)
  — every limit option, its type, range, and default.
- [Delivery semantics](/learn/jetstream/delivery-semantics) — the next
  page, where the retention policy changes how messages are kept.
