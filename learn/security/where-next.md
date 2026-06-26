---
id: where-next
title: "Where to go next"
sidebar_position: 10
description: The whole security model in one picture, and where to read further
---

# Where to go next

You've secured the ORDERS world end to end. This page puts the whole
model back together in one picture, then points you at the chapters and
references that go past where this one stops.

## The whole model in one picture

Every page in this chapter added one piece. Here they are, one sentence
each.

An **account** is the tenant boundary. A **user** is an identity inside
that account. **Permissions** decide which subjects that user may
publish and subscribe to. **TLS** protects the wire those messages
travel over.

Four pieces, four questions:

- **Account**: _whose world is this?_ Traffic in `ORDERS` never reaches
  `ANALYTICS`, because the two accounts have separate subject spaces.
- **User**: _who are you?_ `order-svc` and `analytics-reader` each prove
  an identity before the server admits them.
- **Permissions**: _what may you do?_ `order-svc` may publish `orders.>`
  and nothing else. The allow-list closes the rest.
- **TLS**: _is the connection safe?_ The bytes between client and server
  are encrypted, and with mTLS the client's certificate can _be_ the
  identity.

If you can answer those four questions for a connection, you understand
its security posture. Everything else in this chapter is detail on how
you configure each answer.

## The two ways to answer "who are you?"

The one fork worth restating is authentication. The chapter taught it
twice on purpose.

**Centralized authentication** keeps the user list in the server's own
config. The server checks a credential against that list directly. It's
the right tool for one server and a handful of users.

**Decentralized authentication** moves the user list out of the server.
An operator signs accounts, accounts sign users, and the server trusts
only the operator's public nkey. It's the right tool when you have many
tenants, or when you don't want to restart the server to add a user.

Both produce the same runtime model: an authenticated user, scoped to an
account, bound by permissions. They differ only in _where the identity
lives_ and _who signs it_.

## What this chapter did not cover

This chapter taught security as it applies to a single server and a pair
of accounts. Three things change at scale, and each has its own home.

**Multiple servers.** A cluster, a leaf node, and a gateway are each a
connection type, and each carries its own TLS and authentication. The
[Clustering](/learn/clustering) chapter covers how servers authenticate
to one another and how routes are encrypted.

**Leaf nodes specifically.** A leaf node connects an edge server (or a
laptop) into a hub, often across a trust boundary. How its account and
credentials map into the hub is a security topic in its own right, and it
lives in [Leaf nodes](/learn/topologies/leaf-nodes).

**Hardening the deployment.** The wider posture of a production
deployment (file permissions on creds, system-account access, limits
that stop one tenant starving another) is collected in
[Deployment hardening](/learn/deployment/hardening).

## Security and JetStream together

The running scenario was a JetStream world. Securing it raises one
question this chapter pointed at but didn't unpack: what happens to the
stored data and the stream's resilience.

Encryption at rest, covered in one line on the
[Encryption & TLS](/learn/security/encryption) page, protects the
messages a stream keeps on disk. The resilience side (how a stream
survives losing the server it lives on) is its own subject in
[Surviving node loss](/learn/jetstream/surviving-node-loss).

The two chapters connect here. Security decides _who_ may access a
stream. JetStream's replication decides _whether the stream is still
there_ to be accessed.

## Reading the reference

This chapter showed one runnable happy path per concept. It deliberately
left out the exhaustive tables: every TLS cipher suite, every JWT claim,
every export option.

When you need that depth, the generated [Reference](/reference/) is the
source. It documents the wire protocol and the configuration surface in
full. Use this chapter for the _why_ and the _shape_; use the reference
for the exact field, type, and default.

## The map of this chapter

If you want to revisit one piece, here's the chapter in order:

1. [Accounts & Multitenancy](/learn/security/accounts-and-multitenancy):
   the tenant boundary.
2. [Authentication Basics](/learn/security/authentication-basics):
   centralized, config-based identity.
3. [Decentralized Authentication](/learn/security/decentralized-auth):
   the operator → account → user trust chain.
4. [Operator Mode](/learn/security/operator-mode): the `nsc` workflow
   that builds that chain.
