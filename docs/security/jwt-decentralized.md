---
title: JWT (Decentralized Auth)
description: Operator, account, and user JWTs for production NATS
sidebar_position: 5
---

# JWT (Decentralized Auth)

JWT-based auth is the recommended model for production multi-tenant NATS. Identities are signed claims rather than entries in a server config: the server holds no secrets, and you can issue, rotate, and revoke credentials offline.

:::note
Stub page — full reference content is still to come.
:::

## What this page will cover

## The hierarchy

- **Operator** — root of trust for a deployment.
- **Accounts** — isolation boundaries; messages don't cross accounts unless explicitly imported/exported.
- **Users** — authenticate within an account; carry permission claims.

## Signing keys

How signing keys reduce blast radius if a key is compromised.

## Resolvers

Memory resolver, file resolver, full account-server resolver — and when to choose each.

## `nsc`

The standard tool for managing operators, accounts, users, and signing keys.

## Imports and exports

How accounts share specific subjects across the trust boundary.

## TODO

- End-to-end walkthrough: operator → account → user → connect
- Rotation playbook
- Multi-tenant reference architecture
