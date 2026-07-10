---
id: index
title: "Monitoring & Observability Deep Dive"
sidebar_position: 1
description: Watch a running NATS deployment — where the numbers come from, which ones matter, and how to turn them into alerts and dashboards
---

# Monitoring & Observability Deep Dive

The Develop chapters taught you to *build* (Core NATS, JetStream, and
the rest), and the Operate chapters before this one stood the result up:
the Topologies and Security deep dives gave you a NATS deployment that
runs. This chapter teaches the next thing you need: how to *watch* that
deployment while it runs.

Monitoring is about observation. This chapter shows you where the
numbers live, which ones tell you something's wrong, and how to put them
in front of a person before a customer notices, without telling you how
to *change* the deployment in response. When a number says "scale this"
or "back this up," the page names the symptom and links the Operate
chapter that owns the fix.

We don't build anything new; we take the fully grown Acme ORDERS
deployment you stood up in the earlier chapters (the three-node `east`
cluster, the `ORDERS` stream, and the `shipping` and `analytics`
consumers) and observe it. The whole chapter follows one story: the
`shipping` consumer falls behind, and you watch that happen four
different ways.

## By the end you will have

- Queried each node's **monitoring port `:8222`** for server, client,
  and cluster state, and read connection and route counts for the
  `ORDERS` account.
- Read the live **state** of the `ORDERS` stream and its `shipping`
  consumer, and computed **lag**, how far behind the consumer is, as a
  single number.
- Subscribed to **advisories** and **system events** so you learn about
  events you never actively queried for, like a poison order exhausting
  its deliveries.
- Wired the production loop: an **exporter** scraping `:8222`,
  **Prometheus** storing the numbers as **time series**, **Grafana**
  charting them, and `nats server check` raising an alert when the
  `shipping` consumer's lag crosses a threshold.

## Who this is for

You've worked through the [JetStream deep dive](/learn/jetstream) and
the [Topologies deep dive](/learn/topologies). You know what a stream, a
consumer, an ack, and a cluster are. This chapter reads their *state*;
it doesn't re-explain them. If "consumer lag" or "the `east` cluster"
needs a refresher, those chapters own the definitions.

You don't need to know anything about running NATS in production. This
chapter starts from the point where you can build and now need to watch.

## How to read it

Each page introduces at most two new concepts and carries one running
session forward. You keep the `east` cluster running, then query it,
then attach a subscription, then attach an exporter. Page by page, it's
the same Acme deployment, observed from one more angle each time.

Each page traces every metric back to its source: the endpoint that
serves it or the subject it arrives on. Where a feature has an
exhaustive list of fields or knobs, the page covers only what the
concept needs and links to [Reference](/reference/) for the rest.

## Map

| Page | What you learn |
|---|---|
| [Monitoring endpoints](/learn/monitoring/monitoring-endpoints) | The HTTP monitoring port `:8222` and its on-demand JSON: `/varz`, `/connz`, `/routez`, and the `/jsz` JetStream lens |
| [JetStream health](/learn/monitoring/jetstream-health) | Stream and consumer state, and how to read lag, in-flight, and redelivery as numbers |
| [Advisories and events](/learn/monitoring/advisories-and-events) | Transient messages on `$JS.EVENT.ADVISORY.>` and `$SYS.*` that report events you never actively queried for |
| [Prometheus and dashboards](/learn/monitoring/prometheus-and-dashboards) | The exporter, time series, Grafana dashboards, and `nats server check` alert thresholds |
| [Where to go next](/learn/monitoring/where-next) | A recap of the four lenses and a map of the Operate siblings beyond this chapter |

The four lenses map to four pages: numbers come from the
[endpoints](/learn/monitoring/monitoring-endpoints), lag comes from
[consumer state](/learn/monitoring/jetstream-health), surprises come
from [advisories](/learn/monitoring/advisories-and-events), and history
comes from the
[exporter](/learn/monitoring/prometheus-and-dashboards).

## Prerequisites

You'll need:

- The grown Acme deployment from the earlier chapters running locally:
  the three-node `east` cluster (`n1-east`, `n2-east`, `n3-east`), the
  `ORDERS` stream, and the `shipping` and `analytics` consumers. The
  [Topologies deep dive](/learn/topologies/your-first-cluster) stands up
  the cluster; the [JetStream deep dive](/learn/jetstream/delivery-and-acknowledgment)
  stands up the stream and consumers.
- The monitoring port enabled on each node. It listens on `:8222` by
  default; see [Reference → http_port](/reference/config/http_port).
- The `nats` CLI installed and pointed at the cluster, plus `curl` and
  `jq` for reading raw endpoint JSON. Later pages add the exporter and
  Grafana.

Bring up the `east` cluster, leave it running, and turn to
[Monitoring endpoints](/learn/monitoring/monitoring-endpoints).

## See also

- [Topologies deep dive](/learn/topologies) — the `east` cluster this
  chapter observes
- [JetStream deep dive](/learn/jetstream) — the `ORDERS` stream and the
  `shipping` consumer whose state this chapter reads
- [Reference → monitoring endpoints](/reference/system/monitor) — the
  exhaustive field-by-field layer behind every number here
