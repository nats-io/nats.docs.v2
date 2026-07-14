---
id: where-next
title: "Where to go next"
sidebar_position: 6
description: Recap the four monitoring lenses and point to the Operate siblings and Reference that take watching NATS further
---

# Where to go next

You started this chapter with a deployment you knew how to build but not
how to watch. You end it able to read the `shipping` consumer falling
behind four different ways: as a number on an endpoint, as lag computed
from consumer state, as an advisory you subscribed to, and as a line
climbing on a Grafana panel. That covers the full chapter.

This page doesn't teach anything new. It collects the model you built
into one place and points you at the chapters and Reference that take it
further.

## The four monitoring lenses

Every page in this chapter watched the same Acme ORDERS deployment from
one more angle. If you remember nothing else, remember where each number
comes from.

The **numbers come from endpoints.** The monitoring port `:8222` serves
on-demand JSON: `/varz` for the server, `/connz` for clients, `/routez`
for cluster routes, and `/jsz` for JetStream. When you request an
endpoint, the node returns its current state with no history and no
subscription.

**Lag comes from consumer state.** The stream's `LastSeq` and the
consumer's `delivered.stream_seq` give you lag as a single number, and
`num_ack_pending` and `num_redelivered` tell you what's in-flight and
what keeps coming back. The pinned snapshot (20 waiting, 5 in-flight, 3
redelivered) is consumer health expressed as three numbers.

**Surprises come from advisories.** Events you never polled for arrive as
transient JSON on `$JS.EVENT.ADVISORY.>` and `$SYS.*`. A poison order
exhausting its deliveries publishes one `max_deliver` advisory. You learn
it only if you're subscribed when it fires; otherwise it's gone.

**History comes from the exporter.** prometheus-nats-exporter scrapes
`:8222` and re-exposes the numbers as time series on `:7777`. Prometheus
stores them, Grafana charts them, and `nats server check` raises an alert
when lag crosses a threshold you set.

Everything else in this chapter is a refinement of those four lenses:
endpoints, consumer state, advisories, and the exporter.

## Where the details live now

The chapter is unversioned and concept-first. The exact field types,
defaults, and full endpoint field lists live in **Reference**, which is
versioned and exhaustive. When you need the precise type of a `/jsz`
field or the complete list of `/connz` query params, that's where to
look.

The [Reference root](/reference/) is the entry point. The handoff
phrases throughout this chapter ("the full set of fields is documented
in Reference") all point into it. The
[monitoring endpoints reference](/reference/system/monitor) and the
[advisory reference](/reference/system/advisory) are the two you'll
reach for most.

## Sibling deep dives

This chapter sits in the Operate half alongside its siblings. The others
pick up exactly where a metric stops: this chapter names the symptom,
and the Operate siblings cover the fix.

The [Backup & Recovery deep dive](/learn/backup-recovery) is what you
reach for when the lag you measured here won't drain on its own. It
covers snapshotting a stream and restoring it, the repair this chapter
deliberately never prescribes.

The [Deployment deep dive](/learn/deployment) covers running the things
you watched: sizing and running the exporter and Prometheus, and scaling
the `shipping` consumer pool when its lag climbs for real.

The [Clustering & Replication deep dive](/learn/clustering) explains the
mechanics behind the events you only *observed* here. When a
leader-elected advisory reports a flap, the *why* lives in that chapter's
[raft-and-leaders](/learn/clustering/raft-and-leaders) page.

The [Services deep dive](/learn/services) and its
[observability](/learn/services/observability) page extend the metric
picture to request/reply: service latency and error counts, the one
metric family this chapter pointed at but didn't cover.

## Where you are

This is the end of the chapter. This page adds no new scenario state.
The `east` cluster, the `ORDERS` stream, and the `shipping` and
`analytics` consumers are still running in your session exactly as you
left them, now with an exporter scraping `:8222` and Grafana charting
the result. You can keep watching, or tear the observation stack down and
leave the deployment running.

You hold the core model: the live numbers come from the monitoring
endpoints, lag comes from consumer state, the events you didn't poll for
come from advisories, and the history that turns a number into an alert
comes from the exporter. Those four sources together are how you keep a
NATS deployment observable in production.

## Production checklist

Every page in this chapter closed with a Pitfalls section. This collects
the action items from all of them in one place: a last pass before you
trust this deployment to tell you when it's unhealthy. Each group links
back to the page that explains the why.

### Monitoring endpoints — see [Pitfalls](/learn/monitoring/monitoring-endpoints#pitfalls)

- [ ] Alert on `connections` (active), not `total_connections` (lifetime); connection flapping inflates the lifetime count without anything being wrong.
- [ ] Watch `slow_consumers` on `/varz`; a rising count is a reader that can't keep up.
- [ ] Scope a `/jsz` scrape with `?acc=ORDERS` and page it with `offset`/`limit`; the full `?accounts=true&streams=true&consumers=true` query is slow at scale and will time out.
- [ ] Restrict the monitoring port; it's unauthenticated by default (see [Security](/learn/security)).

### JetStream health — see [Pitfalls](/learn/monitoring/jetstream-health#pitfalls)

- [ ] Read crashed workers as rising `num_pending` with `num_waiting` at `0` and `delivered.stream_seq` stalled; `num_pending` keeps climbing whether or not a client is fetching, so watch those three fields together.
- [ ] Read in-flight (`num_ack_pending`) and lag (`num_pending`) as two separate numbers; confusing the two hides a stuck handler.
- [ ] Remember a filtered consumer's `num_pending` counts only matching subjects; empty pending does not mean an empty stream.

### Advisories and events — see [Pitfalls](/learn/monitoring/advisories-and-events#pitfalls)

- [ ] Persist advisories to a stream subscribed to `$JS.EVENT.ADVISORY.>`; advisories are transient, so if nothing durable is listening when the event fires, you never learn it happened.
- [ ] Treat the `max_deliver` advisory as the only built-in signal a message was dropped; JetStream has no dead-letter queue, so subscribe or lose poison orders silently.
- [ ] Read a leader-elected advisory as a flap report only; the *why* behind the election is [Clustering](/learn/clustering).

### Prometheus and dashboards — see [Pitfalls](/learn/monitoring/prometheus-and-dashboards#pitfalls)

- [ ] Use `/healthz?js-meta-only=true` to check cluster quorum; `?js-enabled-only=true` checks only whether the local node's JetStream is running and returns 200 even with no quorum.
- [ ] Set explicit `nats server check` thresholds like `--unprocessed-critical`; defaults don't know your SLA, and a check with no threshold never fires.
- [ ] Put Prometheus behind the exporter; the exporter stores no history, so on its own you only ever see "now."

## See also

- [Reference → monitoring endpoints](/reference/system/monitor) — every
  endpoint field, type, and query param, versioned and exhaustive.
- [Backup & Recovery deep dive](/learn/backup-recovery) — the fix for a
  lag this chapter only measured.
- [Clustering & Replication deep dive](/learn/clustering) — the mechanics
  behind the leader-elected advisories you observed.
