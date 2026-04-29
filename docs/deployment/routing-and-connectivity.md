---
title: Routing and Connectivity
description: How interest and messages flow between NATS servers
sidebar_position: 6
---

# Routing and Connectivity

NATS servers don't blindly forward every message. They propagate **subject interest** to each other and only deliver messages where there's interest. This page explains how that works across routes, gateways, and leaf links.

:::note
Stub page — full reference content is still to come.
:::

## What this page will cover

## Interest propagation

Subscriptions create interest; that interest is shared between servers so messages reach the right place exactly once per server.

## Routes (intra-cluster)

Full mesh of routes inside a cluster, full interest sharing, low latency assumed.

## Gateways (inter-cluster)

Optimized for WAN; interest is exchanged in summarized form to keep traffic down.

## Leaf links

Asymmetric, account-aware connections to hub clusters.

## Loop prevention

How NATS prevents message loops across complex topologies.

## TODO

- Diagram showing all four link types
- Latency / bandwidth notes per link type
- Troubleshooting interest propagation
