---
id: prometheus-and-dashboards
title: "Prometheus & dashboards"
sidebar_position: 5
description: Scrape the monitoring port into Prometheus time series, chart them in Grafana, and alert with nats server check thresholds
---

# Prometheus & dashboards

Every number so far is a snapshot. When you `curl` the monitoring port you
see "now," and when you read the `shipping` consumer's state you learn it's
20 orders behind *at this instant*. None of it is stored. If you refresh the
query a minute later the old value is gone, with no record of whether
the lag is climbing or shrinking.

This page closes that gap. It takes the same numbers you already know how
to read (the lag, the in-flight count, the redeliveries) and
turns them into a production loop: an exporter that scrapes the
monitoring port, Prometheus that stores the result as time series, Grafana
that charts it, and a check that alerts before a person has to look.

We add no new entities. The `east` cluster, the `ORDERS` stream, and the
`shipping` consumer are all from the earlier chapters. We attach one new
piece of plumbing, the exporter, outside NATS, and watch the orders
deployment from one more angle.

## The exporter converts JSON to time series

The monitoring port serves JSON when you ask for it. Prometheus doesn't
read NATS JSON; it reads its own metrics format, and it pulls that
format on a schedule. **prometheus-nats-exporter** is the program that
connects the two: it scrapes the
monitoring port and re-exposes the numbers as Prometheus metrics.

A **time series** is a single named number recorded repeatedly over
time, and it's what Prometheus stores. Where `/jsz` gave you `num_pending` once,
the time series `nats_consumer_num_pending` is that same lag value
sampled every scrape, so you can see it rise.

The exporter runs *outside* NATS. You point it at a node's monitoring
port `:8222`, tell it which collectors to enable, and it serves its own
`/metrics` endpoint on `:7777`:

```bash
# The exporter runs outside NATS. -jsz turns on the JetStream collector
# (streams and consumers); it scrapes :8222 and serves /metrics on :7777.
# -prefix nats renames the metrics from the exporter's default jetstream_
# prefix to nats_ (the same rename the NATS Helm chart applies).
prometheus-nats-exporter -jsz=all -prefix nats -port 7777 http://localhost:8222
```

A **scrape** is one request to an endpoint that fetches its current
numbers. When Prometheus scrapes the
exporter's `:7777`, the exporter scrapes the NATS node's `:8222`,
transforms the JSON into metrics, and hands them back. The exporter holds
no history of its own; it answers each scrape from a fresh read of the
monitoring port.

The JetStream collector turns the consumer state you already know into
named time series. The lag field `num_pending` becomes
`nats_consumer_num_pending`; redeliveries become
`nats_consumer_num_redelivered`; the stream message count becomes
`nats_stream_total_messages`. The names follow the wire fields you read on the
last page. By default the exporter prefixes JetStream metrics with
`jetstream_`; the `-prefix nats` flag renames them to the `nats_` prefix
used here, matching what NATS Helm deployments set.

```
# /metrics on :7777 — the shipping consumer's lag as a Prometheus series
nats_consumer_num_pending{account="ORDERS",stream_name="ORDERS",consumer_name="shipping"} 20
nats_consumer_num_ack_pending{account="ORDERS",stream_name="ORDERS",consumer_name="shipping"} 5
nats_consumer_num_redelivered{account="ORDERS",stream_name="ORDERS",consumer_name="shipping"} 3
nats_stream_total_messages{account="ORDERS",stream_name="ORDERS"} 1000
```

The pairs in braces are **labels**, the dimensions that tell one
series from another. Each metric is tagged with `account`, `stream_name`,
and `consumer_name`, so Prometheus can keep the `ORDERS` account's
`shipping` lag separate from the `analytics` lag, and from any other
account's. The pinned snapshot's 20 waiting, 5 in-flight, and 3
redelivered survive the round trip exactly, now as labeled series.

The full set of exporter metrics and labels is documented in
[Reference](/reference/). We only need the consumer-lag series here.

## Prometheus, Grafana, and the check

The exporter exposes "now." Prometheus, Grafana, and the check sit behind
it and turn "now" into something you can act on.

**Prometheus** scrapes the exporter's `:7777` on its own interval and
appends each value to its time series store. This is where the time
series live: once Prometheus has been scraping for an hour, the
`shipping` consumer's
`num_pending` is no longer a single number but a line you can plot. You
point Prometheus at the exporter with a scrape target in its config:

```yaml
# prometheus.yml — scrape the exporter every 15 seconds
scrape_configs:
  - job_name: nats
    scrape_interval: 15s
    static_configs:
      - targets: ["localhost:7777"]
```

**Grafana** reads Prometheus and draws it. A **dashboard** is a Grafana
view; one chart on it is a panel. A dashboard for the orders deployment
puts the `shipping` consumer's `nats_consumer_num_pending` on a panel,
so when the consumer falls behind, the line climbs on screen.
Grafana publishes community dashboards for NATS that read a Prometheus
data source out of the box; you import one and point it at your
Prometheus.

