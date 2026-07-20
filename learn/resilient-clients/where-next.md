---
id: where-next
title: "Where Next"
sidebar_position: 9
description: Recap the connection lifecycle, point to the sibling deep dives, and collect every page's pitfalls into one production checklist
---

# Where Next

You started this chapter with the Acme clients connecting on bare
defaults: a single URL, no name, no plan for a server going away. You end
it with an `order-svc` that opens against a server pool, reconnects with
backoff and jitter, drains in-flight work on shutdown, bounds its
subscribers' memory, retries requests safely, and presents credentials
over a CA-validated link. That covers the whole arc of the chapter.

This page doesn't teach anything new. It collects the model you built
into one place and points you at the chapters and Reference that take it
further.

## The core model in one sentence

Every page in this chapter moved the same object, the **connection**,
through one more state safely. That is the one point to take away from
this chapter.

The connection is a **state machine**. It lives in a small set of
states: DISCONNECTED, CONNECTING, CONNECTED, RECONNECTING, DRAINING,
CLOSED. Every fault this chapter survives is one well-defined edge
between them. A server dying moves a CONNECTED client to RECONNECTING. A
SIGTERM moves it to DRAINING and then CLOSED. A blocked dial keeps it in
CONNECTING until the timeout fires.

Most pages added exactly one transition the Acme clients couldn't handle
before. Connecting taught the CONNECTING → CONNECTED edge and the
handshake that walks it. Reconnection taught the CONNECTED → RECONNECTING
→ CONNECTED loop with backoff and jitter. Connection Events added no new
edge; it made every transition observable, wiring each one to a callback
and the live state to a health check. Drain & Shutdown taught the
CONNECTED → DRAINING → CLOSED edge that loses no work. Slow Consumers kept
a CONNECTED client healthy under load instead of letting a subscriber's
buffer grow without bound. Request-Reply Resilience made a single
`request()` call survive a slow or absent responder. TLS & Auth secured
the edge into CONNECTED so the link is encrypted and the client is who it
claims to be.

Those six mechanisms all act on one machine, and Connection Events makes
that machine observable. Everything else is a refinement of those edges:
the exact flags, the defaults, the per-language spelling.

## Where the details live

The chapter is unversioned and concept-first. The wire protocol, the
server's `-ERR` strings, and the server configuration live in
[Reference](/reference/), which is versioned. The exact client option
names, types, and defaults live in each client library's API reference.

Here we covered only the options that change how a connection behaves
under fault. For the full list of error codes a `-ERR` can carry, look in
Reference; for a connection option's precise type or default, look in your
client library's API docs.

## Sibling deep dives

This chapter stops at the edge of the client on purpose. Where a page
reached a server-side fact, a JetStream position, or an issued credential,
it named the gap and linked out. Those links lead to the deep dives that
own what this one only consumes.

The [Topologies deep dive](/learn/topologies) explains the server pool
this chapter only connects to: why a server goes away, how the
`n1`/`n2`/`n3` cluster forms (built there as `n1-east`/`n2-east`/`n3-east`,
shortened here), and what a client's disconnect looks like
from the server side. Resilient Clients treats "the server is gone" as a
given fact, while Topologies explains why it happens.

The [JetStream deep dive](/learn/jetstream) owns what happens to a
consumer's *position* across a reconnect. This chapter re-subscribes the
connection; [JetStream → Acknowledgment](/learn/jetstream/acknowledgment)
covers what a consumer's position does and whether in-flight work is
repeated or resumed.

The [Security deep dive](/learn/security) issues the credentials and the
CA this chapter loads. TLS & Auth *consumes* the `order-svc` `.creds` and
the cluster CA; Security shows how both are created.

The [Services deep dive](/learn/services) formalizes the request-reply
pattern into a named, discoverable service with per-endpoint stats and
queue-group scaling. If your responder side has outgrown a single
hand-rolled handler, that's the next step.

The [Monitoring deep dive](/learn/monitoring) watches the same connections
from the server side: the `slow_consumers` metric and the advisories that
show a client falling behind, and the health endpoints that watch the
servers themselves.

## Where you are

This is the end of the chapter. The arc is complete, and this page adds
no new scenario state. The `order-svc` publisher, the
`warehouse`, `notifications`, and `analytics` subscribers, and the
JetStream consumers are still running in your session exactly as you left
them on the previous page, now with production connection options on every
one.

You hold the core model: a connection is a state machine, every fault is a
transition, and each option in this chapter shapes one edge. That model is
the floor for running any NATS client in production.

## Production checklist

Every page in this chapter closed with a Pitfalls section. This collects
the action items from all of them in one place: a last pass before you
trust a connection with real orders. Each group links back to the page
that explains the why.

### Connecting — see [Pitfalls](/learn/resilient-clients/connecting#pitfalls)

