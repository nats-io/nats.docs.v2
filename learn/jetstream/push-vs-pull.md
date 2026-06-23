---
id: push-vs-pull
title: "11. Push vs pull"
sidebar_position: 13
description: Why pull is the modern default, what a push consumer is, and when push still fits
---

# 11. Push vs pull

Every consumer in this chapter has been a pull consumer. The `shipping`
consumer asks the server for messages when it's ready for them, in
batches it controls. That's the model we've used since page 4, and it's
the one to reach for first.

There's a second model: the **push consumer**. The server delivers
messages to it on its own, the moment they're stored in the stream. This
page explains what a push consumer is, why pull is the default, and the
cases where push still applies.

Nothing about the `shipping` consumer changes here. This page is a
decision rather than new scenario state. You'll leave knowing how to
choose pull or push on purpose.

## What a push consumer is

A pull consumer waits to be asked; a push consumer is sent messages
without asking.

When you create a push consumer you give it a **deliver subject**: a
core NATS subject the server publishes matching messages to as they
arrive. Your code subscribes to that subject like any other core NATS
subject. From then on, the server sends each message to you. A message
is stored in the stream, the server sends a copy to the deliver subject,
and your subscriber receives it.

The deliver subject is the difference between the two. A consumer with a
deliver subject set is a push consumer; a consumer with no deliver
subject is a pull consumer.

That difference decides who controls the pace. A pull consumer pulls
only as much as it asks for, so a slow worker never receives more than it
requested. A push consumer receives whatever the server sends, so the
server needs a separate way to avoid overwhelming a slow subscriber.

## Why pull is the default

Pull is the modern default for a few concrete reasons.

**Flow control is built in.** A pull consumer never asks for more than
it can handle, because the batch size limits how much arrives. Page 8
covered the settings: `batch`, `expires`, and `MaxAckPending` cap how
much is in flight at once. A push consumer has no such cap by default;
the server sends messages no matter what the subscriber can handle.

**Adding capacity means adding more pullers.** Page 9 put three workers
on the `shipping` consumer by pointing all three at the same consumer
name. The server splits the stream across them. A push consumer needs a
separate queue group to share the load across subscribers.

**The newer features are pull-only.** Priority groups from page 9 don't
exist for push consumers; the server rejects them with `priority
groups can not be used with push consumers`. As JetStream grows, new
features land on pull first, and some land only on pull.

One more reason settles it for new code: push consumers are deprecated.
The `nats` CLI warns when it subscribes to one
(`push consumers are deprecated and will be removed in a future release`),
and the client libraries mark the push API the same way. New code should
not create a push consumer.

## The decision

For new code, the decision is short.

