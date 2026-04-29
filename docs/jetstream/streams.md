---
title: Streams
description: Capturing and storing messages with JetStream streams
sidebar_position: 2
---

# Streams

A **stream** captures messages published to one or more subjects and stores them on disk or in memory. Streams are the durable backbone of JetStream.

:::note
Stub page — full reference content is still to come.
:::

## What this page will cover

## Defining a stream

Subjects, storage type, retention policy, discard policy, max age, max bytes, max messages.

## Creating and inspecting streams

CLI examples for create / info / ls / update / purge / delete.

## Subject mapping into streams

How publishes land in a stream and how overlapping subject filters are resolved.

## Operational notes

Compaction, file storage layout pointers, monitoring counters.

## TODO

- Worked example: an `ORDERS` stream with explanatory output
- Caveats around overlapping streams
- Migration / update semantics
