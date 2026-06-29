---
id: pausing
title: "Pausing a consumer"
sidebar_position: 12
description: Stop delivery to a consumer until a deadline, then resume where it left off
---

# Pausing a consumer

Sometimes you want a consumer to stop delivering for a while and then
pick up exactly where it was.

You could delete the consumer and recreate it later, but that throws
away everything it tracked: which messages it had acknowledged, and how
far it had read.

A **paused** consumer stops receiving messages until a deadline you
set, and keeps all of its progress until then.

## What pausing keeps

Pausing changes one thing: the server stops delivering messages to the
consumer.

Everything else stays the same. The cursor, the sequence number the
consumer has read up to, doesn't move. Acknowledged messages stay
acknowledged. The count of how often each message has been redelivered
stays as it was. When the pause ends, delivery resumes from the position
it stopped at.

This is the difference between pausing and deleting a consumer. A
deleted consumer loses all of this; a paused consumer keeps it.

## Pause until a deadline

You pause a consumer *until* a moment in time. When that moment
arrives, the consumer resumes on its own, with no second command
needed.

Pause the `shipping` consumer for one hour:

<div class="nats-example"
     data-type="learn-jetstream-pausing-pauseResume"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

The CLI accepts two forms for the deadline. A duration like `1h` or
`30m` means "from now." A time like `2026-05-22 14:30:00` means that
exact clock time. Either way the server stores a fixed deadline.

Clients can also pause a consumer the moment they create it. Set the
`PauseUntil` field in the consumer config to a future time, and the
consumer starts out paused until that deadline. It's the same fixed
deadline the CLI sets, just given when the consumer is first created.
See [Reference → Consumer API](/reference/jetstream/api/consumer) for the
field.

The command confirms the pause and the time remaining:

```
Paused ORDERS > shipping until 2026-05-22 11:14:22 (59m58s)
```

While the consumer is paused, the stream keeps accepting new messages as
normal. They pile up behind the cursor, waiting. The pause stops
delivery to the consumer, not storage in the stream.

## Check the pause from consumer info

`nats consumer info` reports the pause state:

```bash
nats consumer info ORDERS shipping
```

A paused consumer shows the deadline and how long is left:

```
State:

   Paused Until Deadline: 2026-05-22 11:14:22 (57m11s remaining)
              Last Delivered Message: Consumer sequence: 12 Stream sequence: 12
                Acknowledgment Floor: Consumer sequence: 12 Stream sequence: 12
```

The cursor values (last delivered and acknowledgment floor) are exactly
where they were before the pause.

## Resume early

The deadline auto-resumes the consumer. If you want it back sooner, the
`resume` command lifts the pause immediately:

```bash
nats consumer resume ORDERS shipping --force
```

The server confirms, and delivery picks up at once:

```
Consumer ORDERS > shipping was resumed while previously paused until 2026-05-22 11:14:22
```

Resuming before the deadline and letting the deadline expire end up the
same way: a running consumer at the same cursor. The only difference is
whether you or the deadline decides the timing.

## When to pause

Two situations cause most pauses.

The first is a **maintenance window**: a planned time when a system the
consumer feeds into goes offline. Say the warehouse API or a database is
down for an upgrade. Rather than let the `shipping` consumer deliver
messages no worker can process, you pause it until the upgrade is done.
The messages stay in the stream, and the consumer resumes on schedule.

The second is **backpressure**: a system the consumer feeds into is
overloaded and can't keep up. Pausing the consumer stops delivery, gives
that system room to recover, and resumes when you choose. The cursor
doesn't move, so nothing is lost and nothing is handled twice.

In both cases, you stop delivery without losing the consumer's place.

## Availability

Pause runs on the consumer's leader, the server that holds the timer for
the deadline. If that leader changes while a consumer is paused, the new
leader takes over the deadline and resumes on time. You don't have to
pause again.

Pausing consumers needs NATS Server 2.11 or later. An older server
rejects the command with a clear message.

The full `PauseUntil` API and the pause notification the server sends are
documented in
[Reference → Consumer API](/reference/jetstream/api/consumer). We use only
the pause and resume commands here.

## Pitfalls

**A paused consumer looks like a stall.** A paused `shipping` consumer
delivers nothing, which is also how a broken consumer behaves. Without
checking, you can't tell a deliberate pause from an outage. Before you
go chasing a stuck consumer, run `nats consumer info ORDERS shipping` and
read the `Paused Until Deadline` line. If it's there, the consumer is
paused on purpose, not failing.

**A deadline in the past does nothing.** Pause stores a fixed moment in
time. If that moment has already passed, the server leaves the consumer
running. The CLI tells you this instead of acting as if the pause took
effect. Pause with a duration like `1h` instead, since it's always
measured from now and can't land in the past.

<div class="nats-example"
     data-type="learn-jetstream-pausing-pastDeadline"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

**Pausing does not stop publishers.** Pause is a consumer setting, so it
doesn't change the stream. New messages keep arriving while the
`shipping` consumer is paused, and they count toward the stream's storage
limits. A long pause on a stream with a tight `MaxMsgs` or `MaxBytes` can
drop the oldest orders before the consumer reads them. Size the stream
for the longest pause you expect, or keep pauses short. See [Shaping
the stream](/learn/jetstream/shaping-the-stream) for how the limits
apply.

## Where you are

The `shipping` consumer has been paused until a deadline and then
resumed. Its cursor stayed where it was: no messages were lost and none
were delivered twice by mistake.

The stream is unchanged, and the consumer is running again at the same
place it held before the pause.

## What's next

With consumers covered, the next page returns to the stream itself: the
[limits and discard policy](/learn/jetstream/shaping-the-stream) that decide
what `ORDERS` keeps and what it drops once it fills up.

## See also

- [Reference → Consumer API](/reference/jetstream/api/consumer) — the
  `PauseUntil` field, the pause response, and the pause advisory.
- [Pull consumers in depth](/learn/jetstream/pull-consumers) — the
  consumer state that pausing preserves.
