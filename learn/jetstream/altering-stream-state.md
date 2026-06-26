---
id: altering-stream-state
title: "Altering stream state"
sidebar_position: 16
description: Delete a single message or purge the stream by hand, and what removal does to sequence numbers
---

# Altering stream state

Retention limits remove messages for you, on a schedule the server runs. Sometimes you need to remove something by hand:
one bad message a buggy producer wrote, or every message in a stream
you're clearing out for a fresh test run.

JetStream gives you two manual tools for that. You can delete a single
message, or purge many at once. Both change what the stream holds without
touching its config or its consumers, and both leave the sequence
numbers alone. How the numbers behave is worth understanding before you
use either tool.

## Delete one message

Every stored message has a sequence number, the one the `PubAck` gave
back when you published it. To remove a specific message, give the server
that number:

```bash
nats stream rmm ORDERS 2
```

`rmm` is "remove message." It takes the stream and the sequence to drop,
and it asks for confirmation first (`Really remove message 2 from Stream
ORDERS`). Add `--force` to skip the prompt in a script.

`nats stream rmm` securely removes the message: the server overwrites the
stored bytes so the old contents can't be read back. That's the right
default for a message that held data it shouldn't have, such as a card
number a producer logged by mistake.

From a client library you choose that cost yourself. `DeleteMsg(seq)`
marks the message erased but leaves its bytes in place until they're
later overwritten, which is cheap. `SecureDeleteMsg(seq)` overwrites them
right away the way the CLI does, and is slower for it. The only difference
the server sees is a single `no_erase` flag on the delete request; the
full request is in [Reference](/reference/jetstream/api/stream/msg-delete).

## Purge the stream

To clear a whole stream at once, purge it:

```bash
nats stream purge ORDERS
```

That removes every message in `ORDERS` and reports how many it dropped
(`Purged 3 messages from ORDERS`). The stream itself stays: same config,
same consumers, same name. Only the messages go. (Don't confuse it with
`nats stream rm ORDERS`, which deletes the whole stream, config and
consumers included.)

A bare purge removes everything. Three optional flags narrow it:

```bash
# Remove only the shipped events, leave everything else
nats stream purge ORDERS --subject orders.shipped

# Remove everything up to but not including sequence 100 (keep 100 onward)
nats stream purge ORDERS --seq 100

# Keep only the most recent 50 messages
nats stream purge ORDERS --keep 50
```

`--subject` limits the purge to one subject. `--seq` counts from the
bottom (drop everything older than a sequence); `--keep` counts from the
top (retain a number of the newest). You can't use `--seq` and `--keep`
together, since one works from each end, but either one can pair with
`--subject` to count within a single subject.

## Sequence numbers never backfill

Delete a message or purge a range and you leave a hole. Sequence `2` is
gone; `1` and `3` stay exactly where they were. The server does not
renumber `3` down to close the gap, and it never hands `2` out again to a
future message.

This is the rule the [publishing page](/learn/jetstream/publishing)
promised: sequence numbers only ever climb. After a full purge of
`ORDERS`, the next message you publish doesn't start over at `1`. It gets
the number after the last one the stream ever held, because purge sets the
stream's first sequence to one past its last.

Consumers handle the gaps without trouble. A consumer reading `ORDERS`
skips the sequences that are gone; it never blocks waiting for a deleted
message, and a missing `2` is not redelivered.

This means a stored sequence is a stable address. If you saved "order
`ord_8w2k` is at sequence 2" alongside your business record, that pointer
either still points at the same message or points at nothing. It never
points at a different message, because `2` never gets reused.

## Manual removal versus automatic

Everything on this page is manual: you ran a command to remove something
deliberately. The server also removes messages on its own, and that lives
on two other pages:

- [Shaping the stream](/learn/jetstream/shaping-the-stream) — `MaxAge`,
  `MaxBytes`, `MaxMsgs`, and discard policy trim the stream to stay within
  its limits.
- [Per-message TTL](/learn/jetstream/message-ttl) — a single message
  expires on its own clock.

Use delete and purge for one-off removals. Use limits and TTL for the
steady state.

## Pitfalls

Some ways manual removal goes wrong.

**`purge` empties the stream; `rm` destroys it.** The two commands look
similar but do different things. `nats stream purge ORDERS` removes the
messages and leaves the stream ready for more. `nats stream rm ORDERS`
deletes the stream itself, including its config and every consumer. Use
`purge` when you only mean to clear messages; don't type `rm` for that,
and read the confirmation prompt before answering it.

**A deleted sequence is gone, not renumbered.** Code that assumes messages
run `1..N` with no holes breaks the first time anyone removes one. Do
treat a sequence as a stable address that may or may not still hold a
message; don't work out "the next message" as `count + 1`, and don't read
a message count as the highest sequence.

**A purge can't be undone.** The messages are gone the moment the command
returns. On a stream that matters, set `DenyPurge` in its config so a
stray call can't wipe it, and keep a
[mirror](/learn/jetstream/mirrors-and-sources) if the data is worth
recovering.

```bash
# Guard a stream so purge requests are refused
nats stream edit ORDERS --deny-purge

# A purge now fails instead of silently emptying the stream
nats stream purge ORDERS
```

## Where you are

You can now remove messages from `ORDERS` by hand: one at a time with
`nats stream rmm`, or many at once with `nats stream purge` and its
`--subject`, `--seq`, and `--keep` flags. You saw that removal leaves gaps
the server never fills back in, and that the sequence counter only ever
climbs.

If you ran a full `nats stream purge ORDERS` above, the stream is empty
now; republish the three orders from the [publishing
page](/learn/jetstream/publishing) to carry a populated `ORDERS` into the
next page. Everything else about the stream, its config and its consumers,
is exactly as the previous page left it.

## What's next

Manual and automatic removal are both covered, so the stream's contents
are fully in your hands on a single server. The next page asks what
happens to all of it when the server itself goes away.

## See also

- [Reference → Stream Purge](/reference/jetstream/api/stream/purge) — the
  exact purge request, `filter`, `seq`, and `keep`.
- [Reference → Delete Message](/reference/jetstream/api/stream/msg-delete)
  — the delete request and the `no_erase` flag.
- [Shaping the stream](/learn/jetstream/shaping-the-stream) — the limits
  that remove messages without you asking.
