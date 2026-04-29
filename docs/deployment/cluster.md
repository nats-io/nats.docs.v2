---
title: Cluster
description: A group of NATS servers acting as one
sidebar_position: 3
---

# Cluster

A NATS **cluster** is a set of servers that share full subject interest and present a single logical NATS to clients. Clusters provide high availability, horizontal scale, and the substrate for JetStream replication.

:::note
Stub page — full reference content is still to come.
:::

## What this page will cover

## Sizing

Recommended sizes (3 or 5 for JetStream quorum), networking requirements, latency expectations.

## Configuring a cluster

`cluster { listen, routes, name }` block, full-mesh routes, seed routes.

## Client connection

Server lists, automatic discovery, reconnect behaviour.

## JetStream in a cluster

Replication, leader placement, asset placement (per-account stream count).

## Operating a cluster

Rolling upgrades, adding/removing servers, observing route health.

## TODO

- Worked 3-node cluster config
- Diagram of routes and interest propagation
- Failure-mode walkthrough