Watch the whole loop run: the exporter scrapes the node, Prometheus
stores the rising lag, Grafana charts it, and the check fires when the
series crosses its threshold.

<div class="nats-flow" data-scenario="metricsScrapeAnimated" data-width="600" data-height="350"></div>

**`nats server check`** is the alerting side. Where a dashboard needs a person
watching it, a check fires on its own. The CLI runs a check against a
consumer, compares a metric to a threshold you set, and returns an
OK / WARNING / CRITICAL verdict in a format Prometheus, Nagios, or a
plain script can read. Pointed at the `shipping` consumer with a lag
threshold, it turns the 20-pending number into an alert when it crosses
the line:

<div class="nats-example" data-type="learn-monitoring-prometheus-and-dashboards-checkConsumer" data-languages="cli,js,go,python,java,rust,csharp,c"></div>

**nats-surveyor** is a separate service that covers the whole deployment
at once. It connects to the system account, polls every server for its
`Statz` (the same summary data `nats server report` reads), and exposes
the combined metrics on one `/metrics` endpoint for Prometheus to scrape.
It needs a system-account credential, and it's an alternative to running
the exporter against one node at a time.

The full set of metric names, check flags, and surveyor options is
documented in [Reference](/reference/). The service-latency metrics that
let you chart request/reply timing belong with services, in
[Services → observability](/learn/services/observability).

## Pitfalls

Teams hit three common problems the first time they wire NATS into Prometheus and
Grafana. Each stays within this page's two concepts: the exporter, and
the alert-and-chart layer behind it.

**A node-local health check passes even with no quorum.** A
`/healthz?js-enabled-only=true` query asks only whether *this* node's
JetStream subsystem is running. It returns `200` even when the cluster has
lost the quorum that keeps the `ORDERS` stream writable, because it never
looks past the local server. Do not wire a node-local check as your only
JetStream alert. Add a meta-cluster check with `?js-meta-only=true`,
which reports whether the JetStream meta layer across the `east` cluster
is healthy:

```bash
# Node-local: is THIS node's JetStream subsystem running? 200 even with no quorum.
curl -s -o /dev/null -w "%{http_code}\n" \
  "http://localhost:8222/healthz?js-enabled-only=true"

# Meta-cluster: is the JetStream meta layer across the cluster healthy?
# This is the one that turns 503 when the cluster loses quorum.
curl -s -o /dev/null -w "%{http_code}\n" \
  "http://localhost:8222/healthz?js-meta-only=true"
```

*Why* the cluster lost quorum isn't a monitoring question; the health
check only reports the symptom. The mechanics live in
[Clustering → raft and leaders](/learn/clustering/raft-and-leaders).

**A check with no threshold never fires.** `nats server check consumer`
has defaults, but the defaults don't know your SLA. A check run without
`--unprocessed-critical` will sit at OK while the `shipping` consumer's lag
climbs past anything you'd care about, because nothing told it where
the line is. Always set explicit thresholds that match what the orders
deployment can tolerate; the `checkConsumer` example above pins
`--unprocessed-critical 100` for this reason. A silent check looks like
coverage while providing none, which makes it worse than having no check.

**The exporter keeps no time series.** The exporter is stateless: every
scrape is a fresh read of `:8222`, and the moment you stop scraping, the
past is gone. Without Prometheus behind it, `nats_consumer_num_pending`
is the same one-shot "now" you started this page trying to escape: you
gain a metrics format, not a record. Do not treat the exporter alone as
monitoring. The exporter only converts the format, and Prometheus is what
stores the history, so run both. Without Prometheus you're back to refreshing
a query by hand.

## Where you are

You now have the full production loop around the orders deployment. The
exporter scrapes the monitoring port `:8222` and re-exposes the
`shipping` consumer's lag as the time series `nats_consumer_num_pending`,
labeled by `account`, `stream_name`, and `consumer_name`. Prometheus
scrapes the exporter on its own interval and stores that time series.
Grafana charts it, so a climbing lag shows as a rising line. And
`nats server check` raises a CRITICAL on its own when the lag crosses a
threshold you set.

You've watched the `shipping` consumer fall behind four ways now: as
`num_pending` on `/jsz`, as lag computed from the consumer's state, as a
`max_deliver` advisory, and as a rising time series on a Grafana panel.
That's the focus of this chapter: the same symptom, observed from every
angle a running deployment offers.

## What's next

The next page recaps the four ways of observing, points to where the *fixes* for
what you observe live, and collects every page's Pitfalls into one
production checklist.

Continue to [Where to go next](/learn/monitoring/where-next).

## See also

- [JetStream health](/learn/monitoring/jetstream-health) — the raw
  consumer state these time series are built from
- [Services → observability](/learn/services/observability) — the
  service-latency metrics for request/reply timing
- [Reference](/reference/) — the exhaustive list of exporter metric
  names, labels, and check flags
