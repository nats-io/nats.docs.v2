---
id: request-reply
title: "2. Request and reply"
sidebar_position: 3
description: Build a tiny responder service and call it with a request that gets one answer back
---

# 2. Request and reply

In [Hello NATS](/tutorials/hello-nats) a publisher sent a message and never
heard back. This time you'll build a two-way conversation: a small **responder**
that answers questions on a subject, and a **request** that calls it and gets
exactly one reply. By the end you'll start a `time` service in one terminal
and ask it for the time from another.

<div class="nats-flow" data-scenario="requestReply" data-width="600" data-height="350"></div>

## What you'll need

- The `nats` CLI and a running `nats-server` from
  [Hello NATS](/tutorials/hello-nats). If the server isn't running, start it:

  ```bash
  nats-server
  ```

- Two terminals: one for the responder, one for the request.

## Step 1: Start a responder

In your first terminal, start a responder on the subject `time`. The `--command`
flag tells `nats reply` to run a command for each request and send its output
back as the reply.

<div class="nats-example"
     data-type="tutorials-request-reply-responder"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

You should see it start up and wait:

```
17:42:10 Listening on "time" in group "NATS-RPLY-22"
```

Leave this terminal running. It's now a service waiting to answer.

## Step 2: Send a request

Open your second terminal and call the service. `nats request` publishes one
message on `time` and waits for a single reply, up to the global `--timeout`
(five seconds by default).

<div class="nats-example"
     data-type="tutorials-request-reply-request"
     data-languages="cli,js,go,python,java,rust,csharp,c"></div>

You should see one reply printed, the current date and time from the responder:

```
17:42:31 Sending request on "time"
17:42:31 Received with rtt 612µs
Mon Jun  9 17:42:31 CEST 2026
```

That date came from the responder's `date` command, sent back to your request.

## Step 3: Watch the responder log the call

Switch back to your first terminal. You should see the responder log the call:

```
17:42:31 [#0] Received on subject "time":
```

Each time you rerun the request in your second terminal, the counter goes up by
one (`[#1]`, `[#2]`, …) and a fresh reply comes back. Try it a couple of times.

## Step 4: See what happens with no responder

Stop the responder in your first terminal with `Ctrl+C`, then send the request
again from your second terminal:

```bash
nats request time "" --timeout 2s
```

Instead of waiting out the timeout, the request returns right away, because the
server knows nobody is subscribed to `time`:

```
17:43:02 No responders are available
```

Start the responder again and the same request succeeds.

## What you built

You ran a `time` responder and called it with a request, getting exactly one
reply per call, all over NATS with no shared address between the two sides.

## Next

- Next tutorial: [3. Work queue](/tutorials/work-queue) — split work across
  several workers so each message goes to exactly one of them.
- Understand how this works: [Core NATS deep dive →
  Request-reply](/learn/core-nats/request-reply) covers the inbox, timeouts, and
  the no-responders signal.
- Turn responders into discoverable services with stats and schemas:
  [Learn → Services](/learn/services).