| You want… | Reach for |
|---|---|
| A long-running worker processing a continuous flow | **pull** (consume) |
| A batch job that drains what's waiting and exits | **pull** (fetch) |
| A pool of workers sharing one stream | **pull** (shared consumer) |
| Priority groups, overflow, or pinned delivery | **pull** (push can't) |
| To keep an existing push consumer running | **push** (until you migrate) |

The only row that points at push is the last one. For a service that
doesn't exist yet, the answer is pull.

## When push still applies

Push consumers still come up for two reasons.

The first is existing systems. A push consumer created years ago keeps
working. The server still supports the model. If you inherit one, you
don't have to migrate the day you find it, but plan to, because it's
deprecated.

The second is a handful of older client patterns built on a deliver
subject, such as ordered delivery helpers. Those patterns came before the
pull versions. Today's client libraries offer pull-based versions of the
same helpers, so new code doesn't need the push form.

The two models aren't interchangeable on the server, so you can't switch a
consumer from one to the other. The server refuses with `can not update
push consumer to pull based`. To migrate, you delete the push consumer
and create a pull consumer in its place, with the same
`nats consumer add ... --pull` you already know from page 4.

## Push delivery options

A push consumer has settings a pull consumer doesn't, because the server
is sending the messages. You won't configure any of them here. Each one
below is the push form of something you already met on the pull side,
named so you recognize it in a config you inherit.

**Flow control** lets the server pace delivery to a slow subscriber. When
it's on, the server checks now and then that the subscriber is keeping
up, and slows delivery when it isn't. A pull consumer doesn't need this,
because asking for a batch sets the pace.

**Idle heartbeats** let the subscriber tell "no messages right now" apart
from "the connection died." On a quiet stream the server sends an empty
heartbeat at a set interval; if several go missing, the subscriber knows
delivery has stalled. Pull consumers get the same signal from the
heartbeat on a pull request, which page 7 covered.

A push consumer may also name a **deliver group** so several subscribers
on one deliver subject share the load, the way a core NATS queue group
does. It's the push version of the worker pool from page 8.

The full set of push delivery options (flow control, idle heartbeats,
and deliver group) is documented in
[Reference → Consumer Configuration](/reference/jetstream/api/consumer).
We don't configure them here, because new code shouldn't need them.

## Creating a push consumer (for contrast)

For completeness, here's how you create a push consumer from the CLI.
The `--target` flag sets the deliver subject, and setting it is what
makes the consumer a push consumer:

<div class="nats-example"
     data-type="learn-jetstream-push-vs-pull-push-create"
     data-languages="cli"></div>

The consumer is created without error. The deprecation warning comes
later, when you subscribe to it: `nats sub` against a push consumer prints
`push consumers are deprecated and will be removed in a future release`.
Read that warning as a sign to use pull instead.

This command is here so you recognize a push consumer when you see one,
not as a pattern to copy. The `shipping` consumer stays pull, and so
should anything you build next.

## Pitfalls

These traps are about reaching for push when pull is the right tool, and
about misreading the deliver group.

**Choosing push for new work.** Push can look simpler: the server sends
you messages, with no fetch loop to write. For new code that's the wrong
choice. Push consumers are deprecated, and the `nats` CLI prints a warning
whenever it subscribes to one. Don't start a new service on push to save a
few lines; use pull, and write the consume loop. If you inherit a push
consumer, plan to migrate, because the server won't switch it in place:
`nats consumer edit` fails with `can not update push consumer to pull
based`. To migrate, delete the push consumer and recreate it as pull.

<div class="nats-example"
     data-type="learn-jetstream-push-vs-pull-migrate-to-pull"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

**Assuming push paces itself.** A pull consumer can't outrun a slow
worker, because the batch size limits how much arrives, as page 7 covered.
A push consumer has no such limit. The server sends the message the moment
it is stored, and a subscriber that falls behind trips the server's
**slow consumer** guard: the connection is closed and counted in the
`slow_consumers` monitoring stat. The push answer is flow control and idle
heartbeats, the options named earlier on this page, which pull doesn't
need. Don't run a push consumer on a high-volume stream without flow
control enabled; with pull, the pacing is built in.

**Reading a deliver group as a worker pool.** A deliver group is a core
NATS queue group on the deliver subject. It shares messages among
subscribers that join the group. A plain subscriber to the same deliver
subject ignores the group and receives every message, so two subscribers
that don't join the group each get every message instead of sharing.
Subscribe with the matching group, not bare; or, for new code, use a
shared pull consumer from [page 8](/learn/jetstream/worker-pool), where
one consumer name already splits the stream across workers with no group
to get wrong.

<div class="nats-example"
     data-type="learn-jetstream-push-vs-pull-deliver-group-bind"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

## Where you are

You still have one stream, `ORDERS`, and one pull consumer, `shipping`.
No scenario state changed on this page. What changed is the decision you
can now make: pull for everything new, push only when you inherit an
existing one, and a plan to migrate it when you do.

## What's next

The next page returns to the stream itself. With consumers covered, you
shape how the stream stores messages: the retention and limit policies
that decide what the stream keeps and what it removes.

## See also

- [Reference → Consumer Configuration](/reference/jetstream/api/consumer)
  — every consumer option, including the push-only deliver subject, flow
  control, idle heartbeat, and deliver group fields.
- [7. Pull consumers in depth](/learn/jetstream/pull-consumers) — the
  pull model this page recommends, with fetch, consume, and the bounding
  knobs.
