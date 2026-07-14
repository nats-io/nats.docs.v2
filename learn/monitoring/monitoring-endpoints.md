---
id: monitoring-endpoints
title: "Monitoring endpoints"
sidebar_position: 2
description: "The HTTP monitoring port :8222 and its on-demand JSON — /varz, /connz, /routez, and the /jsz JetStream lens"
---

# Monitoring endpoints

Every number this chapter reads comes from a read-only
HTTP port on each NATS server. Before you reach for Prometheus or
Grafana, you can ask a running node what it sees, right now, with a
plain `curl`. This page covers where the numbers come from on the wire.

We observe the `east` cluster you already have running (`n1-east`,
`n2-east`, `n3-east`) and nothing more. You'll query one node's
monitoring port, read who's connected and how the cluster is wired,
and meet `/jsz`, which reports JetStream state and which the next page builds on.

## The monitoring port serves JSON on demand

Each NATS server can serve a **monitoring port**, separate from the
`:4222` clients use. It's off until you turn it on: set `http_port: 8222`
in the node's config, or pass `-m 8222` on the command line. `8222` is the
conventional choice, but the port is whatever you set. It speaks plain
HTTP, and it answers only when you ask; nothing is pushed. You send a
`GET`, the server returns a JSON snapshot of its state at that instant, and
the connection closes. The model is a synchronous request answered by an
on-demand response.

A **monitoring endpoint** is one HTTP path on that port. Each path
returns a different slice of state. The four you'll use most are
`/varz` (the server itself), `/connz` (its clients), `/routez` (its
cluster routes), and `/jsz` (its JetStream). Each one is an HTTP path,
not a call into a client library, so any HTTP tool can reach it.

<div class="nats-flow" data-scenario="monitoringEndpointsAnimated" data-width="600" data-height="350"></div>

Start with the server itself. `/varz` returns a snapshot of the
process: its version, uptime, memory, and a handful of counters that
matter more than the rest.

```bash
curl -s http://localhost:8222/varz | jq
```

```json
{
  "server_name": "n1-east",
  "version": "2.10.x",
  "connections": 4,
  "total_connections": 118,
  "in_msgs": 84213,
  "out_msgs": 251004,
  "slow_consumers": 0
}
```

Three counters are worth a second look. `connections` is how many clients
are connected *right now*: here, the four Acme services. The
`total_connections` next to it is the count since the server started, so
it only ever goes up. And `slow_consumers` is the number of clients the
server has disconnected for not keeping up; on a healthy node it stays
at `0`. The difference between those first two is easy to get wrong, and the
Pitfalls section returns to it.

The full set of `/varz` fields is documented in
[Reference → varz](/reference/system/monitor/varz). We only need the
connection counters and `slow_consumers` here.

## Every endpoint takes query parameters

A bare endpoint returns everything, which on a busy server is a lot.
Each one accepts **query parameters** to filter, page, and sort the
result, so you fetch only the slice you care about.

`/connz` lists the connected clients. On its own it returns every
connection on the node. Scope it to the `ORDERS` account with `?acc=`,
ask for each connection's subscriptions with `?subs=true`, and add
`?auth=true`, which is what fills in the account and user each connection
authenticated as:

```bash
curl -s 'http://localhost:8222/connz?acc=ORDERS&subs=true&auth=true' | jq
```

```json
{
  "num_connections": 4,
  "total": 4,
  "connections": [
    {
      "cid": 7,
      "account": "ORDERS",
      "authorized_user": "order-svc",
      "rtt": "412µs",
      "pending_bytes": 0,
      "subscriptions_list": ["_INBOX.>"]
    },
    {
      "cid": 9,
      "account": "ORDERS",
      "authorized_user": "order-svc",
      "rtt": "388µs",
      "subscriptions_list": ["orders.shipped"]
    }
  ]
}
```

Each entry names one client: its connection id (`cid`), the account and
user it authenticated as, its round-trip time (`rtt`), and how many
bytes are queued for it (`pending_bytes`). This is where you confirm
that the `ORDERS` account's services, connecting as `order-svc`, are
actually connected, and which subjects each one holds interest in.

The two counts at the top describe the response. `num_connections` is how many
connections this response actually returned; `total` is how many matched
the query in all. They're equal here because four connections fit in
one response, but once you add `?limit` and `?offset` to page a long
list, `total` stays put while `num_connections` shrinks to the page
size.

When a node carries hundreds of connections, page through them. `?limit`
caps the result, `?offset` skips ahead, and `?sort` orders the list by
idle time, pending bytes, or subscription count:

```bash
curl -s 'http://localhost:8222/connz?sort=pending&limit=10' | jq
```

That returns the ten connections with the most data queued: the
clients most likely to fall behind. The full set of `/connz`
parameters is documented in
[Reference → connz](/reference/system/monitor/connz). We use only
`acc`, `subs`, `sort`, and `limit` here.

`/routez` answers the cluster question. Each entry is one **route**:
the link from this node to another node in `east`. It reports the
remote node's name (`remote_name`) alongside its generated server id
(`remote_id`), the link's round-trip time, and how much data is
pending on it:

```bash
curl -s http://localhost:8222/routez | jq
```

```json
{
  "num_routes": 8,
  "routes": [
    { "rid": 3, "remote_name": "n2-east", "rtt": "503µs", "pending_size": 0 },
    { "rid": 6, "remote_name": "n3-east", "rtt": "498µs", "pending_size": 0 }
  ]
}
```

