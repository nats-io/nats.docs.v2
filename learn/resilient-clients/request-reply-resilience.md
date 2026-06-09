---
id: request-reply-resilience
title: "5. Request-Reply Resilience"
sidebar_position: 6
description: Tell a slow responder apart from an absent one, then retry the request safely with backoff and idempotent IDs
---

# 5. Request-Reply Resilience

So far this chapter has hardened the connection underneath one-way
traffic: `order-svc` publishes orders, and the subscribers receive them.
But `order-svc` also asks questions. Before it confirms an order it sends
a request on `orders.inventory.check` and waits for the `inventory`
responder to answer. That call is where a fault hurts most, because the
application is blocked on the reply.

Core NATS already taught you the mechanics of request-reply: the client
sends a request, the responder answers on a private `_INBOX` subject, and
the reply finds its way back. This page assumes that machinery and asks
the harder question: *what happens when the reply does not come?* The
answer is that a request can fail in two different ways, and the two mean
different things — so the client must tell them apart before it retries.

Two new ideas carry the page: the **request timeout and the
no-responders signal**, and **retry with backoff plus idempotency**. We
define each before we use it.

## A request has three outcomes

A bare `request` from Core NATS takes a subject, a payload, and a
**timeout** — the deadline by which a reply must arrive. Wait on it and
exactly one of three things happens.

The first is the happy path: the `inventory` responder answers, and the
reply comes back inside the deadline. The application reads it and moves
on.

The second is a **timeout**. The deadline passes with no reply. A timeout
does not say the responder is gone — it says no answer arrived *in time*.
The `inventory` responder may be up and simply slow: a long database
query, a GC pause, a burst of load. The request was delivered to a live
listener; the reply just did not come back fast enough.

The third is **no responders**. The moment the client sends the request,
the server already knows whether any subscription is listening on
`orders.inventory.check`. If none is, the server sends back an immediate
**no-responders signal** — a 503 status with no body — and the request
call returns at once instead of waiting out the timeout. No responder
means the `inventory` service is not running, not registered, or its
account cannot see the subject. This is not a slow answer; it is the
absence of anyone to answer.

Here is `order-svc` asking the inventory question with a timeout set. The
CLI prints the reply on success, a timeout message if the deadline
passes, and the 503 immediately if nobody is listening:

<div class="nats-example" data-type="learn-resilient-clients-request-reply-resilience-request-basic" data-languages="cli,js,go,python,java,rust,csharp"></div>

The request carries the same canonical order shape used everywhere in
this chapter:

```json
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}
```

The full set of connection options is documented in
[Reference](/reference/). We cover only the ones that change how a
connection behaves under fault here.

## Why no-responders is a gift

It is tempting to treat a missing answer as a missing answer and stop
there. But the no-responders signal is the most useful failure NATS
gives you, because it is *fast and certain*. Without it, a request to a
subject nobody listens on would simply sit until the timeout expired —
two seconds of the application blocked, learning nothing it did not
already know.

With it, the client finds out in a single round trip that there is no
`inventory` responder at all. That lets the two failures drive different
behavior. A timeout says "someone is there, try again soon." No
responders says "nobody is there yet, give them a moment to start." The
retry strategy in the next section turns that distinction into code.

Watch the difference play out — a request that times out, waits, retries,
and finally gets a reply, alongside the no-responders path that returns
the instant it is sent:

<div class="nats-flow" data-scenario="requestRetryAnimated" data-width="600" data-height="350"></div>

The no-responders signal needs a server new enough to send the 503 and a
client that advertised support for it during the connect handshake. Both
have been the default for years; you get it for free on any current
setup. You can see it yourself by requesting a subject nobody answers:

<div class="nats-example" data-type="learn-resilient-clients-request-reply-resilience-no-responders" data-languages="cli,js,go,python,java,rust,csharp"></div>

## Retry, but retry differently per failure

Knowing the two failures apart is only useful if the client *acts*
differently on each. That is **retry with backoff**: re-sending a failed
request, with a growing wait between attempts so a struggling responder
gets room to recover instead of being hammered.

