---
title: Choosing a Topology
description: A decision guide for picking the right NATS shape
sidebar_position: 7
---

# Choosing a Topology

Most NATS deployments are simpler than they look. This page is a decision guide to help you pick the smallest topology that meets your requirements — and grow it gracefully as needs change.

:::note
Stub page — full reference content is still to come.
:::

## What this page will cover

## Decision questions

- Do you need high availability? (cluster)
- Do you need geo-distribution? (supercluster)
- Do you have edge sites or untrusted networks? (leaf nodes)
- Do you need durable streaming? (JetStream — affects cluster sizing)
- Do you need multi-tenancy? (accounts — affects auth model, see Security)

## Reference architectures

Single-server dev, 3-node HA cluster, multi-region active-active supercluster, hub + leaves.

## Anti-patterns

When not to add a cluster, when not to use a leaf, when not to span regions in one cluster.

## TODO

- Decision flowchart
- Sizing rules of thumb
- Migration paths between topologies
