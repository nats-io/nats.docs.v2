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
message. You will subscribe to a **subject** in one terminal, publish a
message to it from another, and watch it arrive. By the end you will
have a working NATS server on your machine and have moved a message
through it both from the CLI and from a client.

## What you'll need

- A terminal you can open two or three tabs in.
- Permission to install software (Homebrew, a download, or Docker).
- About 10 minutes.

## Step 1: Install the NATS server and CLI

Install `nats-server` (the server) and `nats` (the command-line client).

<Tabs groupId="lang">
<TabItem value="cli" label="macOS (Homebrew)" default>

```bash
brew install nats-server
brew install nats-io/nats-tools/nats
```

</TabItem>
<TabItem value="js" label="Linux">

```bash
# Server
curl -L https://github.com/nats-io/nats-server/releases/latest/download/nats-server-linux-amd64.zip -o nats-server.zip
unzip nats-server.zip && sudo cp nats-server-*/nats-server /usr/local/bin

# CLI
curl -L https://github.com/nats-io/natscli/releases/latest/download/nats-linux-amd64.zip -o nats.zip
unzip nats.zip && sudo cp nats /usr/local/bin
```

</TabItem>
<TabItem value="go" label="Docker">

```bash
# Run the server in Docker instead of installing it
docker run -p 4222:4222 nats:latest

# Install just the CLI on your host (macOS shown)
brew install nats-io/nats-tools/nats
```

</TabItem>
</Tabs>

Check that both are installed:

```bash
nats-server --version
nats --version
```

You should see a version number printed for each, for example
`nats-server: v2.11.0` and `nats version 0.2.0`.

## Step 2: Start the server

In your first terminal, start the server:

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

<div class="nats-example" data-type="tutorials-hello-nats-subscribe" data-languages="cli,js,go,python,java,rust,csharp"></div>

You should see the subscriber start and wait:

```
17:42:01 Subscribing on greet
```

Leave this terminal running and listening.

## Step 4: Publish a message

Open a **third terminal**. A publisher sends a message to a subject.
Publish `Hello NATS!` to `greet`:

<div class="nats-example" data-type="tutorials-hello-nats-publish" data-languages="cli,js,go,python,java,rust,csharp"></div>

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

That is one message making the round trip: published to a subject,
matched against the subscriber's interest, and delivered.

## Step 5: See the flow

Here is an animation of the publish-to-subscriber path you just ran:

<div class="nats-flow" data-scenario="publishSubscribeAnimated" data-width="600" data-height="350"></div>

Publish a few more times from the third terminal and watch the counter
in the second terminal climb: `[#2]`, `[#3]`, and so on. Each publish
delivers a fresh copy to every active subscriber on the subject.

## What you built

You have a running NATS server and have sent your first message
through it: one terminal subscribed to the `greet` subject, another
published to it, and the message arrived. The same pub/sub works from
any NATS client, which is what the code tabs above show.

## Next

- Build a responder you can call and get an answer back:
  [Request-Reply](/tutorials/request-reply).
- Understand how publish-subscribe really works — the interest graph,
  delivery guarantees, and wildcards: the
  [Core NATS deep dive](/learn/core-nats), or the shorter
  [publish-subscribe primer](/concepts/pub-sub-basics).
