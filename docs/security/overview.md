---
title: Overview
description: Authentication, authorization, and encryption in NATS
sidebar_position: 1
---

# Security Overview

NATS gives you three orthogonal security controls: **who is allowed to connect** (authentication), **what they may publish or subscribe to** (authorization), and **how the wire is protected** (TLS). They compose: pick the auth method that fits your operational model, layer subject permissions on top, and run TLS underneath.

:::note
This page is a stub. Configuration recipes and the full account model are still to come.
:::

## What this section covers

- [Tokens](./tokens) — shared-secret connect tokens
- [User / Password](./user-password) — classic credentials
- [NKEYs](./nkeys) — Ed25519 public-key identities
- [JWT (Decentralized Auth)](./jwt-decentralized) — operator/account/user hierarchy
- [TLS / mTLS](./tls-mtls) — transport encryption and certificate auth
- [Auth Callout](./auth-callout) — delegate auth decisions to your own service
- [Authorization](./authorization) — subject permissions, allow/deny, response permissions

## Picking an auth model

For dev: tokens or user/password. For internal services: NKEYs. For production multi-tenant or multi-team: JWT with accounts. Always run TLS in production.

## TODO

- Decision flowchart for auth methods
- Threat model overview
- How accounts isolate tenants