The two failures want different timing. A **timeout** means the responder
is up but slow, so a fast retry is reasonable — it may answer on the
second try. **No responders** means nothing is listening, so an immediate
retry is wasted; the responder is likely starting up, and the client
should back off with a growing wait to give it time to register. Use a
short, bounded retry for a timeout and an exponential backoff for no
responders.

Either way the retry loop must be **bounded**. An unbounded retry against
a responder that never comes back is a busy loop that never ends. Cap the
attempts — five is a sane default — and add jitter to the wait so a fleet
of requesters does not retry in lockstep and stampede the responder the
instant it returns.

There is one more thing a retry needs to be safe, and it is the second
concept of this page: **idempotency**. A retried request is a *duplicate*
request. If the first attempt actually reached the `inventory` responder
and only the reply was lost, the retry asks the same question a second
time. If asking twice causes two effects — two stock reservations, two
charges — the retry has corrupted state.

The fix is to make a duplicate a no-op. `order-svc` keys every inventory
check by its `order_id` (`ord_8w2k` here), and the `inventory` responder
remembers recently seen IDs. A request whose `order_id` it has already
answered returns the cached reply instead of reserving stock again. The
ID is already in the payload, so making the call idempotent costs nothing
on the wire — it is a discipline on both ends, not a new message.

A request in flight when the connection drops is simply lost; NATS does
not persist it. The inbox re-subscribes automatically on reconnect (the
reconnection page covered that), so a retry after the link returns works
normally — and because the retry is idempotent, replaying it is safe even
if the original had reached the responder before the drop.

## Pitfalls

A few traps turn request resilience into either a hang or corrupted
state. Each is scoped to this page's two ideas: the two failures, and
safe retry.

**Treating a timeout and no-responders as the same failure.** They are
not. A blind "retry on any error" backs off the same way for both, which
is wrong in both directions: it wastes a fast-retry opportunity on a slow
responder and it hammers a subject that has no responder at all. Branch
on the error — fast-retry a timeout, exponential-backoff a no-responders
— so the client matches its behavior to what actually went wrong.

**A timeout shorter than the responder's real latency.** If you set the
timeout below what the `inventory` responder needs at its p99, every busy
moment looks like a failure and the client retries answers that were
already on their way back. Measure the responder's latency and set the
timeout to two or three times its p99, so a slow-but-healthy answer is
not mistaken for a fault.

**An unbounded retry loop.** Retrying forever against a responder that
never returns is a busy loop that pins a CPU and never surfaces the
problem. Always cap the attempts, add jitter, and give up loudly — log
the failure and let the caller decide — rather than spinning in silence.

**A non-idempotent retry that double-acts.** If the first attempt reached
the `inventory` responder and only the reply was lost, a naive retry
reserves stock twice. Key every request by `order_id` and have the
responder de-dupe on it, so replaying a request is always safe.

Here is the safe pattern: branch on the failure, bound the retries, and
key the request by `order_id` so a duplicate is a no-op on the responder
side:

<div class="nats-example" data-type="learn-resilient-clients-request-reply-resilience-retry-idempotent" data-languages="cli,js,go,python,java,rust,csharp"></div>

## Where you are

`order-svc`'s inventory check now distinguishes "responder absent" from
"responder slow" and retries each correctly. You have:

- A request call that reads its three outcomes apart: a reply, a timeout,
  or an immediate no-responders signal.
- A retry that fast-retries a timeout, backs off on no-responders, and is
  bounded with jitter so it never busy-loops or stampedes.
- Idempotent requests keyed by `order_id`, so a retry after a lost reply
  or a reconnect never double-acts.

The connection now rides through faults in every direction it sends and
receives traffic. What it still does in the clear is *everything* — the
bytes on the wire are readable, and the server takes whatever name the
client offers.

## What is next

The last mechanism in this chapter is **TLS and auth**: pointing the
client at the `order-svc` credentials file so it authenticates, and at
the cluster CA so it validates the server over an encrypted link.

Continue to [6. TLS & Auth](/learn/resilient-clients/tls-and-auth).

## See also

- [Core NATS → Request-Reply](/learn/core-nats/request-reply) — the
  `_INBOX` mechanism this page assumes.
- [Services](/learn/services) — the framework that builds discovery,
  endpoints, and metrics on top of raw request-reply.
- [Reference](/reference/) — the full set of request and timeout options.