- [ ] Pass the whole server pool (several URLs, or several IPs behind one name) so a single unreachable server isn't fatal at connect time.
- [ ] Configure every server the client must rely on and treat discovered servers as additions; a one-URL setup that leans on gossip loses its failover where `no_advertise` is set or the advertised addresses aren't reachable.
- [ ] Set a deliberate connect timeout so a blocked dial costs one timeout, not a hung startup that looks dead.
- [ ] Keep messages under the server's `max_payload` and store large bodies elsewhere; an oversized publish fails before it's sent, and that's not a connection problem.

### Reconnection — see [Pitfalls](/learn/resilient-clients/reconnection#pitfalls)

- [ ] Set `MaxReconnect` to `-1` on a long-lived service (in Go, Java, Python, and JavaScript, which default to a bounded count) so a long outage doesn't exhaust the attempts and leave the connection CLOSED; Rust and C# already retry forever.
- [ ] Watch the reconnect-error callback so a long outage is loud in your logs, not a silent give-up.
- [ ] If you turn on retry for a failed first connect, keep the reconnect-error callback wired and alert on a service still in RECONNECTING after a deploy; the opt-in hides a bad server URL that would otherwise fail loudly at startup.
- [ ] Keep a non-zero wait and always keep jitter; a zero or fixed delay either spins the CPU or makes a fleet of clients retry the one remaining server at the same instant.
- [ ] Handle a full reconnect buffer and back off publishing; the buffer is bounded (8 MB by default in Go and Java, 2 MB in Python), and the publish that overflows it either fails (Go: `ErrReconnectBufExceeded`) or blocks under backpressure (Rust).
- [ ] Lower the ping interval under heavy load so you catch a wedged connection in seconds, not the several minutes the defaults take (about six minutes in most clients — a two-minute ping interval, with the third unanswered ping closing the connection; the Rust client pings every minute, so about three).

### Connection Events — see [Pitfalls](/learn/resilient-clients/connection-events#pitfalls)

- [ ] Poll the connection state for dashboards, metrics, and readiness probes, and drive reactions through the events instead; a status poll used as a trigger races the state machine.
- [ ] Wire a closed observer on every long-lived service, even with unlimited retries; without it a permanent close is logged as a disconnect and then nothing, while the process still reports healthy.
- [ ] Count connection events and async errors separately; rising disconnects point at the network or the servers, rising async errors at your application.

### Drain & Shutdown — see [Pitfalls](/learn/resilient-clients/drain-and-shutdown#pitfalls)

- [ ] Drain last, not first; a publish after `Drain()` races the drain and may come back with a draining error (`ErrConnectionDraining` in nats.go) instead of sending.
- [ ] Size the drain timeout to your slowest handler's latency; a timeout shorter than the handler discards the remaining in-flight work.
- [ ] Ack JetStream in-flight messages before a core drain; a connection drain does not handle a consumer's ack position for you.

### Slow Consumers — see [Pitfalls](/learn/resilient-clients/slow-consumers#pitfalls)

- [ ] Always set pending limits on a subscription that does real per-message work; the generous defaults (500,000 messages, 64 MB in the Go client) are a backstop, not a tuning, and a high-rate subject fills them in seconds.
- [ ] Size the pending limit to the handler's latency and the subject's peak rate, not to caps sized for someone else's workload.
- [ ] Always set the async-error callback and log the slow-consumer error loudly; a nil one drops every overflow message silently.
- [ ] Tell a local drop apart from a server-side disconnect; watch the async-error rate and the disconnect rate separately, since each points at a different fix.

### Request-Reply Resilience — see [Pitfalls](/learn/resilient-clients/request-reply-resilience#pitfalls)

- [ ] Measure the responder's p99 and set the request timeout to two or three times it; a timeout under the real latency retries a responder that was about to answer.
- [ ] Handle no-responders and a timeout separately; an absent responder warrants a backoff, a slow one warrants a fast retry.
- [ ] Key retries by `order_id` and de-dupe on the responder so a re-sent request is a no-op, not a double action.
- [ ] Cap the retry count and add jitter; an unbounded retry loop pins a CPU against a responder that's already behind and never reports the problem.

### TLS & Auth — see [Pitfalls](/learn/resilient-clients/tls-and-auth#pitfalls)

- [ ] Load credentials from a file or environment and never commit a `.creds` to source.
- [ ] Always supply the CA certificate in production; skip-verify TLS encrypts the link but authenticates nothing.
- [ ] Refresh a credentials JWT before it expires and watch the auth-error rate; at expiry the server closes the live connection, and most clients abort the reconnect on the repeated authorization violation and land in CLOSED rather than looping, so recovery needs fresh creds or a restart.
- [ ] Rotate credentials with a fresh connection and drain the old one; reloading a creds file mid-connection races the live link.

## See also

- [Reference](/reference/) — the wire protocol, `-ERR` strings, and server
  configuration, versioned.
- [Topologies deep dive](/learn/topologies) — the server pool this
  chapter only connects to, explained from the server side.
- [Security deep dive](/learn/security) — issuing the credentials and CA
  this chapter consumes.
