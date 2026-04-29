---
title: NKEYs
description: Ed25519 public-key identities for NATS
sidebar_position: 4
---

# NKEYs

**NKEYs** are NATS's native Ed25519 public-key identities. The server stores only the public key; the client proves possession of the private key via a signed nonce at connect time. No shared secrets, no passwords on disk on the server.

:::note
Stub page — full reference content is still to come.
:::

## What this page will cover

## Generating NKEYs

`nk -gen user` and friends; key prefixes (`U`, `A`, `O`, `N`, `S`, etc.).

## Server configuration

`authorization { users: [{ nkey: "U...", permissions: { ... } }] }`.

## Client signing

How SDKs sign the server-issued nonce; passing seeds securely.

## Why NKEYs over passwords

No secret on the server, faster to verify, integrates cleanly with JWT.

## TODO

- Code samples per language
- Key-storage recommendations
- Mapping to accounts
