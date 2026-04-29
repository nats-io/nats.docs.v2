---
title: Security
description: Authenticating clients and authorizing what they can do
sidebar_position: 7
---

# Security

NATS authenticates every connection and authorizes every subject. Pick the auth style that fits: tokens or user/password for quick starts, NKEYs (Ed25519 keys, server holds no secrets) for service identities, JWT with operator/account/user hierarchy for multi-tenant production, mTLS for transport identity, or auth callout to delegate to your own IdP.

**Authorization** sits on top: per-user or per-account rules govern which subjects a client may publish to, subscribe to, and reply on.

```text
authorization {
  users = [
    { user: "orders-svc", password: "$2a$11$...bcrypt..." }
  ]
}
```

A client connects with those credentials:

<div class="nats-example" data-type="security-userpass-connect" data-languages="cli,go,rust"></div>

[Deep dive: Security →](/security/overview)
