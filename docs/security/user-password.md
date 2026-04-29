---
title: User / Password
description: Classic credential authentication
sidebar_position: 3
---

# User / Password

Username and password authentication is the most familiar auth model: each user is configured on the server with a (preferably bcrypt-hashed) password and connects with that pair.

:::note
Stub page — full reference content is still to come.
:::

## What this page will cover

## Server configuration

`authorization { users: [...] }` block. Hashing passwords with `nats server passwd`.

## Client connection

URL form `nats://user:pass@host:4222`, or option-based equivalents.

## Per-user permissions

Embedding subject permissions in the user entry.

## When to use it

Internal tools, dev environments, small fleets.

## TODO

- Code samples per language
- Recommended bcrypt cost
- Migration path to JWT
