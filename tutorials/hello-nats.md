---
id: hello-nats
title: "1. Hello NATS"
sidebar_position: 2
description: Install NATS, then publish and subscribe your first message
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# 1. Hello NATS

In this tutorial you install NATS, start a server, and send your first
message. You'll subscribe to a **subject** in one terminal, publish a
message to it from another, and watch it arrive. By the end you'll
have a working NATS server on your machine, and you'll have moved a
message through it from both the CLI and a client.

## What you'll need

- a terminal you can open two or three tabs in
- permission to install software (Homebrew, a download, or Docker)
- about ten minutes

## Step 1: Install the NATS server and CLI

Install `nats-server` (the server) and `nats` (the command-line client).

<Tabs groupId="install-os">
<TabItem value="macos" label="macOS (Homebrew)" default>

```bash
brew install nats-server
brew install nats-io/nats-tools/nats
```

</TabItem>
<TabItem value="linux" label="Linux">

```bash
# Server (installs nats-server into /usr/local/bin, prompting for sudo)
curl -sf https://binaries.nats.dev/nats-io/nats-server/v2@latest | PREFIX=/usr/local/bin sh

# CLI (installs nats into /usr/local/bin)
curl -sf https://binaries.nats.dev/nats-io/natscli/v0@latest | PREFIX=/usr/local/bin sh
```

</TabItem>
<TabItem value="docker" label="Docker">

```bash
# Run the server in Docker instead of installing it. This runs in the
# foreground and ends with "[INF] Server is ready" — leave it running.
# You already have a server this way, so skip Step 2 below.
docker run -p 4222:4222 nats:latest

# In another terminal, install just the CLI on your host (macOS shown)
brew install nats-io/nats-tools/nats
```

</TabItem>
</Tabs>

Check that the CLI is installed:

```bash
nats --version
```

You should see a version number, for example `nats version 0.4.0`. If you
installed the server directly (Homebrew or the Linux script, not Docker),
check it too — you should see something like `nats-server: v2.11.0`:

```bash
nats-server --version
```

## Step 2: Start the server

If you started the server with Docker in Step 1, it's already running — leave
that terminal alone and skip to Step 3.

Otherwise, in your first terminal, start the server:

```bash
nats-server
```

You should see startup lines ending with:

```
[INF] Server is ready
```

The server now listens on `localhost:4222`. Leave this terminal
running for the rest of the tutorial.

## Step 3: Subscribe to a subject

Open a **second terminal**. A subscriber registers interest in a
subject and receives a copy of every matching message. Subscribe to
the `greet` subject:

<div class="nats-example" data-type="tutorials-hello-nats-subscribe" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

You should see the subscriber start and wait:

```
17:42:01 Subscribing on greet
```

Leave this terminal running and listening.

## Step 4: Publish a message

Open a **third terminal**. A publisher sends a message to a subject.
Publish `Hello NATS!` to `greet`:

<div class="nats-example" data-type="tutorials-hello-nats-publish" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

In this third terminal you should see the publish confirmed:

```
17:42:09 Published 11 bytes to "greet"
```

Now switch back to your **second terminal**. The subscriber received
the message and printed it:

```
[#1] Received on "greet"
Hello NATS!
```

That's one message making the round trip: published to a subject,
matched against the subscriber's interest, and delivered.

## Step 5: See the flow

Here's an animation of the publish-to-subscriber path you just ran:

<div class="nats-flow" data-scenario="publishSubscribeAnimated" data-width="600" data-height="350"></div>

Publish a few more times from the third terminal and watch the counter
in the second terminal climb: `[#2]`, `[#3]`, and so on. Each publish
delivers a fresh copy to every active subscriber on the subject.

## What you built

You have a running NATS server, and you've sent your first message
through it: one terminal subscribed to the `greet` subject, another
published to it, and the message arrived. The same pub/sub works from
any NATS client, which is what the code tabs above show.

## Next

- Build a responder you can call and get an answer back:
  [Request-Reply](/tutorials/request-reply).
- Understand how publish-subscribe really works (the interest graph,
  delivery guarantees, and wildcards): the
  [Core NATS deep dive](/learn/core-nats), or the shorter
  [publish-subscribe primer](/concepts/pub-sub-basics).
