---
id: your-first-websocket-connection
title: "Your first WebSocket connection"
sidebar_position: 2
description: Enable the websocket block on a local server, subscribe with the nats CLI over ws, then receive the same subject in a browser
---

# Your first WebSocket connection

Acme's warehouse dashboard runs in a browser and needs to see `orders.>`
as orders arrive. This page gets there in two steps: open a WebSocket
listener, then connect to it — first with the `nats` CLI, because it
proves the listener works without any HTML, then with the browser page
itself.

## Open the listener

The `websocket {}` block takes its own host and port, separate from the
client port on 4222:

```conf
# ws-dev.conf — one server, two listeners
listen: 127.0.0.1:4222

websocket {
  listen: 127.0.0.1:8080
  no_tls: true
}
```

`no_tls: true` is what makes this run on a laptop. The listener requires
TLS otherwise, and leaving out both a `tls {}` block and this flag stops
the server before it starts:

```
nats-server: websocket requires TLS configuration
```

[TLS and proxies](/learn/websocket/tls-and-proxies) sets up the
production shape. Until then everything here is plaintext on localhost.

Start it:

```bash
nats-server -c ws-dev.conf
```

Two log lines confirm the state you're in:

```
[INF] Listening for websocket clients on ws://127.0.0.1:8080
[WRN] Websocket not configured with TLS. DO NOT USE IN PRODUCTION!
```

The warning is accurate. A WebSocket client sending a bearer token over
`ws://` sends it in the clear.

### Set the port, or there's no listener

There's no default port. Write the block without one and the server
starts, logs nothing about WebSocket, and listens on 4222 only:

```conf
websocket {
  no_tls: true
}
```

```
[INF] Listening for client connections on 127.0.0.1:4222
```

No error, no warning, no listener. If a WebSocket client can't connect
and the log says nothing about WebSocket at all, this is why. Set `port`,
or `listen`, which sets host and port together.

## Connect the CLI over ws

The `nats` CLI is built on the Go client, which accepts `ws://`. Subscribe
through the WebSocket listener:

```bash
nats -s ws://127.0.0.1:8080 sub "orders.>"
```

```
16:15:11 Subscribing on orders.>
```

In a second terminal, publish over the ordinary client port:

```bash
nats -s nats://127.0.0.1:4222 pub orders.new "ord_8w2k"
```

The subscriber receives it:

```
[#1] Received on "orders.new"
ord_8w2k
```

One publisher on 4222, one subscriber on 8080, same subject, same
server. Neither side knows or cares which transport the other used.
There's no bridging step and no separate subject space — the WebSocket
listener is another door into the same server.

<div class="nats-flow" data-scenario="wsUpgradeAnimated" data-width="660" data-height="260"></div>

## What the transport changes

Only the URL. Every client that supports WebSocket takes the same server
list it always did, with a different scheme:

| Client | Server URL |
|---|---|
| `nats` CLI | `nats -s ws://127.0.0.1:8080` |
| Go | `nats.Connect("ws://127.0.0.1:8080")` |
| JavaScript/TypeScript | `wsconnect({ servers: "ws://127.0.0.1:8080" })` |
| Python | `nats.client.connect("ws://127.0.0.1:8080")` — needs `pip install nats-core[websocket]` |
| Java | `Nats.connect("ws://127.0.0.1:8080")` |
| Rust | `async_nats::connect("ws://127.0.0.1:8080")` |
| C#/.NET | `new NatsOpts { Url = "ws://127.0.0.1:8080" }` |

Python is the one that needs more than a URL. The `nats-core` client
keeps its WebSocket transport behind an optional extra, so plain
`pip install nats-core` can't open a `ws://` connection — install
`nats-core[websocket]`. It's the new Python client and needs Python
3.13 or later.

Use `wss://` where the listener holds a certificate. Subjects, queue
groups, request-reply, JetStream, and headers all behave as they do on a
`nats://` connection, because the protocol above the transport is the
same protocol.

## Connect the browser

Now the dashboard. This is one file, no build step — save it as
`dashboard.html` and open it:

```html
<!doctype html>
<title>Acme orders</title>
<ul id="orders"></ul>

<script type="module">
  import { wsconnect } from "https://esm.sh/@nats-io/nats-core";

  const nc = await wsconnect({ servers: "ws://127.0.0.1:8080" });
  const list = document.getElementById("orders");

  for await (const m of nc.subscribe("orders.>")) {
    const li = document.createElement("li");
    li.textContent = `${m.subject} — ${m.string()}`;
    list.append(li);
  }
</script>
```

