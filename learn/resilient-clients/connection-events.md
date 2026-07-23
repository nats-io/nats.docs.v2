---
id: connection-events
title: "Connection Events"
sidebar_position: 4
description: Make the connection state machine observable — wire every connection event and read the state for health checks
---

# Connection Events

The last page already used three connection callbacks without naming
them as a group: the disconnect callback logged the moment the link
dropped, the reconnect callback logged the rejoin, and the
reconnect-error callback recorded every failed attempt in between. Each
one reports a transition of the same state machine.

This page collects that reporting into one surface. You'll see every
event the connection can deliver, wire the one no earlier page covered —
the closed event, the signal that the connection won't come back — and
read the connection's state directly for a health check. Two new ideas
carry the page: the connection event surface, and status polling.

## The events a connection reports

A **connection event** is a notification the client delivers when the
connection changes state or learns something about the cluster. Six
events cover the lifecycle:

- **Disconnect** — the link is gone and the client has entered
  RECONNECTING. You watched this fire on
  [Reconnection](/learn/resilient-clients/reconnection).
- **Reconnect** — the client is back on a server and the connection is
  CONNECTED again. Also from Reconnection.
- **Reconnect error** — one reconnect attempt failed; the client keeps
  trying. Reconnection wired this to make a long outage visible.
- **Closed** — the connection reached CLOSED and will not come back. No
  earlier page covers this event; this page does, below.
