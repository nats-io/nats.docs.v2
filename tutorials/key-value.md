---
id: key-value
title: "6. Store state in Key-Value"
sidebar_position: 7
description: Put, get, and watch values in a JetStream Key-Value bucket
---

# 6. Store state in Key-Value

You'll create a Key-Value bucket, put a value into it, read it back, and
then watch the bucket from a second terminal so you see changes the moment
they happen. By the end you'll have a tiny live state store you can read,
write, and observe.

## What you'll need

- `nats-server` and the `nats` CLI installed (see [1. Hello NATS](/tutorials/hello-nats)).
- A Key-Value bucket is backed by a JetStream stream, so you'll start the
  server with JetStream enabled in Step 1.

## Step 1: Start the server with JetStream

A Key-Value bucket is stored in JetStream, so start the server with the
`-js` flag.

```bash
nats-server -js
```

You should see a startup log line confirming JetStream is on:

```
[INF] Starting JetStream
[INF] Server is ready
```

Leave this running and open a new terminal for the next steps.

## Step 2: Create a bucket

Create a bucket called `profiles`. This is where your values will live.

<div class="nats-example" data-type="tutorials-key-value-create-bucket" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

You should see a confirmation with the bucket's configuration:

```
Information for Key-Value Store Bucket profiles created 2026-06-09 10:13:41

Configuration:

           Bucket Name: profiles
          History Kept: 1
                   ...
    Backing Store Kind: JetStream
```

## Step 3: Put a value and read it back

Store a value under a key, then get it back. The key is `sue.color` and the
value is `blue`.

<div class="nats-example" data-type="tutorials-key-value-put-get" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

The put echoes the value back, and the get returns the full entry:

```
blue
profiles > sue.color revision: 1 created @ ...

blue
```

You now have one value stored and confirmed.

## Step 4: Watch the bucket from a second terminal

A watch streams every change to the bucket as it happens. Open a **second
terminal** and start watching `profiles`.

<div class="nats-example" data-type="tutorials-key-value-watch" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

The watch first replays the current value, then waits:

```
[2026-06-09 10:14:22] PUT profiles > sue.color: blue
```

Leave the watch running. Here's the flow you've just set up: a writer puts
a value, and the watcher receives it live.

<div class="nats-flow" data-scenario="kvWatchAnimated" data-width="600" data-height="350"></div>

## Step 5: Update the value and see the watch fire

Back in your **first terminal**, put a new value for the same key.

<div class="nats-example" data-type="tutorials-key-value-update" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

The put returns the new value:

```
green
```

Switch to the watch terminal. A new line appears the instant the change
lands:

```
[2026-06-09 10:15:03] PUT profiles > sue.color: green
```

Stop the watch with `Ctrl-C` when you're done.

## What you built

You have a Key-Value bucket holding live state: you put and got a value,
and a watcher in a second terminal received every change the moment it
happened.

## Next

- Capstone: [7. Build an app](/tutorials/build-an-app) — combine
  publish/subscribe, request/reply, and a stream in one program.
- Now understand how this works: the [Key-Value deep dive](/learn/key-value)
  explains buckets, revisions, watching, and the stream underneath.
