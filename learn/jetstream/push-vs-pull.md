---
id: push-vs-pull
title: "11. Push vs pull"
sidebar_position: 13
description: Why pull is the modern default, what a push consumer is, and when push still fits
---

# 11. Push vs pull

Every consumer in this chapter has been a pull consumer. The `shipping`
consumer asks the server for messages when it's ready for them, in
batches it controls. That's the model we've leaned on since page 4,
and it's the one to reach for first.

There's a second model: the **push consumer**. The server delivers
messages to it unprompted, the moment they're stored in the stream. No
page asked for one, and that's on purpose. This page explains what a
push consumer is, why pull is the default, and the narrow cases where
push still earns its place.

Nothing about the `shipping` consumer changes here. This page is a
decision, not a new piece of scenario state. You'll leave knowing how to
choose pull or push on purpose, not by accident.

## What a push consumer is

A pull consumer waits to be asked. A push consumer does not.

When you create a push consumer you give it a **deliver subject**: a
core NATS subject the server publishes matching messages to as they
arrive. Your code subscribes to that subject like any other core NATS
subject. From then on, the server drives delivery: a message lands in
the stream, the server pushes a copy to the deliver subject, your
subscriber receives it.

The deliver subject is the whole difference on the wire. A consumer
config with a deliver subject set is a push consumer. A config with no
deliver subject is a pull consumer. There's no other switch.

That difference flips who controls the pace. A pull consumer pulls only
as much as it asks for, so a slow worker never receives more than it
requested. A push consumer receives whatever the server pushes, so the
server needs a separate mechanism to keep from overwhelming a slow
subscriber.

## Why pull is the default

Pull is the modern default for a short list of concrete reasons.

**Flow control is built in.** A pull consumer never asks for more than
it can handle: the batch size is the brake. Page 8 covered the knobs:
`batch`, `expires`, and `MaxAckPending` bound exactly how much is in
flight. A push consumer has no such brake by default; the server pushes,
and the subscriber copes.

**Scaling out is just more pullers.** Page 9 put three workers on the
`shipping` consumer by pointing all three at the same consumer name. The
server splits the stream across them. A push consumer needs a separate
queue construct to share load across subscribers.

**The newer features are pull-only.** Priority groups from page 9 don't
exist for push consumers; the server rejects them with `priority
groups can not be used with push consumers`. As JetStream grows, the new
capabilities land on pull first, and some only on pull.

There's one more reason, and it's the decisive one for new code: push
consumers are deprecated. The `nats` CLI warns when it subscribes to one
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

The only row that points at push is the last one. If you're reading
this for a service that doesn't exist yet, the answer is pull.

## When push still appears

You'll still meet push consumers, for two reasons.

The first is existing systems. A push consumer created years ago keeps
working. The server maintains the model; it hasn't gone away yet. If
you inherit one, you don't have to migrate the day you find it, but
plan to, because the deprecation is real.

The second is a handful of older client patterns built on a deliver
subject: ordered delivery helpers and the like. Those patterns predate
the pull equivalents. Modern client libraries offer pull-based versions
of the same conveniences, so new code doesn't need the push form.

Because the two models aren't interchangeable on the server, you can't
flip a consumer from one to the other. The server refuses with `can not
update push consumer to pull based`. Migration means deleting the push
consumer and creating a pull consumer in its place, with the same
`nats consumer add ... --pull` you already know from page 4.

## What push delivery needs to stay alive

A push consumer carries machinery a pull consumer doesn't, because the
server is driving. You won't configure any of it; each piece below is
just the push form of something you already met on the pull side, named
here so you recognize it in an inherited config.

**Flow control** lets the server pace itself to a slow subscriber.
Turned on, the server periodically asks the subscriber to confirm it's
keeping up, and slows delivery when it isn't. A pull consumer needs none
of this — asking for a batch _is_ the pacing.

**Idle heartbeats** let the subscriber tell "no messages right now" apart
from "the connection died." On a quiet stream the server sends an empty
heartbeat at a set interval; miss several and the subscriber knows
delivery has stalled. Pull consumers get the same signal from the
heartbeat on a pull request, which page 7 already covered.

A push consumer may also name a **deliver group** so several subscribers
to one deliver subject share the load, the way a core NATS queue group
does. It's the push answer to the worker pool from page 8.

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

The consumer is created without complaint. The deprecation warning comes
later, when you subscribe to it: `nats sub` against a push consumer prints
`push consumers are deprecated and will be removed in a future release`.
Treat that warning as the signal to use pull instead.

This command is here so you recognize a push consumer when you see one,
not as a pattern to copy. The `shipping` consumer remains pull, and so
should anything you build next.

## Pitfalls

These traps cluster around reaching for push when pull is the right tool,
and around the one push feature people most often misread.

**Choosing push for new work.** Push feels simpler: the server hands you
messages, no fetch loop to write. That instinct is now the wrong one. Push
consumers are deprecated, and the `nats` CLI prints a warning whenever it
subscribes to one. Don't start a new service on push to save a few lines;
reach for pull, and write the consume loop. If you inherit a push consumer,
plan to migrate, because the server refuses to flip it in place: `nats
consumer edit` fails with `can not update push consumer to pull based`.
Migration means delete the push consumer and recreate it as pull.

<div class="nats-example"
     data-type="learn-jetstream-push-vs-pull-migrate-to-pull"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

**Trusting push to pace itself.** A pull consumer can't outrun a slow
worker; the batch size is the brake, as page 7 covered. A push consumer
has no such brake. The server pushes the moment a message is stored, and a
subscriber that falls behind trips the server's **slow consumer** guard:
the connection is closed and counted in the `slow_consumers` monitoring
stat. The push answer is flow control and idle heartbeats, the machinery
named earlier on this page; those are extra moving parts pull doesn't
need. Don't run a push consumer on a hot stream without flow control
enabled; better yet, use pull, where the pacing is free.

**Reading a deliver group as a worker pool.** A deliver group is a core
NATS queue group on the deliver subject, nothing more. It distributes
messages among subscribers that join the group, but a plain subscriber to
the same deliver subject ignores the group and receives the full firehose,
so two unwitting subscribers each get every message instead of sharing.
Subscribe with the matching group, not bare; or, for new code, use a shared
pull consumer from [page 8](/learn/jetstream/worker-pool), where one
consumer name already splits the stream across workers with no group to get
wrong.

<div class="nats-example"
     data-type="learn-jetstream-push-vs-pull-deliver-group-bind"
     data-languages="cli,js,go,python,java,rust,csharp"></div>

## Where you are

You still have one stream, `ORDERS`, and one pull consumer, `shipping`.
No scenario state changed on this page. What changed is your ability to
choose: pull for everything new, push only when an existing system hands
it to you, and a plan to migrate when it does.

## What's next

The next page turns back to the stream itself. With consumers well
understood, you shape how the stream stores messages: the retention and
limit policies that decide what the stream keeps and what it lets go.

## See also

- [Reference → Consumer Configuration](/reference/jetstream/api/consumer)
  — every consumer option, including the push-only deliver subject, flow
  control, idle heartbeat, and deliver group fields.
- [7. Pull consumers in depth](/learn/jetstream/pull-consumers) — the
  pull model this page recommends, with fetch, consume, and the bounding
  knobs.
