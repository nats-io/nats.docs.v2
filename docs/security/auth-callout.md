---
title: Auth Callout
description: Delegating authentication decisions to your own service
sidebar_position: 7
---

# Auth Callout

**Auth callout** lets a NATS server delegate the decision to authenticate a connecting client to a service of your choice — over NATS itself. This is the integration path for OIDC, LDAP, internal IdPs, or any custom flow you need.

:::note
Stub page — full reference content is still to come.
:::

## What this page will cover

## How it works

The server forwards the connect attempt to a configured callout service over a NATS subject. The service inspects the credentials, optionally talks to your IdP, and responds with a signed user JWT (or a denial). The server then treats the client as if it had connected with that JWT.

## Server configuration

The `authorization { auth_callout { ... } }` block: issuer, account, target subject, signing keys.

## Building a callout service

Request shape, response shape, signing requirements, error handling.

## Use cases

OIDC bridge, corporate SSO, dynamic permissions per user.

## TODO

- End-to-end OIDC example
- Sequence diagram of the callout flow
- Operational notes (HA of the callout service, latency)
