---
title: Leaf Nodes
description: Extending NATS to the edge or another security domain
sidebar_position: 5
---

# Leaf Nodes

A **leaf node** is a NATS server that connects outward into an existing NATS deployment, acting as a local presence for clients while bridging up to a hub cluster. Leaf nodes are the standard way to put NATS at an edge site, in a customer's VPC, on a device, or to bridge accounts.

:::note
Stub page — full reference content is still to come.
:::

## What this page will cover

## Leaf vs route vs gateway

When each is appropriate. Leaf is one-way connect, asymmetric, often crosses trust boundaries.

## Configuring a leaf

`leafnodes { remotes: [...] }` block, credentials, TLS.

## Account bridging

How a leaf maps into an account on the hub side, and what gets imported/exported.

## JetStream on leaves

Local JetStream vs hub JetStream; mirroring streams down to the edge.

## TODO

- Reference architecture: factory floor / branch office
- Diagram of leaf attaching to a hub cluster
- Hybrid cloud pattern