Since 2.10, routes are pooled: each peer contributes several route entries
(a connection pool of three plus a dedicated system-account route), so a
default three-node cluster shows eight entries on `n1-east`, four per peer
— the array above is trimmed to one entry per peer. Health isn't a raw
count, then, but presence: group by `remote_name` and confirm both
`n2-east` and `n3-east` are still there. A peer that vanishes entirely, or
a climbing `rtt`, is your first sign a node has dropped off the mesh. *Why*
a route breaks, and how leadership moves when it does, belongs to
[Clustering](/learn/clustering); the endpoint only tells you *that* it broke.

## /jsz reports JetStream state

The last endpoint is `/jsz`. It reports the JetStream state on a node:
how many streams and consumers it holds, which node is the JetStream
meta leader, and the per-stream and per-consumer numbers underneath.

```bash
curl -s 'http://localhost:8222/jsz?acc=ORDERS&streams=true' | jq
```

```json
{
  "streams": 1,
  "consumers": 2,
  "meta_cluster": { "leader": "n1-east" },
  "account_details": [
    {
      "name": "ORDERS",
      "stream_detail": [
        { "name": "ORDERS", "state": { "messages": 1000, "last_seq": 1000 } }
      ]
    }
  ]
}
```

That `last_seq: 1000` and the consumer numbers under it are the raw
material for **lag**: how far behind the `shipping` consumer is. This
page only points out that `/jsz` reports JetStream state. Reading lag,
in-flight, and redelivery out of it is the work of the next page,
[JetStream health](/learn/monitoring/jetstream-health). The full set of
`/jsz` fields and parameters is documented in
[Reference → jsz](/reference/system/monitor/jsz).

## A note on /healthz

One more endpoint is worth knowing now, even though it doesn't return
state to read. A **health check** is a `/healthz` query whose answer is
just ok or error: a `200` when the node is healthy, a `503` when it
isn't. It's built for an orchestrator (a Kubernetes liveness probe, a
load balancer) that wants a yes/no, not JSON to parse.

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8222/healthz
```

```
200
```

`/healthz` takes parameters that narrow what "healthy" means
(JetStream-only, this-server-only, a specific stream or consumer), and
those distinctions matter for cluster checks. We meet them again on the
[Prometheus and dashboards](/learn/monitoring/prometheus-and-dashboards)
page, where a check that asks the wrong question is its own Pitfall. The
full set of `/healthz` parameters is documented in
[Reference → healthz](/reference/system/monitor/healthz).

## Pitfalls

Two traps catch people the first time they query the monitoring port,
plus one pointer you must not skip. Each is scoped to this page: the
endpoints and their parameters.

**Alert on `connections`, not `total_connections`.** The two counters
on `/varz` look interchangeable and are not. `connections` is the live
count; `total_connections` is every connection since the process
started and only climbs. A client that reconnects in a loop (a crash
loop, a flaky network) barely moves `connections` but inflates
`total_connections` fast. Alert on the lifetime counter and you page
someone at 3am for a number that was always going to grow. Alert on
`connections` for capacity, and watch `slow_consumers` for clients the
server is dropping.

You can read both in one query and compare them yourself. A large gap
between the live count and the lifetime count, especially with
`slow_consumers` above zero, is connection flapping, not load:

```bash
curl -s http://localhost:8222/varz \
  | jq '{live: .connections, lifetime: .total_connections, dropped: .slow_consumers}'
```

```json
{ "live": 4, "lifetime": 118, "dropped": 0 }
```

**An unscoped `/jsz` is slow at scale.** Asking for full detail
(`/jsz?accounts=true&streams=true&consumers=true`) walks every account,
stream, and consumer on the node and serializes the lot. On the four
Acme entities that's instant; on a node with thousands of consumers it
can take long enough that a scrape times out and you get *no* data. Do
not fetch the whole tree on a schedule. Scope to one account with
`?acc=ORDERS`, and page large results with `?offset` and `?limit`.

**The monitoring port is unauthenticated by default.** Anyone who can
reach `:8222` can read `/connz` and see your users, subjects, and
traffic. That's acceptable on a laptop, but in production it exposes that
data to anyone who can reach the port. Locking the
port down (TLS, an allow-list, system-account access) is a security
concern, not a monitoring one, and it's covered in
[Security](/learn/security). Name it now so you don't expose `:8222`
to the open internet by accident.

## Where you are

You can now query a node in the `east` cluster on its monitoring port and
read its state on demand:

- `/varz` for the server: version, live `connections`, `slow_consumers`
- `/connz?acc=ORDERS` for the clients: who's connected, as which user,
  holding interest in which subjects
- `/routez` for the cluster: the routes from this node to its peers
- `/jsz` for JetStream: the streams and consumers, and the raw numbers
  the next page turns into lag

You also know that every endpoint takes parameters to filter and page
the result, that `/healthz` answers a yes/no health check, and that the
port, once enabled, is unauthenticated until you lock it down.

## What's next

`/jsz` handed you a stream's `last_seq` and a consumer's numbers but
left them unexplained. The next page reads the `shipping` consumer's
state in full and turns those raw fields into the one number that says
"the shipping consumer is behind": lag.

Continue to [JetStream health](/learn/monitoring/jetstream-health).

## See also

- [Reference → monitoring endpoints](/reference/system/monitor) — the
  exhaustive field-by-field layer behind every number on this page.
- [Reference → http_port](/reference/config/http_port) — configuring the
  monitoring port itself.
- [Topologies → your first cluster](/learn/topologies/your-first-cluster)
  — the `east` cluster these endpoints observe.
