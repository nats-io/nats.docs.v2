---
id: pausing
title: "11. Pausing a consumer"
sidebar_position: 12
description: Stop delivery to a consumer until a deadline, then resume where it left off
---

# 11. Pausing a consumer

The `shipping` consumer has been running fine. Sometimes you want it to
stop for a while — not forever, just for a window — and then pick up
exactly where it was.

You could delete the consumer and recreate it later. That throws away
everything it tracked: which messages it acked, where its cursor sits.
On the next page that is a heavy hammer for a light job.

Pausing is the light job. A **paused** consumer stops receiving
messages until a deadline you set, and keeps all of its state while it
waits.

## What pausing keeps

Pausing changes one thing: the server stops handing messages to the
consumer.

Everything else stays put. The cursor — the sequence number the
consumer has worked up to — does not move. Acked messages stay acked.
Redelivery counters stay as they were. When the pause ends, delivery
resumes from the exact position it stopped at.

This is the difference between pausing and deleting. A deleted consumer
forgets. A paused consumer remembers, and waits.

## Pause until a deadline

A pause is not open-ended. You pause a consumer *until* a moment in
time. When that moment arrives, the consumer resumes on its own — no
second command needed.

Pause the `shipping` consumer for one hour:

<div class="nats-example"
     data-type="learn-jetstream-pausing-pauseResume"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

The CLI accepts two forms for the deadline. A duration like `1h` or
`30m` means "from now." A timestamp like `2026-05-22 14:30:00` means
that exact wall-clock time. Either way the server stores an absolute
deadline.

The command confirms the pause and the time remaining:

```
Paused ORDERS > shipping until 2026-05-22 11:14:22 (59m58s)
```

While the consumer is paused, the stream keeps accepting publishes as
normal. Messages pile up behind the cursor, waiting. The pause stops
delivery, not storage — the stream does not care that a consumer is
asleep.

## Check the pause from consumer info

`nats consumer info` reports the pause state, so you never have to
guess whether a consumer is asleep:

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

The cursor values — last delivered, acknowledgment floor — are exactly
where they were before the pause. The consumer is holding its place.

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

Resuming before the deadline and letting the deadline expire reach the
same end state: a running consumer at the same cursor. The only
difference is who decides the timing — you, or the clock.

## Why you would reach for this

Two patterns drive most pauses.

The first is a **maintenance window**. A downstream system — the
warehouse API, a database — goes offline for a planned upgrade. Rather
than let the `shipping` consumer deliver messages no worker can process,
you pause it until the window closes. The messages wait in the stream;
the consumer resumes on schedule.

The second is **deliberate backpressure**. A downstream system is
overloaded right now. Pausing the consumer stops the flow at the
source, gives the downstream room to recover, and resumes when you say
so. The cursor never moves, so nothing is lost and nothing is
double-processed.

In both cases the win is the same: stop delivery without losing your
place.

## A note on availability

Pause runs on the consumer's leader, and the leader holds the timer
that fires at the deadline. If the leader changes while a consumer is
paused, the new leader inherits the deadline and resumes on time. You do
not have to re-issue the pause.

Pausing consumers requires NATS Server 2.11 or later. On an older
server the command is rejected with a clear message.

The full `PauseUntil` API and the consumer pause advisory the server
emits are documented in
[Reference → Consumer API](/reference/jetstream/api/consumer). We use only
the pause and resume commands here.

## Where you are

The `shipping` consumer has been paused until a deadline and then
resumed. Through both, its cursor stayed exactly where it was — no
messages were lost, none were redelivered by mistake.

The stream is unchanged. The consumer is running again, at the same
position it held before the pause.

## What is next

So far every consumer in this chapter has been a pull consumer. The next
page steps back to ask the larger question: when does a [push
consumer](/learn/jetstream/push-vs-pull) make sense instead, and why
this chapter chose pull.

## See also

- [Reference → Consumer API](/reference/jetstream/api/consumer) — the
  `PauseUntil` field, the pause response, and the pause advisory.
- [8. Pull consumers in depth](/learn/jetstream/pull-consumers) — the
  consumer state that pausing preserves.
