---
id: where-next
title: "7. Where Next"
sidebar_position: 8
description: Recap the connection lifecycle, point to the sibling deep dives, and collect every page's pitfalls into one production checklist
---

# 7. Where Next

You started this chapter with the Acme clients connecting on bare
defaults: a single URL, no name, no plan for a server going away. You end
it with an `order-svc` that opens against a server pool, reconnects with
backoff and jitter, drains in-flight work on shutdown, bounds its
subscribers' memory, retries requests safely, and presents credentials
over a CA-validated link. That is the whole arc.

This page does not teach anything new. It collects the model you built
into one place and points you at the chapters and Reference that take it
further.

## The whole game in one sentence

Every page in this chapter moved the same object — the **connection** —
through one more state safely. If you remember nothing else, remember
that.

The connection is a **state machine**. It lives somewhere in a small set
of states — DISCONNECTED, CONNECTING, CONNECTED, RECONNECTING, DRAINING,
CLOSED — and every fault this chapter survives is one well-defined edge
between them. A server dying moves a CONNECTED client to RECONNECTING. A
SIGTERM moves it to DRAINING and then CLOSED. A blocked dial keeps it in
CONNECTING until the timeout fires.

Each page added exactly one transition the Acme clients could not handle
before. Connecting taught the CONNECTING → CONNECTED edge and the
handshake that walks it. Reconnection taught the CONNECTED → RECONNECTING
→ CONNECTED loop with backoff and jitter. Drain & Shutdown taught the
CONNECTED → DRAINING → CLOSED edge that loses no work. Slow Consumers kept
a CONNECTED client healthy under load instead of letting a subscriber's
buffer grow without bound. Request-Reply Resilience made a single
`request()` call survive a slow or absent responder. TLS & Auth secured
the edge into CONNECTED so the link is encrypted and the client is who it
claims to be.

Six mechanisms, one machine. Everything else — the exact flags, the
defaults, the per-language spelling — is a refinement of those edges.

## Where the details live now

The chapter is unversioned and concept-first. The exact option names,
defaults, and ranges live in **Reference**, which is versioned and
exhaustive. When you need the precise type of a connection option or the
full list of error codes a `-ERR` can carry, that is where to look.

The full set of connection options is documented in
[Reference](/reference/). We covered only the ones that change how a
connection behaves under fault here; the handoff phrases throughout this
chapter all point into that root.

## Sibling deep dives

This chapter stops at the edge of the client on purpose. Where a page
reached a server-side fact, a JetStream position, or an issued credential,
it named the gap and linked out. Those links lead to the deep dives that
own what this one only consumes.

The [Topologies deep dive](/learn/topologies) explains the server pool
this chapter only connects to — why a server goes away, how the
`n1`/`n2`/`n3` cluster forms, and what a client's disconnect looks like
from the server side. Resilient Clients treats "the server is gone" as a
fact; Topologies tells you why.

The [JetStream deep dive](/learn/jetstream) owns what happens to a
consumer's *position* across a reconnect. This chapter re-subscribes the
connection; [JetStream → Acknowledgment](/learn/jetstream/acknowledgment)
covers what a consumer's position does and whether in-flight work is
repeated or resumed.

The [Security deep dive](/learn/security) issues the credentials and the
CA this chapter loads. TLS & Auth *consumes* the `order-svc` `.creds` and
the cluster CA; Security shows how the credentials and the CA are created.

The [Services deep dive](/learn/services) builds the request-reply pattern
into a framework with built-in retries. If you found yourself wrapping
every `request()` in backoff, that is the next step.

The [Monitoring deep dive](/learn/monitoring) watches the same connections
from the server side — the `slow_consumers` metric, the advisories, and the
health endpoints that tell you a client is struggling before its users do.

## Where you are

This is the end of the chapter — the whole arc is complete, and no new
scenario state is introduced here. The `order-svc` publisher, the
`warehouse`, `notifications`, and `analytics` subscribers, and the
JetStream consumers are still running in your session exactly as you left
them on the previous page, now with production connection options on every
one.

