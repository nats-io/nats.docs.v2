---
title: Authorization
description: Subject permissions, allow/deny, and response permissions
sidebar_position: 8
---

# Authorization

Authentication answers *who is connecting*. **Authorization** answers *what they may do once connected* — which subjects they may publish to, which they may subscribe to, and which subjects responses to their requests are allowed to flow on.

:::note
Stub page — full reference content is still to come.
:::

## What this page will cover

## Subject permissions

`publish` and `subscribe` allow/deny lists; wildcard semantics.

## Allow vs deny precedence

How NATS evaluates rules and what wins on conflict.

## Response permissions

Bounded, time-limited reply subjects automatically allowed for request flows.

## Per-user vs per-account

Where permissions live in static config vs JWT claims.

## Common patterns

Service accounts that may only publish to one prefix; consumers that may only subscribe to a subset; dual-purpose services.

## TODO

- Worked permission examples
- Debugging permission denials
- Matrix of allow/deny outcomes
