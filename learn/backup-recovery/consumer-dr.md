---
id: consumer-dr
title: Consumer DR
sidebar_position: 3
description: Keep consumer positions close to current at the DR site with paused consumers on the mirror, ack floors in a mirrored KV bucket, and a consumer reset on failover
---

# Consumer DR

The [mirror](./mirrors-and-sources.md) on `west` holds every message of
`ORDERS`. It doesn't hold the consumers. This page sets up the consumers at
the DR site so that, after a failover, they continue close to where they
stopped on `east`, rather than from the start of the stream.

## Consumers are local

A mirror copies messages, not consumers. The `shipping` consumer on `east`,
with its delivery position and its acknowledgments, exists only in the
`east` domain. After you promote the mirror, `west` has the messages but no
`shipping` consumer.

You can create the consumer on `west` during the failover, but then you have
to choose where it starts. Start it at the beginning and it redelivers every
order. Start it at the end and it skips the orders `east` hadn't processed
yet. Neither is what you want.

## Set a consumer's position

From NATS 2.14 you can move an existing consumer to a position with a
**consumer reset**, the `$JS.API.CONSUMER.RESET.<stream>.<consumer>` API.
The request names a stream sequence:

```json
{ "seq": 1043 }
```

The consumer delivers message `1043` next, and its ack floor becomes `1042`.
The **ack floor** is the stream sequence up to which every message has been
acknowledged. The reset works for consumers whose deliver policy is `all`, a
start sequence, or a start time, and never moves below their configured
start. The request and response are documented in
[Reference → Consumer reset](/reference/jetstream/api/consumer/reset).

The mirror keeps `east`'s sequence numbers, and the promoted stream
continues them. So an ack floor read on `east` points at the same message on
`west`. That makes a best-effort sync possible:

1. Create the consumers on the mirror ahead of time, paused.
2. Regularly read each consumer's ack floor on `east` and store it in a KV
   bucket.
3. Mirror that bucket to `west`.
4. On failover, reset each consumer on `west` to the stored ack floor plus
   one, then resume it.

The sync is best effort. The consumer on `east` keeps acknowledging messages
after the last ack floor you stored, and the stored value needs time to reach
`west`. Those messages are delivered again after the failover. The consumer
gives you at-least-once delivery in any case; the sync keeps the window of
duplicates small. It's at most the interval between two syncs plus the
bucket mirror's lag. Applications that must not process a message twice
still need to detect duplicates themselves, for example by order ID.

## Step 1 — create the sync bucket and mirror it

Create a KV bucket on `east` for the ack floors, and a mirror of it on
`west`. The bucket is called `SYNC_CONSUMER`, and each key is
`<stream>.<consumer>`, for example `ORDERS.shipping`. Stream and consumer
names can't contain a `.`, so the key always splits back into the two names.

<div class="nats-example" data-type="learn-backup-recovery-consumer-dr-createSyncBucket" data-languages="cli"></div>

The bucket mirror follows the same rules as the `ORDERS` mirror: it lives in
the `west` domain, survives the loss of `east`, and holds the last values it
received. Key-value buckets are covered in
[Key-Value](/learn/key-value).

## Step 2 — create the consumers on the mirror, paused

Create each consumer on the `ORDERS` mirror on `west` with the same
configuration it has on `east`, and pause it with `pause_until` set far in
the future. Pausing consumers is available from NATS 2.11.

<div class="nats-example" data-type="learn-backup-recovery-consumer-dr-precreateConsumer" data-languages="cli"></div>

A paused consumer delivers nothing, so applications connected to `west` can't
take messages from it by mistake while `east` is still the primary. Use the
deliver policy `all` so the reset in step 4 is allowed to set any position.

Creating the consumers ahead of time means the failover doesn't depend on
having their configuration at hand during an outage.

## Step 3 — store the ack floor regularly

On `east`, read each consumer's ack floor and write it to the bucket:

<div class="nats-example" data-type="learn-backup-recovery-consumer-dr-storeAckFloor" data-languages="cli"></div>

Run this at a fixed interval for every consumer you want to sync. The value
is the stream sequence of the ack floor, `ack_floor.stream_seq` in the
consumer info. The bucket mirror on `west` picks up each new value on its
own.

## Step 4 — on failover, reset and resume

