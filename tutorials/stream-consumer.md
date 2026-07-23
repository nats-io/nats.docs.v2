---
id: stream-consumer
title: "5. A consumer that survives restarts"
sidebar_position: 6
description: Read a stream with a durable consumer, acknowledge each message, and resume where you left off after a restart
---

# 5. A consumer that survives restarts

In the [previous tutorial](/tutorials/first-stream) you stored messages in a
**stream**. Now you'll read them with a durable **consumer**: pull each
message, acknowledge it, then stop and start again and watch the consumer
pick up exactly where it left off — no message read twice, none skipped.

<div class="nats-flow" data-scenario="jetStreamConsumersAnimated" data-width="600" data-height="350"></div>

## What you'll need

- The `nats` CLI installed.
- A `nats-server` running with JetStream enabled, and the `EVENTS` stream with a
  few messages in it, which is what you set up in
  [Tutorial 4: Persist messages with JetStream](/tutorials/first-stream). Keep
  that server running.

## Step 1: Start from a clean set of three messages

So the sequence numbers in this tutorial line up, reset the `EVENTS` stream to
a known state. Purging a stream keeps counting sequences from where it left
off, so instead delete the stream you created in Tutorial 4 and re-create it,
which starts sequences again at 1:

```bash
nats stream rm EVENTS --force
nats stream add EVENTS --subjects "events.>" --defaults
```

The delete prints nothing; the re-create prints the new stream's configuration,
ending with:

```
Stream EVENTS was created
```

Now publish three fresh messages for the consumer to work through:

```bash
nats pub events.page_loaded '{"page":"/home"}' --jetstream
nats pub events.input_changed '{"field":"email"}' --jetstream
nats pub events.page_loaded '{"page":"/pricing"}' --jetstream
```

You should see each publish confirmed by the server, along with the sequence
the stream assigned it:

```
14:22:01 Published 16 bytes to "events.page_loaded"
14:22:01 Stored in Stream: EVENTS Sequence: 1
14:22:01 Published 17 bytes to "events.input_changed"
14:22:01 Stored in Stream: EVENTS Sequence: 2
14:22:01 Published 19 bytes to "events.page_loaded"
14:22:01 Stored in Stream: EVENTS Sequence: 3
```

Confirm the stream now holds exactly your three messages:

```bash
nats stream info EVENTS
```

You should see a `Messages` count of `3` in the `State` block.

## Step 2: Add a durable consumer

Create a durable pull consumer named `worker` on the `EVENTS` stream. A pull
consumer hands you messages when you ask for them, and acknowledges them one at
a time.

<div class="nats-example" data-type="tutorials-stream-consumer-add-consumer" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

You should see the consumer created and its configuration printed:

```
Information for Consumer EVENTS > worker

Configuration:

                    Name: worker
               Pull Mode: true
          Deliver Policy: All
              Ack Policy: Explicit
```

Naming the consumer `worker` makes it **durable**: the server keeps it (and its
place in the stream) by name after you stop pulling.

## Step 3: Pull and acknowledge a message

Ask the consumer for its next message and acknowledge it:

<div class="nats-example" data-type="tutorials-stream-consumer-pull-and-ack" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

You should see the first message, followed by the acknowledgment:

```
[14:23:10] subj: events.page_loaded / tries: 1 / cons seq: 1 / str seq: 1 / pending: 2

{"page":"/home"}

Acknowledged message
```

`{"page":"/home"}` is the message body, the first one you published. `pending: 2`
tells you two more messages are waiting, and the `Acknowledged message` line
confirms the server recorded that you're done with this one.

Run the same command once more to read and acknowledge the second message:

```bash
nats consumer next EVENTS worker --ack
```

You should see `{"field":"email"}`, with `cons seq: 2` and `pending: 1`.

## Step 4: Check how far you've read

Look at how far the consumer has progressed:

```bash
nats consumer info EVENTS worker
```

In the `State` block you should see it sitting after the two messages you acked:

```
State:

   Last Delivered Message: Consumer sequence: 2 Stream sequence: 2
     Acknowledgment Floor: Consumer sequence: 2 Stream sequence: 2
         Outstanding Acks: 0 out of maximum 1,000
```

`Acknowledgment Floor` shows you've acknowledged through message 2, so the next
pull will hand you message 3.

## Step 5: Restart and resume

Now simulate a restart. Stop the server with `Ctrl+C` in its terminal, then
start it again the same way you did in Tutorial 4 so it reads the stream and
consumer back from where it stored them:

```bash
nats-server -js
```

The stream and the consumer come back exactly as they were. Pull the next
message:

```bash
nats consumer next EVENTS worker --ack
```

You should see the third message, not the first:

```
[14:25:40] subj: events.page_loaded / tries: 1 / cons seq: 3 / str seq: 3 / pending: 0

{"page":"/pricing"}

Acknowledged message
```

The consumer picked up right where it left off. `pending: 0` means you've now
read every message. Nothing was redelivered, and nothing was missed.

## What you built

A durable consumer that pulls messages from a stream, acknowledges each one, and
resumes after a restart, so your reader always picks up exactly where it left
off, with nothing read twice and nothing skipped.

## Next

- Next tutorial: [Build a tiny state store with Key-Value](/tutorials/key-value).
- Now understand the why (acknowledgment, redelivery, and how the cursor
  works): [JetStream deep dive: Delivery and acknowledgment](/learn/jetstream/delivery-and-acknowledgment).
