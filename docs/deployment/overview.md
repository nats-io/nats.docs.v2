---
title: Overview
description: Choosing and operating a NATS topology
sidebar_position: 1
---

# Deployment & Topologies Overview

NATS is one binary that composes from a single dev server up to a global supercluster with leaf nodes at the edge. This section walks through each shape and how to choose between them.

:::note
This page is a stub. Operational guidance and worked configurations are still to come.
:::

## What this section covers

- [Single Server](./single-server) — one process, simplest setup
- [Cluster](./cluster) — high availability and scale within a site
- [Supercluster](./supercluster) — clusters connected by gateways
- [Leaf Nodes](./leaf-nodes) — extending NATS to edges and other security domains
- [Routing and Connectivity](./routing-and-connectivity) — how interest propagates between servers
- [Choosing a Topology](./choosing-a-topology) — decision guide

## Mental model

Clients always connect to a NATS endpoint. The topology is how servers connect to each other behind that endpoint. You can grow from single server to cluster to supercluster without changing client code.

## TODO

- Decision flowchart
- Reference architectures (HA single region, multi-region active-active, edge)
- Operational checklist for each topology