After you [promote the mirror](./disaster-recovery.md#failover-promote-the-mirror),
read the last ack floor from the mirrored bucket and reset the consumer to
the next sequence:

<div class="nats-example" data-type="learn-backup-recovery-consumer-dr-applyReset" data-languages="cli"></div>

Then lift the pause:

<div class="nats-example" data-type="learn-backup-recovery-consumer-dr-resumeConsumer" data-languages="cli"></div>

The consumer delivers from the message after the stored ack floor. Messages
that `east` had acknowledged after the last sync are delivered again; that's
the duplicate window from above.

The bucket's mirror stops with `east`, like the `ORDERS` mirror. Its last
value is the most recent ack floor that reached `west` before the outage.

The two mirrors don't stop at the same moment. If the `ORDERS` mirror was
further behind than the bucket, the stored ack floor can be higher than the
last message on `west`. A reset past the end of the stream would make the
consumer skip the first new messages written on `west`, so the example caps
the reset at the stream's last sequence plus one.

## How often to sync

Reading consumer info isn't free. Each request is handled by the consumer's
leader, and for a busy consumer it means work on every call. Syncing every
consumer every few hundred milliseconds adds load to the cluster you're
trying to protect.

Pick a moderate interval, typically seconds, based on how many duplicates
your applications can tolerate after a failover. Two things keep the cost
down:

- Write to the bucket only when the ack floor changed. An idle consumer
  then costs one consumer info per interval and no KV write.
- For many consumers on one stream, the consumer list API,
  `$JS.API.CONSUMER.LIST.<stream>`, returns the info of all of them in one
  request.

## Who runs the sync

The sync can run in one of two places:

- **In the clients.** An application knows which messages it acknowledged.
  It can write its consumer's position to the bucket itself, for example
  after each batch it processed. This fits well into a shared consumer
  framework or library that all your services use, so each service gets it
  without its own code.
- **In a background agent.** A separate process, outside the application
  code, reads the consumer info of every consumer to sync and writes the
  ack floors to the bucket. It needs no change to the applications, and one
  agent can cover all of them.

In both cases the failover side, resetting and resuming the consumers on
`west`, is a step of your runbook or of the same agent.

## Failback

When you move back to `east` as described in
[Failback](./disaster-recovery.md#failback-move-back-to-east), the roles swap.
Run the sync from `west` to `east` while `west` is the primary, with the
bucket mirrored the other way, and reset and resume the consumers on `east`
during the cutover.

## Pitfalls

**Consumers aren't mirrored.** Without this setup, the consumers on `west`
start from wherever you create them. Plan the positions before the outage.

**The sync is best effort.** Messages acknowledged on `east` after the last
stored ack floor are delivered again. Size the sync interval to the number of
duplicates you can tolerate, and make processing safe to repeat.

**Consumer info costs the cluster.** Don't poll every consumer at a high
rate. Write only changed values, and use the consumer list API for many
consumers on one stream.

**Reset only works for some deliver policies.** A consumer created with deliver
policy `new` or `last` can't be reset. Create the consumers on the mirror with
`all`.

**Don't reset past the end of the stream.** The stored ack floor can be
ahead of the promoted stream when the `ORDERS` mirror lagged more than the
bucket. Cap the reset at the stream's last sequence plus one.

**Keep the consumer configs in step.** A consumer on `west` with a different
filter or ack policy than on `east` delivers different messages. Update both
when you change one.

## Where you are

You now have paused copies of the consumers on the `west` mirror, their ack
floors stored and mirrored in the `SYNC_CONSUMER` bucket, and a failover step
that resets and resumes them. Next is the runbook that puts the mirror and
the consumers to use when `east` fails.

## What's next

Continue to [Disaster recovery](./disaster-recovery.md).

## See also

- [Mirrors as a DR tool](./mirrors-and-sources.md) — the `ORDERS` mirror the
  consumers run on.
- [Disaster recovery](./disaster-recovery.md) — promotion and failback.
- [Key-Value](/learn/key-value) — the bucket that holds the ack floors.
- [Reference → Consumer reset](/reference/jetstream/api/consumer/reset) — the
  reset request and its constraints.
- [Reference → Consumer pause](/reference/jetstream/api/consumer/pause) —
  `pause_until` and resuming a consumer.
