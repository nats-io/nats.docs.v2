---
id: build-an-app
title: "7. Capstone: build a small NATS app"
sidebar_position: 8
description: Combine publish/subscribe, request/reply, and a stream into one working app
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# 7. Capstone: build a small NATS app

In this tutorial you build one small, runnable app that pulls together everything
from the earlier tutorials. The app connects to NATS, **publishes** order events
into a JetStream **stream**, and answers a **request** that reports how many
orders it has seen. You run it once and watch all three patterns work together:
publish/subscribe, request/reply, and a stream that keeps your messages.

## What you'll need

- A `nats-server` installed and the `nats` CLI ([Tutorial 1: Hello NATS](/tutorials/hello-nats)).
- A language runtime for the client tab you pick (Go, Node.js, Python, and others).
- About 15 minutes. You'll use three terminals.

## Step 1: Start a JetStream server

In your first terminal, start the server with JetStream enabled so it can store
your stream:

```bash
nats-server -js
```

You should see startup logs ending with a line that mentions JetStream:

```
[INF] Starting nats-server
[INF] Starting JetStream
[INF] Server is ready
```

Leave this terminal running.

## Step 2: Create the stream

Open a second terminal. Create a stream named `EVENTS` that captures every
message published on subjects under `orders.>`:

<div class="nats-example" data-type="tutorials-build-an-app-create-stream" data-languages="cli,js,go,python,java,rust,csharp"></div>

You should see a confirmation summarizing the new stream:

```
Stream EVENTS was created

Subjects: orders.>
 Storage: File
```

## Step 3: Write and run the app

Now write the app itself. It connects to NATS, publishes three order events into
the stream, then subscribes to `orders.count` and replies to any request with the
running total it published.

Save this as a single file and run it in your second terminal:

<Tabs groupId="lang">
<TabItem value="go" label="Go" default>

```go
package main

import (
	"context"
	"fmt"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
)

func main() {
	// Connect to the server you started in Step 1.
	nc, _ := nats.Connect(nats.DefaultURL)
	defer nc.Drain()

	js, _ := jetstream.New(nc)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Publish three order events into the EVENTS stream.
	orders := []string{"orders.created", "orders.created", "orders.shipped"}
	for _, subject := range orders {
		js.Publish(ctx, subject, []byte("event"))
	}
	count := len(orders)
	fmt.Printf("published %d order events\n", count)

	// Reply to any request on orders.count with the running total.
	nc.Subscribe("orders.count", func(msg *nats.Msg) {
		msg.Respond([]byte(fmt.Sprintf("%d orders", count)))
	})

	fmt.Println("ready: send a request to orders.count")
	select {} // keep running so it can answer requests
}
```

</TabItem>
<TabItem value="js" label="JavaScript/TypeScript">

```javascript
import { connect } from "@nats-io/transport-node";
import { jetstream } from "@nats-io/jetstream";

(async () => {
  // Connect to the server you started in Step 1.
  const nc = await connect({ servers: "nats://localhost:4222" });
  const js = jetstream(nc);

  // Publish three order events into the EVENTS stream.
  const orders = ["orders.created", "orders.created", "orders.shipped"];
  for (const subject of orders) {
    await js.publish(subject, "event");
  }
  const count = orders.length;
  console.log(`published ${count} order events`);

  // Reply to any request on orders.count with the running total.
  nc.subscribe("orders.count", {
    callback: (_err, msg) => {
      msg.respond(`${count} orders`);
    },
  });

  console.log("ready: send a request to orders.count");

  // Keep running so it can answer requests.
  await nc.closed();
})();
```

</TabItem>
</Tabs>

You should see the app print its progress and then wait:

```
published 3 order events
ready: send a request to orders.count
```

Leave the app running.

## Step 4: Confirm the events landed in the stream

Open a third terminal. Read the messages your app stored in the `EVENTS` stream:

<div class="nats-example" data-type="tutorials-build-an-app-view-stream" data-languages="cli,js,go,python,java,rust,csharp"></div>

You should see the three order events the app published, each on its subject:

```
[1] Subject: orders.created
[2] Subject: orders.created
[3] Subject: orders.shipped
```

The events are now in the stream, ready for a consumer to read back:

<div class="nats-flow" data-scenario="jetStreamConsumersAnimated" data-width="600" data-height="350"></div>

## Step 5: Ask the app a question

Still in your third terminal, send a request to the app on `orders.count`:

<div class="nats-example" data-type="tutorials-build-an-app-call-app" data-languages="cli,js,go,python,java,rust,csharp"></div>

You should see the app's reply come straight back:

```
3 orders
```

That's it — the app answered your request with the total it published.

## What you built

A single app that connects to NATS, publishes order events into a durable stream,
and answers a live request with a computed total: publish/subscribe, JetStream,
and request/reply working together in one program.

## Next

You've finished the tutorials. To understand *why* each piece works the way it
does, move on to the deep dives:

- Subjects, publish/subscribe, and request/reply: [Core NATS deep dive](/learn/core-nats)
- Streams, consumers, and acknowledgments: [JetStream deep dive](/learn/jetstream)
