---
title: Retention and Limits
description: How JetStream decides when to keep or drop messages
sidebar_position: 6
---

# Retention and Limits

A stream's behaviour over time is controlled by its **retention policy** and its **limits**. Together they answer: when does data leave the stream, and what happens when it fills up?

:::note
Stub page — full reference content is still to come.
:::

## What this page will cover

## Retention policies

- `limits` — keep until a configured limit is hit (default).
- `interest` — keep only while at least one consumer is interested.
- `workqueue` — each message is delivered once and then removed.

## Limits

`max_msgs`, `max_bytes`, `max_age`, `max_msg_size`, `max_msgs_per_subject`.

## Discard policy

`old` vs `new` when a limit is reached.

## Choosing a policy

Pattern-by-pattern guidance for event sourcing, work queues, and audit logs.

## TODO

- Decision flowchart
- Worked examples per policy
- Operational warnings (silent drops, alerting)
