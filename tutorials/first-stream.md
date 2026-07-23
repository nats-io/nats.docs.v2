---
id: first-stream
title: "4. Persist messages with JetStream"
sidebar_position: 5
description: Create your first stream, publish to it, and replay stored messages
---

# 4. Persist messages with JetStream

So far your messages have been fleeting: a subscriber that isn't listening at
the moment you publish never sees them. In this tutorial you turn on JetStream,
create a **stream** that stores messages durably, publish a few, and then
**replay** them from the very beginning. By the end you'll have proof that
the messages survived, sitting in storage, ready to read again.

<div class="nats-flow" data-scenario="jetStreamContrastAnimated" data-width="600" data-height="350"></div>

## What you'll need

- `nats-server` and the `nats` CLI installed (from [Hello NATS](/tutorials/hello-nats)).
- A terminal. You'll start the server in one and run commands in another.

## Step 1: Start the server with JetStream

Stop any server you started earlier, then start a new one with the `-js` flag.
That flag turns on JetStream, the subsystem that stores messages.

```bash
nats-server -js
```

You should see a startup log that mentions JetStream, including a line like:

```
[INF] Starting JetStream
[INF] Server is ready
```

Leave this running. Open a second terminal for the remaining steps.

## Step 2: Create a stream

In the second terminal, create a stream named `EVENTS` that captures every
subject beginning with `events.`. The `--defaults` flag fills in sensible
starting values so you aren't prompted for anything.

<div class="nats-example" data-type="tutorials-first-stream-create" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

You should see output ending with:

```
Stream EVENTS was created
```

Your stream now exists and is waiting for messages.

## Step 3: Publish a few messages

Publish three messages to subjects under `events.`. Because each subject matches
the stream, the server stores every one.

<div class="nats-example" data-type="tutorials-first-stream-publish" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

For each publish you should see two lines: one confirming the message was sent,
and one confirming the stream stored it with an assigned sequence number:

```
13:42:01 Published 16 bytes to "events.page_loaded"
13:42:01 Stored in Stream: EVENTS Sequence: 1
13:42:01 Published 17 bytes to "events.input_changed"
13:42:01 Stored in Stream: EVENTS Sequence: 2
13:42:01 Published 19 bytes to "events.page_loaded"
13:42:01 Stored in Stream: EVENTS Sequence: 3
```

Confirm the stream now holds three messages:

```bash
nats stream info EVENTS
```

You should see a `State` block reporting three messages:

```
State:

             Messages: 3
                Bytes: 159 B
       First Sequence: 1 @ 2026-06-09 13:42:01
        Last Sequence: 3 @ 2026-06-09 13:42:01
     Active Consumers: 0
   Number of Subjects: 2
```

## Step 4: Replay the stored messages

Now read the messages back. This replays every message the stream holds, oldest
first, starting from the very first one. Nothing is removed: replaying a stream
is a read.

<div class="nats-example" data-type="tutorials-first-stream-replay" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

You should see all three messages, in the order they were published:

```
[#1] Received JetStream message: stream: EVENTS seq: 1 / pending: 2 / subject: events.page_loaded / time: 2026-06-09 13:42:01
{"page":"/home"}

[#2] Received JetStream message: stream: EVENTS seq: 2 / pending: 1 / subject: events.input_changed / time: 2026-06-09 13:42:01
{"field":"email"}

[#3] Received JetStream message: stream: EVENTS seq: 3 / pending: 0 / subject: events.page_loaded / time: 2026-06-09 13:42:01
{"page":"/pricing"}
```

The command exits on its own once it's read everything stored. Run it again
and you'll see the same three messages: the stream still has them.

## What you built

You enabled JetStream, created the `EVENTS` stream, published three messages into
it, and replayed all three back from storage. And they were still there to read
again afterward.

## Next

- Next tutorial: [Read a stream with a durable consumer](/tutorials/stream-consumer)
  — a reader that tracks what it's processed and resumes after a restart.
- Understand how this works: the [JetStream deep dive](/learn/jetstream) explains
  what a stream really is, and [Your first stream](/learn/jetstream/your-first-stream)
  walks through every value JetStream filled in for you.
