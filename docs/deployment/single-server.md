---
title: Single Server
description: Running a single NATS server
sidebar_position: 2
---

# Single Server

A single NATS server is the simplest deployment: one process, one config file, one port for clients.

:::note
Stub page — full reference content is still to come.
:::

## What this page will cover

## When a single server is the right choice

Dev, embedded scenarios, very small workloads, or as a leaf bridging into a managed cluster.

## Running it

`nats-server` from binary, Docker, or systemd. Config file vs flags.

## Limits

No replication, single point of failure for JetStream data, no horizontal scale.

## Migrating to a cluster

How to grow without losing data.

## TODO

- Production checklist (limits, monitoring, backups)
- Link to getting-started for install steps
