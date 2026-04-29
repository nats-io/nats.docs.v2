---
title: Tokens
description: Shared-secret token authentication
sidebar_position: 2
---

# Tokens

Token authentication is the simplest auth method NATS supports: a shared secret string presented at connect time. Useful for getting started, for trusted internal networks, or when paired with TLS in tightly controlled environments.

:::note
Stub page — full reference content is still to come.
:::

## What this page will cover

## Server configuration

`authorization { token: "..." }` block.

## Client connection

How clients pass the token (URL, options, env var).

## When (not) to use tokens

Operational pros and cons; rotation pain.

## TODO

- Code samples per language
- Rotation pattern
- Pairing with TLS
