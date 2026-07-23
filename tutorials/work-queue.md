---
id: work-queue
title: "3. Share work across workers"
sidebar_position: 4
description: Use a queue group to split a workload across two workers, so each message goes to exactly one of them
---

In this tutorial you'll run two workers that share one subject and watch
the server split the work between them. You'll publish six messages to
`tasks`, and each one goes to exactly one worker — never both. That's a
**queue group**: a pool of subscribers that share a name and divide the
load.

<div class="nats-flow" data-scenario="queueGroupAnimated" data-width="600" data-height="350"></div>

## What you'll need

- `nats-server` and the `nats` CLI installed. If you haven't installed
  them yet, do the [Hello NATS](/tutorials/hello-nats) tutorial first.
- Four terminal windows: one for the server, two for the workers, and one
  to publish.

## Step 1: Start the server

In the first terminal, start `nats-server`:

```bash
nats-server
```

You should see startup logs ending with a ready line:

```
[INF] Server is ready
```

Leave it running.

## Step 2: Start the first worker

In the second terminal, subscribe to the `tasks` subject as a member of
the `workers` queue group. The `--queue` flag is what makes this a queue
group member instead of a plain subscriber:

<div class="nats-example" data-type="tutorials-work-queue-worker" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

You should see the worker waiting for messages:

```
17:42:10 Subscribing on tasks
```

Leave it running.

## Step 3: Start the second worker

In the third terminal, run the exact same command. Because it names the
same queue group `workers` on the same subject `tasks`, it joins the same
group:

<div class="nats-example" data-type="tutorials-work-queue-worker" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

You should see the same waiting line:

```
17:42:18 Subscribing on tasks
```

You now have two workers in one group. Both terminals are idle; neither
has received anything yet.

## Step 4: Publish the work

In the fourth terminal, publish six messages to `tasks`. The `--count`
flag repeats the publish six times, and the CLI replaces `{{ Count }}`
with the message number:

<div class="nats-example" data-type="tutorials-work-queue-publish" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

You should see the publisher confirm one line per message:

```
17:42:30 Published 6 bytes to "tasks"
17:42:30 Published 6 bytes to "tasks"
17:42:30 Published 6 bytes to "tasks"
17:42:30 Published 6 bytes to "tasks"
17:42:30 Published 6 bytes to "tasks"
17:42:30 Published 6 bytes to "tasks"
```

## Step 5: Watch the split

Look at your two worker terminals. The six messages are split between
them: each worker receives some, and no message appears in both. One
terminal might show:

```
[#1] Received on "tasks"
task 1

[#2] Received on "tasks"
task 3

[#3] Received on "tasks"
task 5
```

and the other:

```
[#1] Received on "tasks"
task 2

[#2] Received on "tasks"
task 4

[#3] Received on "tasks"
task 6
```

The server picks one member per message, so the exact split varies. What
never varies: every message goes to exactly one worker.

Publish again to see it balance once more:

<div class="nats-example" data-type="tutorials-work-queue-publish" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

The new batch spreads across the two workers the same way. Press Ctrl-C
in each terminal to stop.

## What you built

Two workers shared the `tasks` subject through the `workers` queue group,
and the server delivered each message to exactly one of them. Add a third
worker with the same command and the group resizes itself. The work
spreads across all three with no extra setup.

## Next

- Build a stream that keeps messages so a worker can replay them later:
  [First stream](/tutorials/first-stream).
- Understand how the server picks a member, how groups resize live, and
  when to reach for a durable work queue instead:
  [Queue groups deep dive](/learn/core-nats/queue-groups).