You hold the core model: a connection is a state machine, every fault is a
transition, and each option in this chapter shapes one edge. That model is
the floor for running any NATS client in production.

## Production checklist

Every page in this chapter closed with a Pitfalls section. This collects
the action items from all of them in one place — a last pass before you
trust a connection with real orders. Each group links back to the page
that explains the why.

### Connecting — see [Pitfalls](/learn/resilient-clients/connecting#pitfalls)

- [ ] Pass the whole server pool — several URLs, or several IPs behind one name — so a single unreachable server is not fatal at connect time.
- [ ] Set a deliberate connect timeout so a blocked dial costs one timeout, not a hung startup that looks dead.
- [ ] Keep messages under the server's `max_payload` and store large bodies elsewhere; an oversized publish fails before it is sent, and that is not a connection problem.

### Reconnection — see [Pitfalls](/learn/resilient-clients/reconnection#pitfalls)

- [ ] Set `MaxReconnect` to `-1` on a long-lived service so a long outage does not exhaust the default 60 attempts and leave the connection CLOSED.
- [ ] Watch the reconnect-error callback so a long outage is loud in your logs, not a silent give-up.
- [ ] Keep a non-zero wait and always keep jitter; a zero or fixed delay either spins the CPU or stampedes the survivor in lockstep.
- [ ] Catch `ErrReconnectBufExceeded` and back off publishing; the reconnect buffer is 8 MB, not infinite, and the publish that overflows it fails.
- [ ] Lower the ping interval under heavy load so a wedged connection is caught in seconds, not the default two minutes.

### Drain & Shutdown — see [Pitfalls](/learn/resilient-clients/drain-and-shutdown#pitfalls)

- [ ] Drain last, not first; a publish after `Drain()` returns `ErrConnectionDraining` and never sends.
- [ ] Size the drain timeout to your slowest handler's latency; a timeout shorter than the handler discards the remaining in-flight work.
- [ ] Ack JetStream in-flight messages before a core drain; a connection drain does not handle a consumer's ack position for you.

### Slow Consumers — see [Pitfalls](/learn/resilient-clients/slow-consumers#pitfalls)

- [ ] Always set pending limits on a subscription that does real per-message work; the generous defaults (500,000 messages, 64 MB) are a backstop, not a tuning, and a high-rate subject fills them in seconds.
- [ ] Size the pending limit to the handler's latency and the subject's peak rate, not to caps sized for someone else's workload.
- [ ] Always set the async-error callback and log the slow-consumer error loudly; a nil one drops every overflow message silently.
- [ ] Tell a local drop apart from a server-side disconnect; watch the async-error rate and the disconnect rate separately, since each points at a different fix.

### Request-Reply Resilience — see [Pitfalls](/learn/resilient-clients/request-reply-resilience#pitfalls)

- [ ] Measure the responder's p99 and set the request timeout to two or three times it; a timeout under the real latency retries a responder that was about to answer.
- [ ] Handle no-responders and a timeout separately; an absent responder warrants a backoff, a slow one warrants a fast retry.
- [ ] Key retries by `order_id` and de-dupe on the responder so a re-sent request is a no-op, not a double action.
- [ ] Cap the retry count and add jitter; an unbounded retry loop hammers a struggling responder in lockstep.

### TLS & Auth — see [Pitfalls](/learn/resilient-clients/tls-and-auth#pitfalls)

- [ ] Load credentials from a file or environment and never commit a `.creds` to source.
- [ ] Always supply the CA certificate in production; skip-verify TLS encrypts the link but authenticates nothing.
- [ ] Refresh a credentials JWT before it expires, or monitor the auth-error rate, so an expired token does not silently break the next reconnect.
- [ ] Rotate credentials with a fresh connection and drain the old one; reloading a creds file mid-connection races the live link.

## See also

- [Reference](/reference/) — every connection option, default, and error
  code, versioned and exhaustive.
- [Topologies deep dive](/learn/topologies) — the server pool this
  chapter only connects to, explained from the server side.
- [Security deep dive](/learn/security) — issuing the credentials and CA
  this chapter consumes.
