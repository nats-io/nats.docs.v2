---
title: Replication
description: Replicated streams for high availability
sidebar_position: 7
---

# Replication

JetStream replicates streams across servers in a cluster using Raft. With `replicas: 3` (or 5), a stream survives the loss of a minority of servers without data loss or downtime.

:::note
Stub page — full reference content is still to come.
:::

## What this page will cover

## Setting replicas

Per-stream configuration; relationship to cluster size.

## Leader, followers, quorum

How writes are committed and how a leader is elected on failure.

## Failure scenarios

Single-server loss, network partition, leader step-down.

## Monitoring replication health

Counters and signals to alert on.

## TODO

- Diagram of leader/follower flow
- CLI: `nats stream cluster step-down`, `info`
- Sizing note: odd replica counts only
