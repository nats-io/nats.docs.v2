---
title: Supercluster
description: Connecting clusters with gateways for multi-region NATS
sidebar_position: 4
---

# Supercluster

A **supercluster** is two or more clusters connected via **gateways**. Gateways are an interest-aware link between clusters that propagate only the subject interest (and messages) needed across regions, keeping cross-region traffic minimal.

:::note
Stub page — full reference content is still to come.
:::

## What this page will cover

## Gateways vs routes

Why gateways are not full-mesh routes between clusters and why that matters at WAN scale.

## Configuring gateways

`gateway { name, listen, gateways }` block, mutual configuration, advertise addresses.

## Optimized routing

How NATS minimizes WAN traffic and how that interacts with subject interest.

## JetStream across regions

Mirrors and sources are typically how JetStream data flows across a supercluster — see [Mirrors and Sources](/jetstream/mirrors-and-sources).

## TODO

- Reference architecture: 2-region active-active
- Failure modes when a region is partitioned
- Cost considerations