Publish again from the CLI:

```bash
nats -s nats://127.0.0.1:4222 pub orders.new "ord_2zr9"
```

The line appears on the page. The subscription is an ordinary NATS
subscription, and `orders.>` is an ordinary wildcard.

Loading the file straight from disk works because the server accepts any
origin by default. That stops being true the moment you configure origin
checking, which is where [Browsers and
origins](/learn/websocket/browsers-and-origins) starts.

### Always give nats.js an explicit port

`wsconnect()` fills in a port you leave out, and the value it picks is
never 4222:

| What you pass | What it connects to |
|---|---|
| `ws://host:8080` | `ws://host:8080` |
| `ws://host` | `ws://host:80` |
| `wss://host` | `wss://host:443` |
| `host` | `wss://host:443` |
| `nats://host:4222` | `ws://host:4222` |

A bare hostname is treated as TLS on 443. Dropping the port from a
`ws://` URL gets you port 80. Neither is likely to be your listener, and
the failure looks like the server being down. The last row is a trap of
its own: the port survives but the scheme doesn't, so the client sends a
WebSocket handshake to the plain client port, which won't answer it.
Write the scheme and the port every time.

## Binary frames, and why a frame isn't a message

Two protocol details matter, one for everyone and one only if you're
writing a client.

NATS uses WebSocket data frames in **binary**. The server always sends
binary, and clients are expected to do the same.

If you're implementing a client library: a WebSocket frame is not
guaranteed to contain a whole NATS protocol message, and generally
won't. One frame can carry part of a `MSG`, or several messages at once.
Feed frame payloads to a parser that handles partial protocol rather
than assuming frame boundaries mean anything. The [client protocol
reference](/reference/protocols/client) describes what that parser has
to accept.

## Pitfalls

**Pointing a client at the wrong listener.** `nats://` to 8080 and
`ws://` to 4222 both fail, and neither failure names the real problem.
The listeners are separate: WebSocket clients use the `websocket {}`
port, everything else uses the client port.

**A `websocket {}` block with no port.** The server starts and the
listener doesn't exist. There is no default. Check the log for
`Listening for websocket clients` — if it's absent, the block set no
port.

**A `websocket {}` block with neither `tls {}` nor `no_tls: true`.** The
listener requires TLS by default, so the server exits at startup with
`websocket requires TLS configuration`.

**A client URL without an explicit port.** nats.js fills one in and never
picks 4222 — a bare host becomes `wss://host:443`, and `ws://host`
becomes port 80. Write the port every time.

**Shipping `no_tls: true`.** It's a development flag. The `DO NOT USE IN
PRODUCTION!` warning is the only thing the server will say about it, and
it says it once at startup.

**A FIPS-140 build made with an older Go toolchain.** The WebSocket
handshake computes a SHA-1 over `Sec-WebSocket-Key`, which a FIPS build
from Go 1.25 or earlier won't permit, so the server refuses the whole
listener:

```
websocket: cannot be used in FIPS-140 mode when built with this Go
version, use Go 1.26 or later
```

The same build rejects `ws://` and `wss://` leafnode remotes for the
same reason. Built with Go 1.26 or later, WebSocket works under FIPS
normally — SHA-1 here only derives the handshake key and isn't
protecting anything.

## Where you are

You have one server with two listeners:

- NATS clients on 4222, WebSocket clients on 8080
- `nats -s ws://127.0.0.1:8080 sub "orders.>"` receiving what a
  `nats://` publisher sends
- a browser page showing `orders.>` live
- `no_tls: true`, which is fine on a laptop and wrong everywhere else

Keep the server and `dashboard.html`; the next two pages build on both.

## What's next

The dashboard works because the server currently accepts a connection
from any origin. A page served from anywhere — including a page you
didn't write — can connect to it. [Browsers and
origins](/learn/websocket/browsers-and-origins) covers what to do about
that, and how a browser proves who it is without a credentials file.

## See also

- [Reference → websocket](/reference/config/websocket/) — every field of
  the `websocket {}` block
- [Core NATS → Connecting](/learn/core-nats/connecting) — the connection
  model this page changes the transport of
- [Reference → client protocol](/reference/protocols/client) — what the
  frames carry
