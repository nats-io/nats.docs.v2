---
id: debugging-delivery
title: "Debugging delivery"
sidebar_position: 11
description: Find out why a published message never arrived, using a wire tap, the subscription list, and message tracing
---

# Debugging delivery

You publish an `orders.created` message and no packer packs the
box. The publish returned without an error, so the message left your
client, but nothing arrived. In core NATS that has one of three causes:

- Nobody was subscribed to that subject when you published, so the server
  had nowhere to deliver the message and dropped it.
- Something was subscribed, but not to the subject you actually published
  on. A typo or an extra token routes the message past every subscriber.
- The subscriber was running, but its connection had dropped, so its
  interest was already out of the server's graph when you published.

A plain publish gives you no feedback to tell these apart. It's
[fire-and-forget](/learn/core-nats/publish-subscribe): the publisher can't
see how many subscribers received the message, or whether any did. A
request at least surfaces an empty subject as a
[no responders](/learn/core-nats/request-reply#no-responders) signal, but a
one-way publish stays silent. This page covers three tools that show you
what actually happened, each aimed at a different cause.

## See every message with a wire tap

The fastest way to learn whether your message went out, and on which
subject, is to watch the traffic directly. Subscribe to the multi-token
wildcard `>` and the server sends you a copy of every message published in
your account. A `>` subscription used this way, to observe traffic rather
than to drive application logic, is a **wire tap**.

<div class="nats-example" data-type="learn-core-nats-debugging-delivery-wire-tap" data-languages="cli"></div>

Each line names the exact subject the message was published on:

```text
12:30:25 Subscribing on >
[#1] Received on "orders.us.created"
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}
```

If you expected `orders.created` and the tap shows `orders.us.created`, the
subject is your problem, not interest. This is how you catch a stray token
or the [whitespace that silently misroutes a
publish](/learn/core-nats/subjects-and-wildcards#pitfalls). If the tap
shows nothing at all when you publish, the message never left your
publisher.

The tap also shows request-reply traffic, including the
[inbox](/learn/core-nats/request-reply#the-inbox) subjects clients generate
for replies, because an `_INBOX` subject is an ordinary subject on the
wire. The subject lines alone show the round trip:

```text
[#2] Received on "orders.inventory.check" with reply "_INBOX.9tQ3pZ.aQ1"
[#3] Received on "_INBOX.9tQ3pZ.aQ1"
```

Message #2 is the request, carrying the reply subject; message #3 is the
answer coming back on that inbox. Seeing both confirms the round trip
happened.

On a busy account, `>` is a lot of traffic to receive, and a subscriber
that can't keep up gets cut off as a slow consumer. Narrow the tap to the
family you're debugging, such as `orders.>`, so you see only the subjects
that matter.

## List the subscriptions the server holds

If the message went out on the right subject but still didn't arrive, the
question moves to interest. The server tracks every subscription in its
in-memory [interest
graph](/learn/core-nats/publish-subscribe#the-interest-graph); you just
need to read it.

On your local server, the plain-HTTP [monitoring
port](/learn/monitoring/monitoring-endpoints) is the way in. Start the
server with one (`nats-server -m 8222`) and its `/subsz` endpoint lists the
subscriptions it holds right now.

<div class="nats-example" data-type="learn-core-nats-debugging-delivery-list-subscriptions" data-languages="cli"></div>

`subs=1` adds a `subscriptions_list`, one entry per subscription, with the
account, the subject, and the connection id (`cid`) behind it. `acc=$G`
scopes the counts to your own account; without it, `num_subscriptions`
spans every account, including the system account's. Even scoped, the
list carries a few `$SYS.REQ.*` service subscriptions the server keeps in
every account — they show up next to your own. The `test` parameter then answers the delivery
question directly: give it the literal subject you published, and `/subsz`
returns only the subscriptions that a message on that subject would match,
wildcards included.

```json
{
  "num_subscriptions": 6,
  "total": 1,
  "offset": 0,
  "limit": 1024,
  "subscriptions_list": [
    { "account": "$G", "subject": "orders.>", "sid": "5", "msgs": 0, "cid": 8 }
  ]
}
```

Here `num_subscriptions` shows the `$G` account holds six subscriptions,
and `total` reports that one of them matches a publish to
`orders.us.created`: the audit service's `orders.>` on connection `8`. An
empty `subscriptions_list` means nobody was subscribed, and a message
published then would be dropped. If Acme needs that order
kept until a subscriber is ready, that's the job of a stream, which
[JetStream](/learn/jetstream) adds on top of these same subjects.

To tell a missing subscription apart from a subscriber whose connection was
cut, look at the connections. The `/connz` endpoint lists them, and with
`?subs=true` it shows each connection's subscriptions; the [monitoring
endpoints](/learn/monitoring/monitoring-endpoints) page covers it in full.
A subscriber that believes it's connected but is absent from `/connz` has
lost its connection, and its interest left the graph with it.

The `nats` CLI can read the same state over NATS itself, with `nats server
request subscriptions` and `nats server request connections`. Both ride
`$SYS` system-account requests. A default `nats-server` has the `$SYS`
account but no user in it, and the system request subjects only answer for
clients connected to `$SYS`, so on a plain local server `nats server request
subscriptions` fails with `server request failed, ensure the account used
has system privileges and appropriate permissions`. `nats server request
connections` still answers there, but only with your own account's
connections. You get the full server-wide view once you connect with
credentials for the [system account](/learn/security), which is how
production and clustered servers are run.

## Trace one message's path

The wire tap shows subjects and the subscription list shows interest.
**Message tracing** reports both for one subject: every subscriber the
message matches and every hop it takes to get there. Run `nats trace` with
the subject.

<div class="nats-example" data-type="learn-core-nats-debugging-delivery-trace-message" data-languages="cli"></div>

`nats trace` needs NATS Server 2.11 or newer. It publishes a special traced
message and prints the route the server computed for it. When nothing is
subscribed to the subject, the trace says so:

```text
Tracing message route to subject orders.us.created

Client "NATS CLI Version development" cid:16 server:"n1" version:"2.11.6"
--X No active interest

Legend: Client: --C Router: --> Gateway: ==> Leafnode: ~~> JetStream: --J Error: --X
```

When a subscriber does match, a line beginning `--C` names it and ends with
the subject its subscription matched on, such as `subject:"orders.>"`. One
`--C` line appears per matching subscriber, so the trace tells you exactly
who a real publish would reach.

One property makes trace safe to run against a live system: without the
`--deliver` flag, the traced message is not handed to those matching
subscribers. The trace reports who would receive it without delivering
anything, so it won't fire your subscribers' side effects. Add `--deliver`
only when you want the traced message delivered for real.

## Which tool answers which symptom

Start from what you can see and pick the tool that narrows it down.

| Symptom | Tool |
|---|---|
| Unsure the publish left your client, or unsure of the exact subject | Wire tap: `nats sub ">"`, then publish and watch |
| Message goes out, but a subscriber you expected gets nothing | Subscription list: `/subsz?subs=1&acc=$G&test=<subject>` to see what matches |
| A subscriber insists it's subscribed yet receives nothing | Connections: `/connz?subs=true` to check its connection is still open |
| You want the authoritative list of who one publish would reach | Trace: `nats trace <subject>` |

If `test=` and `nats trace` both show a matching subscriber but the message
still didn't arrive, the subscriber was absent at the instant you published
and is present now. That timing gap is
[at-most-once delivery](/learn/core-nats/publish-subscribe#at-most-once-delivery):
core NATS delivers only to subscribers connected at the moment of publish,
and never retries.

## Pitfalls

**A `>` tap on a production account receives every message in it.** On a
busy system that can overwhelm the tap and get its connection cut as a slow
consumer. Scope the tap to the subject family you're investigating, like
`orders.>`, and leave it running no longer than you need.

**A trace is its own message, not proof about a past publish.** `nats
trace` publishes a fresh traced message and reports the route that one
takes. It tells you nothing about a message you published earlier, and
without `--deliver` it never reaches your subscribers at all. Read its
output as what a publish to this subject would do now, not what your last
publish did.

**The monitoring port is unauthenticated by default.** Anyone who can reach
`:8222` can read your subjects and connections off `/subsz` and `/connz`.
That's fine on your laptop, but don't expose the port on a shared or public
network. Locking it down is a [security](/learn/security) concern; name it
now so you don't leave it open by accident.

## Where you are

When an Acme order message doesn't arrive, you have a tool for each cause:

- A wire tap (`nats sub ">"`) shows whether the message went out and on
  which subject.
- The subscription list (`/subsz`, with `test=` for a specific subject)
  shows whether any interest matches, and `/connz` shows whether the
  subscriber's connection is still open.
- A message trace (`nats trace`) gives the authoritative list of who a
  publish to one subject would reach, without delivering anything unless
  you ask.

All three read the same interest graph the server uses to route every
message; they just show it to you instead of leaving you to guess.

## What's next

You've reached the end of the core NATS patterns and the tools to debug
them. [Where to go next](/learn/core-nats/where-next) collects the whole
model into one place and points to the chapters that build on it, starting
with the persistence layer that keeps the messages core NATS discards.

## See also

- [Publish-subscribe](/learn/core-nats/publish-subscribe) — the interest
  graph and at-most-once delivery these tools inspect.
- [Monitoring → monitoring endpoints](/learn/monitoring/monitoring-endpoints)
  — `/connz`, `/varz`, and the rest of the monitoring port in depth.
- [Request-reply](/learn/core-nats/request-reply) — the inboxes a wire tap
  sees and the no-responders signal a request gives you.