5. [Authorization](/learn/security/authorization): subject permissions.
6. [Cross-Account](/learn/security/cross-account): exports and imports.
7. [Encryption & TLS](/learn/security/encryption): securing the wire.
8. [Auth Callout](/learn/security/auth-callout): delegating the
   authentication decision to an external service.

## Where you are

You can answer the four questions (account, user, permissions, TLS) for
any NATS connection. You've built the same two-account ORDERS world
twice, once in centralized config and once under an operator, and you've
shared exactly one subject across the boundary on purpose.

That's the whole model. The chapters above take it to many servers, many
tenants, and a production deployment.

## Production checklist

Each page in this chapter ends with a Pitfalls section. Here they are as
one scannable list: the things to actually do before a deployment goes
live. Each group links back to the page that explains the why.

**Accounts**: see [Pitfalls](/learn/security/accounts-and-multitenancy#pitfalls)

- [ ] Point `no_auth_user` at a deliberately narrow user, never a wide-open account.
- [ ] Declare a `SYS` account with a user and set `system_account: SYS` so server events stay reachable.
- [ ] Never rely on a shared subject name to bridge accounts; use an explicit export/import.

**Centralized authentication**: see [Pitfalls](/learn/security/authentication-basics#pitfalls)

- [ ] Give every server a user list so an unauthenticated connect is rejected.
- [ ] Store bcrypt hashes, not plaintext passwords, in any deployed config.
- [ ] Keep credentials out of committed config: reference a secret store and `.gitignore` the real file.
- [ ] Put credentials in a named context, never in the connection URL.

**Decentralized authentication**: see [Pitfalls](/learn/security/decentralized-auth#pitfalls)

- [ ] Back up the operator seed offline before building anything on it.
- [ ] Configure the server with the operator's public nkey, never a private seed.
- [ ] Sign users with a scoped signing key, not the account root seed.
- [ ] Set a deliberate JWT expiry and pair it with a re-issue plan.

**Operator mode**: see [Pitfalls](/learn/security/operator-mode#pitfalls)

- [ ] Run `nsc push` after every `nsc edit` so the server's resolver matches your store.
- [ ] Keep the system account configured; the nats-based resolver refuses to start without it.
- [ ] Give `.creds` files `0600` permissions; never bake, log, or commit them.

**Authorization**: see [Pitfalls](/learn/security/authorization#pitfalls)

- [ ] Allow `_INBOX.>` on the subscribe side for any user that makes requests.
- [ ] Prefer a wildcard matching the user's real subject space over an enumerated allow-list.
- [ ] Scope each user to its actual subject prefix — never grant `>`.

**Cross-account**: see [Pitfalls](/learn/security/cross-account#pitfalls)

- [ ] Confirm both halves line up: an export or import alone moves no messages and raises no error.
- [ ] Match the export type to the data flow: `stream` for one-way, `service` for request/reply.
- [ ] Subscribe to the remapped subject when an import adds a `prefix:` or `to:`.

**Encryption & TLS**: see [Pitfalls](/learn/security/encryption#pitfalls)

- [ ] Add `verify` (or `verify_and_map`): TLS alone encrypts but does not authenticate the client.
- [ ] Match the `verify_and_map` user string to the certificate DN exactly (read it with `openssl x509 -noout -subject`).
- [ ] Configure TLS on cluster, leafnode, and gateway blocks too, not just clients.
- [ ] Rotate certificates ahead of expiry and monitor their validity dates.

**Auth callout**: see [Pitfalls](/learn/security/auth-callout#pitfalls)

- [ ] Run more than one `auth-svc` instance and set `timeout` deliberately; the service is on the connection path.
- [ ] List only `auth-svc` in `auth_users`; every other user must go through the callout.
- [ ] Run `auth-svc` in its own account, and reach for `xkey` when the wire carries secrets.

## See also

- [Core Concepts → Security](/concepts/security) — the five-minute
  overview of everything this chapter expanded.
- [Clustering](/learn/clustering) — how authentication and TLS apply
  across many servers.
- [Reference](/reference/) — every field, type, and default in full.
