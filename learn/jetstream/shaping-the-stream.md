---
id: shaping-the-stream
title: "Shaping the stream"
sidebar_position: 13
description: Control stream size and age with limits, and decide what happens when a limit is reached
---

# Shaping the stream

The `ORDERS` stream you created back on the
[Your first stream](/learn/jetstream/your-first-stream) page has no
limits. It keeps
every message forever, on however much disk the server has. That was
fine for learning, but not for production.

Without a limit, the stream keeps growing until it fills the disk and
takes the server down with it.

This page covers two settings. The **limit** is the cap that decides
when the stream is full. The **Discard policy** decides which message
the server discards when the stream hits that limit: the new one or the
oldest stored one.

## The limit

A stream under the default **Limits** retention policy keeps messages
until a limit forces it to discard them. You saw that policy in the config
printout on the [Your first stream](/learn/jetstream/your-first-stream)
page. A limit is a ceiling on the stream. You set it with
one of three options, depending on how you want to measure the stream:

- **MaxAge** caps how old a message may get. Set it to seven days and a
  message is discarded roughly seven days after it was stored. It fits when
  only recent events matter — a live order stream rarely needs one from last
  quarter.
- **MaxBytes** caps how much disk the stream may use. Set it to one
  gigabyte and the stream never grows past a gigabyte, no matter how
  old or new the messages are. This option protects the server itself.
- **MaxMsgs** caps how many messages the stream may hold. Set it to one
  million and the millionth-and-first message forces a discard. Use this
  when message count, rather than size or age, is what you reason about.

The three options work separately, and all of them are active at once.
Whichever one is reached first triggers a discard. You don't have to set
all three. Set the ones that match how you think about the stream, and
leave the rest unlimited.

MaxAge evicts by the clock; MaxMsgs evicts by the count. Same discard,
two different triggers:

<div class="nats-flow" data-scenario="maxAgeAnimated" data-width="620" data-height="200"></div>

<div class="nats-flow" data-scenario="maxMsgsAnimated" data-width="520" data-height="200"></div>

## Cap the ORDERS stream

Give `ORDERS` a seven-day age limit and a one-gigabyte ceiling. The
`nats stream edit` command changes an existing stream in place, so the
messages already stored stay where they are.

<div class="nats-example"
     data-type="learn-jetstream-shaping-the-stream-setLimits"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

`nats stream edit` shows the change and asks for confirmation before
applying it. Confirm, then read the stream back:

```bash
nats stream info ORDERS
```

The configuration block now reports the two limits instead of
`unlimited`:

```text
Options:

                    Retention: Limits
              Acknowledgments: true
               Discard Policy: Old
             Duplicate Window: 2m0s

Limits:

             Maximum Messages: unlimited
          Maximum Per Subject: unlimited
                Maximum Bytes: 1.0 GiB
                  Maximum Age: 7d0h0m0s
         Maximum Message Size: unlimited
            Maximum Consumers: unlimited
```

`Maximum Messages` is still `unlimited`, because you set only age and
bytes. (`Maximum Message Size`, also in the block, is a different limit —
a cap on a single message rather than the whole stream — and stays
unlimited here.) The stream now has clear bounds: it can't grow past a
gigabyte, and it can't hold anything older than a week.

## The Discard policy

The Discard policy controls what happens at the moment a new message
would push the stream past a limit: the server discards the new message
or the oldest stored one. It has two settings.

**Discard Old** is the default, and it's what you have right now. When a
limit is hit, the server discards the *oldest* messages to make room for
the new one. The publish always succeeds: the newest message is stored,
the oldest is discarded.

<div class="nats-flow" data-scenario="discardOldAnimated" data-width="540" data-height="250"></div>

**Discard New** is the opposite. When a size or count limit is hit — `MaxMsgs`,
`MaxBytes`, or a per-subject cap — the server discards the *new* message: it
rejects the publish, which fails with an error, and nothing already stored is
dropped to make room. `MaxAge` isn't a Discard-policy choice: it expires stored
messages on its own timer under either policy. The rule from the top of the page
still holds — **the first limit to hit applies.**

<div class="nats-flow" data-scenario="discardNewAnimated" data-width="540" data-height="250"></div>

For `ORDERS`, Discard Old is the right choice. A live order stream wants
the most recent week of events. If disk pressure forces a trade-off, the
order from eight days ago is the one to discard, not today's. Leave the
default in place.

Use Discard New when discarding an old message would lose data you're
required to keep, and you'd rather slow the publisher down than lose
history. The publisher then has to handle the rejected publish, which is
why it's the less common choice.

## Limits apply to the stream, not the consumer

A limit discards a message for everyone. When MaxAge discards a message,
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
[Reference → Stream Configuration](/reference/jetstream/api/stream/create).
We use only MaxAge, MaxBytes, and Discard here.

## Pitfalls

Limits are easy to set and easy to misread. Two traps account for most
of the surprises.

**Discard Old discards the oldest message silently.** Discard Old never fails a
publish. When a size or count limit is hit, the server drops the oldest message
and the publish succeeds — right for a rolling window, but the publisher gets no
warning and the oldest order is gone. To keep history and push back on the
publisher, switch to Discard New, which rejects the publish (`maximum bytes
exceeded` or `maximum messages exceeded`) instead of dropping a stored message.
Discard New still leaves `MaxAge` in force — **the first limit to hit applies** —
so if you must keep history, remove or raise the age limit too:

<div class="nats-example"
     data-type="learn-jetstream-shaping-the-stream-discardNew"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

The same quiet discard applies to MaxAge and MaxBytes together. The two
limits work separately, so whichever is reached first triggers the
discard. A seven-day MaxAge does not guarantee seven days of history. If
traffic spikes, MaxBytes can be reached first and discard messages that
are only hours old. Set MaxBytes for your busiest traffic, not your average, if
the age window matters to you.

**Whole-stream limits don't balance across subjects.** MaxMsgs,
MaxBytes, and MaxAge measure `ORDERS` as a whole, across every subject
under `orders.>`. A high volume of `orders.created` counts toward the
same ceiling as `orders.shipped`, so Discard Old can discard a shipped
order to make room for a created one. When each subject needs its own limit,
add a per-subject ceiling with `MaxMsgsPerSubject`:

<div class="nats-example"
     data-type="learn-jetstream-shaping-the-stream-perSubjectLimit"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

Under Discard Old, a per-subject ceiling discards the oldest message *for
that subject* once it fills. Discard New doesn't change that on its own:
by default the per-subject limit still rolls, discarding the subject's
oldest message rather than rejecting the publish. Making a full subject
reject takes a second setting, `DiscardNewPerSubject` (the
`discard_new_per_subject` config field), on top of Discard New. With both,
a publish past the per-subject ceiling fails with `maximum messages per
subject exceeded`, a third rejection string alongside the whole-stream
`maximum bytes exceeded` and `maximum messages exceeded`. The field is in
[Reference → Stream Configuration](/reference/jetstream/api/stream/create).

## Where you are

You now have:

- an `ORDERS` stream capped at a seven-day MaxAge and a 1 GiB MaxBytes
  ceiling
- the messages from earlier still stored (editing limits doesn't
  discard messages that already sit within them)
- Discard Old in place, so a future limit discards the oldest order, never
  the newest

## What's next

You set *limits* under the default Limits retention policy. The next page
covers the policy choice itself: the three retention policies, Limits
versus Interest versus WorkQueue, and which one to use when.

## See also

- [Reference → Stream Configuration](/reference/jetstream/api/stream/create)
  — every limit option, its type, range, and default.
