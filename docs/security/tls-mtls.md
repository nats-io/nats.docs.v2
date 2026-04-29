---
title: TLS / mTLS
description: Encrypting NATS connections and authenticating clients with certificates
sidebar_position: 6
---

# TLS / mTLS

TLS encrypts every byte on the wire between clients and servers (and between servers). **Mutual TLS (mTLS)** additionally authenticates the client via its certificate — meaning the certificate itself can be the identity, replacing or layering with other auth methods.

:::note
Stub page — full reference content is still to come.
:::

## What this page will cover

## TLS server config

`tls { cert_file, key_file, ca_file, verify, verify_and_map }`.

## Client TLS

Trust roots, SNI, cipher suites.

## mTLS as authentication

`verify_and_map` and how subject DNs map to NATS users.

## Inter-server TLS

TLS for routes, gateways, and leaf links.

## Certificate rotation

Reload patterns and zero-downtime rotation.

## TODO

- Recommended cipher set / TLS versions
- Code samples per language for mTLS clients
- Cert-manager / Vault integration notes