- **Discovered servers** — the client's server pool grew from cluster
  gossip, described in [Connecting → Discovered
  servers](/learn/resilient-clients/connecting#discovered-servers).
- **Lame duck** — the server announced it's shutting down soon, so the
  client can move before the link is cut. It belongs to the next page,
  [Drain & Shutdown](/learn/resilient-clients/drain-and-shutdown).

Three of the first four mark edges of the state diagram from
Reconnection; the reconnect error repeats on RECONNECTING, once per
failed attempt, so the diagram shows it as an annotation on that state
rather than an arrow:

```
CONNECTED ──disconnect──▶ RECONNECTING ──reconnect──▶ CONNECTED
    │                          │ reconnect error, per failed attempt
    │ Close() by the app       └──retries spent──▶ CLOSED
    └─────────────────────────────────────────────▶ CLOSED
```

The closed event fires on the two edges into CLOSED, and it fires once:
it's the last event the connection delivers. The other two events —
discovered servers and lame duck — aren't part of the state machine at
all. They arrive over a healthy connection, carrying information about
the cluster.

## How each client delivers the events

Every client reports this surface, but the delivery mechanism differs,
so the same design reads differently in each language.

| Client | Mechanism | Where it's set |
|---|---|---|
| Go | one callback option per event | `DisconnectErrHandler`, `ReconnectHandler`, `ReconnectErrHandler`, `ClosedHandler`, `DiscoveredServersHandler`, `LameDuckModeHandler` |
| Python | one coroutine callback per event | connect arguments `disconnected_cb`, `reconnected_cb`, `closed_cb`, `discovered_server_cb`, `lame_duck_mode_cb` |
| Java | one listener, receiving an enum | `connectionListener(...)` on the options builder; the listener gets an `Events` value: `DISCONNECTED`, `RECONNECTED`, `RESUBSCRIBED`, `DISCOVERED_SERVERS`, `LAME_DUCK`, `CONNECTED`, `CLOSED` |
| JavaScript | one async iterator of status objects | `nc.status()`; each status has a `type`: `disconnect`, `reconnect`, `reconnecting`, `update`, `ldm`, `close`, and more |
| Rust | one async callback, receiving an enum | `event_callback(...)` on the connect options; the callback gets an `Event` value: `Connected`, `Disconnected`, `LameDuckMode`, `Draining`, `Closed`, and more |
| C# | one .NET event per kind | `ConnectionDisconnected`, `ConnectionOpened`, `ReconnectFailed`, `LameDuckModeActivated`, and more on the connection |

Three details are worth knowing before you rely on the table. Rust and
C# don't report a discovered-servers event; their pools still pick up
gossiped servers, they just don't announce it. C# has no closed event
at all — its terminal signal is the `ConnectionState` property, covered
below. And
JavaScript's `update` status carries the change itself: which servers
were added and which were deleted.

Wire the full surface on `order-svc` and log each event as it arrives.
The CLI wires all of these handlers internally, so its example watches
the events rather than wiring them:

<div class="nats-example" data-type="learn-resilient-clients-connection-events-watch-events" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

## Disconnected versus closed

One branch in that event stream changes what your application does; the
rest is logging. The branch is disconnected versus closed.

A disconnect is recoverable. The client is in RECONNECTING, cycling the
pool with backoff, and everything on the last page exists to get it back
to CONNECTED without your help. The right reaction is to log the event,
count it in a metric, and let the reconnect loop work.

Closed is final. The client has stopped trying: no further events
arrive, no publish succeeds, and nothing inside the client will change
that. A service holding a CLOSED connection is broken until something
outside the client acts — usually the process exits and a supervisor
restarts it, or an alert reaches an operator.

The **closed observer** is whatever your client gives you to catch that
final transition: the `ClosedHandler` option in Go, `closed_cb` in
Python, the `CLOSED` event on Java's listener — its documentation calls
the state "permanently closed, either by manual action or failed
reconnects" — and `Event::Closed` in Rust. JavaScript adds a second
form: `nc.closed()` returns a promise that resolves when the client
closes, and resolves *to* the error if one caused the close (it never
rejects), so a `main` function can end by awaiting it. In C# you watch
the `ConnectionState` property instead.

Reconnection set `MaxReconnect` to `-1`, so for `order-svc` the
retries-spent edge never fires. CLOSED still happens: when the
application calls `Close()` or finishes a drain (next page), and on
errors where the client decides retrying can't help — in Go, for
example, receiving the same authentication error twice aborts
reconnecting regardless of the reconnect policy, unless you opt out with
`IgnoreAuthErrorAbort`. Credentials themselves are
[TLS & Auth](/learn/resilient-clients/tls-and-auth)'s topic; here it's
enough that CLOSED can arrive even when retries are unlimited.

So the routing for `order-svc` is: disconnect, reconnect, reconnect
error, discovered servers, lame duck — log them. Closed — exit or alert.

## Polling the connection state

Events push transitions to you. **Status polling** is the pull side:
asking the connection where it is right now. Every client exposes it,
under different names:

- Go: `Status()` returns one of `DISCONNECTED`, `CONNECTED`, `CLOSED`,
  `RECONNECTING`, `CONNECTING`, `DRAINING_SUBS`, `DRAINING_PUBS` (the
  two draining states belong to the next page); `IsConnected()`,
  `IsReconnecting()`, and `IsClosed()` answer the common questions
  directly.
- Python: the `is_connected`, `is_reconnecting`, `is_closed`, and
  `is_draining` properties.
- Java: `getStatus()` returns `DISCONNECTED`, `CONNECTED`, `CLOSED`,
  `RECONNECTING`, or `CONNECTING`.
- Rust: `connection_state()` returns `State::Pending`, `Connected`, or
  `Disconnected`.
- C#: the `ConnectionState` property returns `Closed`, `Open`,
  `Connecting`, `Reconnecting`, or `Failed`.
- JavaScript: there's no state getter beyond `isClosed()` and
  `isDraining()`; you track state from `status()` events, and
  `closed()` covers the terminal case.

A poll is a snapshot, and a snapshot races the state machine: the answer
can be stale by the time you branch on it. A check that reads
`CONNECTED` and then publishes may publish into a connection that
dropped in between — which is fine, because the reconnect buffer from
the last page holds that publish. The mistake is using polls to *react*:
code that polls for RECONNECTING to trigger recovery logic duplicates
what the events already deliver, minus the ordering. Poll to report
state; react through events.

Go also offers the transitions as a channel: `StatusChanged()` returns
one that receives status changes (by default `CONNECTED`,
`RECONNECTING`, `DISCONNECTED`, `CLOSED`), for programs that prefer
`select` loops over callbacks.

## A readiness check for order-svc

The two mechanisms combine into a health check. `order-svc` runs under a
platform that probes it — a container orchestrator, a load balancer, a
supervisor — and the connection state is exactly what the probe should
reflect:

- **Ready** while the connection is CONNECTED: the poll answers the
  probe.
- **Not ready** while it's RECONNECTING: the platform routes new work
  elsewhere, the process stays up, and the reconnect loop keeps working.
  RECONNECTING heals on its own; killing the process over it throws away
  the reconnect buffer.
- **Dead** on CLOSED: the closed observer exits the process, and the
  supervisor replaces it.

The CLI's version of a health check probes from the outside. `nats
server check connection` opens its own connection and measures the
connect time, the server round-trip time, and a full publish/subscribe
round trip, each against a warning and a critical threshold, then exits
with the Nagios convention's code: 0 OK, 1 warning, 2 critical, 3
unknown. `--format` switches the output between `nagios`, `json`,
`prometheus`, and `text`. An external probe tells you the pool is
reachable and fast — it can't read *your* process's connection state; the
in-process check is a client-library call:

<div class="nats-example" data-type="learn-resilient-clients-connection-events-health-check" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

## Force reconnect

One control on this surface points the other way: instead of observing a
transition, you cause one. A **force reconnect** drops the current
connection on purpose and runs the normal reconnect path — same pool,
same backoff, same events.

The use case is rebalancing. A long-lived connection stays wherever it
landed. After a rolling restart of `n1`/`n2`/`n3`, every client that
failed over during the restart can end up on the one server that stayed
up the longest, and nothing ever moves them back. A forced reconnect
from some of the instances re-spreads the load.

Support and semantics vary by client, so check yours:

- Go: `ForceReconnect()` starts the reconnect without waiting for it; if
  the client is already reconnecting, it forces an immediate attempt,
  skipping the current backoff delay.
- Java: `forceReconnect()` (plus an overload taking
  `ForceReconnectOptions`) closes the connection immediately and runs
  the reconnect logic.
- Python: `force_reconnect()` moves a currently connected client to
  RECONNECTING and dials another server in the pool; it does nothing if
  the client is closed, already reconnecting, or not connected.
- Rust: `force_reconnect()` on the client.
- C#: `ReconnectAsync()` forces the reconnection and returns without
  waiting for the new connection.
- JavaScript: `reconnect()`, documented as experimental; it rejects if
  the client is closed or draining, and has no effect if the client is
  already disconnected. Its companion `setServers()` replaces the server
  pool, and calling `reconnect()` afterwards moves the client onto the
  new pool immediately.

Treat it as a real disconnect, because it is one: the same risks apply
as for any disconnect — JavaScript's documentation, for one, warns that
in-flight requests are rejected — and the gap is covered by the same
reconnect buffer with the same limits. And don't fire it across a whole
fleet at once: a synchronized mass reconnect is the load spike that
reconnect jitter exists to prevent. Stagger it.

## Pitfalls

Three mistakes undo the observability this page adds. Each comes back to
the two ideas: the event surface and status polling.

**A status poll used as a trigger races the state machine.** The poll
answers "where is the connection now", and the answer expires
immediately. Recovery logic gated on polling — a loop that checks for
RECONNECTING, a publish guarded by `IsConnected()` — acts on stale state
sooner or later, and re-implements what the event surface already
delivers in order. Poll for dashboards, metrics, and readiness probes;
react through the events.

**No closed observer means permanent failure goes unnoticed.** A
service that wires only the disconnect and reconnect callbacks logs a
disconnect, then nothing, forever: after CLOSED there are no more events
to log, and the service sits with a dead connection while its process
reports healthy. The closed event is the one that demands an action, and
it's the one most often left unwired. Wire it everywhere, even with
unlimited retries — a `Close()` on an error path or an authentication
failure can still get you to CLOSED:

<div class="nats-example" data-type="learn-resilient-clients-connection-events-handle-closed" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

**Connection events and async errors are different signals.** The events
on this page report state transitions of the connection. The async error
callback — Go's `ErrorHandler`, Python's `error_cb`, Java's
`ErrorListener` — reports problems that happen *while the connection
stays CONNECTED*, such as a subscription falling behind (that signal is
[Slow Consumers](/learn/resilient-clients/slow-consumers)' topic). In
JavaScript and Rust one stream carries both kinds, distinguished by
type. Folding them into one "connection problems" metric muddles
diagnosis: rising disconnects point at the network or the servers,
rising async errors point at your application. Count them separately.

## Where you are

The connection state machine that Reconnection built is now observable
from the outside. You have:

- the full event surface named and routed: disconnect, reconnect,
  reconnect error, discovered servers, and lame duck are logged; closed
  triggers an exit or an alert
- a closed observer on every long-lived service, so a permanent failure
  is acted on instead of silently absorbed
- status polling wired to the readiness probe — ready on CONNECTED, not
  ready on RECONNECTING, dead on CLOSED — and events, not polls, driving
  reactions
- force reconnect, where your client offers it, for deliberately
  rebalancing long-lived connections after cluster changes

Every transition so far happened *to* the connection; this page made
them visible. The one transition you haven't driven deliberately is the
exit: shutting the connection down cleanly.

## What's next

The next mechanism is **drain and shutdown**: telling the connection to
finish its in-flight work — deliver buffered messages, flush pending
publishes — and only then close, so a deploy or a SIGTERM never loses
work. That page also covers the lame-duck event from this page's list in
working context.

Continue to [Drain & Shutdown](/learn/resilient-clients/drain-and-shutdown).

## See also

- [Reconnection](/learn/resilient-clients/reconnection) — the
  disconnect/reconnect loop these events report on.
- [Monitoring](/learn/monitoring) — the server's view of your
  connections, from the outside.
- [Reference](/reference/) — the wire protocol and server configuration; the
  event and status APIs for each client live in its API reference.
