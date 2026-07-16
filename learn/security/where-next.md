---
id: where-next
title: "Where to go next"
sidebar_position: 10
description: The whole security model in one picture, and where to read further
---

# Where to go next

The previous page closed the last gap: TLS on the wire, a client
certificate as an identity, and the JetStream store encrypted on disk.
The `ORDERS` world is secured end to end. This page puts the whole model
back together in one picture, then points you at the chapters and
references that go past where this one stops.

## The whole model in one picture

Every page in this chapter added one piece, and each piece answers one
question:

- An **account** is the tenant boundary — whose traffic is this? Traffic in
  `ORDERS` never reaches `ANALYTICS`, because the two accounts have separate
  subject spaces.
- A **user** is an identity inside that account — who are you? `order-svc` and
  `analytics-reader` each prove an identity before the server admits them.
- **Permissions** decide which subjects a user may publish and subscribe to.
  `order-svc` may publish `orders.>` and nothing else; the allow-list closes
  the rest.
- **TLS** protects the wire those messages travel over. The bytes between
  client and server are encrypted, and with mTLS the client's certificate can
  be the identity.

The chapter also crossed that isolation once: a matched export and
import shares `orders.shipped` from `ORDERS` into `ANALYTICS` while
everything else stays separate.

If you can answer those four questions for a connection, you understand
its security posture. Everything else in this chapter is detail on how
you configure each answer.

## The two ways to answer "who are you?"

One choice is worth restating: authentication. The chapter built the
same two-account world twice on purpose, once per style.

**Centralized authentication** keeps the user list in the server's own
config. The server checks a credential against that list directly.
A change means editing the server's config and reloading it
(`nats-server --signal reload`) — no restart. It's the right tool for
one server and a handful of users.

**Decentralized authentication** moves the user list out of the server.
An operator signs accounts, accounts sign users, and the server trusts
only the operator. Adding a user touches no server config at all. It's
the right tool when you have many tenants, or when teams need to issue
their own credentials.

Both produce the same runtime model: an authenticated user, scoped to an
account, bound by permissions. They differ only in where the identity
lives and who signs it.

The chapter also taught a third answer:
[auth callout](/learn/security/auth-callout) hands the decision to a
service you run, so the check can live in whatever identity system you
already have. To revisit a single piece, the
[chapter map](/learn/security/) lists every page with what it covers.

## Reading the reference

This chapter showed one runnable happy path per concept. It deliberately
left out the exhaustive tables: the full lists of TLS cipher suites,
JWT claims, and export options.

When you need that depth, the generated [Reference](/reference/) is the
source. It documents the wire protocol and the configuration surface in
full. Use this chapter to understand how the pieces fit; use the
reference for the exact field, type, and default.

## What this chapter did not cover

This chapter taught security as it applies to a single server and a pair
of accounts. Four things sit past that boundary, and each has its own
chapter.

**Multiple servers.** A cluster, a leaf node, and a gateway are each a
connection type, and each carries its own TLS and authentication. The
[Clustering](/learn/clustering) chapter builds those topologies; the
per-link `tls {}` settings are in the
[TLS reference](/reference/config/tls).

**Leaf nodes specifically.** A leaf node connects an edge server (or a
laptop) into a hub, often across a trust boundary. It authenticates to the
hub with the same accounts and credentials this chapter already covered:
[Accounts and multitenancy](/learn/security/accounts-and-multitenancy)
binds a connection to an account, and
[Decentralized auth](/learn/security/decentralized-auth) mints the
credentials it presents. Where those credentials attach in the hub's
`leafnodes {}` block is shown in
[Leaf nodes](/learn/topologies/leaf-nodes).

**Hardening the deployment.** The wider posture of a production
deployment (file permissions on creds, system-account access, limits
that stop one tenant starving another) is collected in
[Deployment hardening](/learn/deployment/hardening).

**JetStream's stored data.** Encryption at rest — turning it on,
choosing the cipher, and rotating the key — has its own section on the
[Encryption & TLS](/learn/security/encryption#encryption-at-rest) page.
Whether a stream survives losing the server that holds it is
replication, not security; that's
[Surviving node loss](/learn/jetstream/surviving-node-loss). Security
decides who may access a stream; replication decides whether it's still
there to be accessed.

## Where you are

You can answer the four questions (account, user, permissions, TLS) for
any NATS connection. You've built the same two-account `ORDERS` world
twice: once in centralized config and once under the ACME operator. You
shared exactly one subject across the boundary, and you've seen a third
authentication style hand the decision to a service of your own.

If you're done with the scratch setup, tear it down: stop any
`nats-server` you started, delete the scratch configs, certificates, and
JetStream store directory, and remove the operator store — the directory
you pointed `XDG_DATA_HOME` at if you isolated it, or the `ACME`
operator inside the default store location shown on the
[Operator mode](/learn/security/operator-mode) page.

The chapters linked above take the model to multiple servers, more
tenants, and a production deployment.

## Production checklist

Every page in this chapter closed with a Pitfalls section. This gathers
the action items from all of them in one place. Each group links back to
the page that explains it.

### Authentication basics — see [Pitfalls](/learn/security/authentication-basics#pitfalls)

- [ ] Give every server a user list so an unauthenticated connect is rejected.
- [ ] Store bcrypt hashes, not plaintext passwords, in any deployed config.
- [ ] Keep credentials out of committed config: reference a secret store and `.gitignore` the real file.
- [ ] Put credentials in a named context, never in the connection URL.

### Authorization — see [Pitfalls](/learn/security/authorization#pitfalls)

- [ ] Allow `_INBOX.>` on the subscribe side for any user that makes requests.
- [ ] Prefer a wildcard matching the user's real subject space over an enumerated allow-list.
- [ ] Scope each user to its actual subject prefix — never grant `>`.
- [ ] Check the subscriber's deny lists when messages silently go missing: a wildcard subscription overlapping a deny is accepted and filtered at delivery with no error.

### Accounts and multitenancy — see [Pitfalls](/learn/security/accounts-and-multitenancy#pitfalls)

- [ ] Point `no_auth_user` at a deliberately narrow user, never a wide-open account.
- [ ] Declare a `SYS` account with a user and set `system_account: SYS` so server events stay reachable.
- [ ] Never rely on a shared subject name to bridge accounts; use an explicit export/import.

### Cross-account — see [Pitfalls](/learn/security/cross-account#pitfalls)

- [ ] Pair every export with its import: in config mode an unmatched import stops the server at boot, and an unmatched export silently moves nothing.
- [ ] Match the export type to the data flow: `stream` for one-way, `service` for request/reply.
- [ ] Subscribe to the remapped subject when an import adds a `prefix:` or `to:`.

### Operator mode — see [Pitfalls](/learn/security/operator-mode#pitfalls)

- [ ] Run `nats auth account push` after every account change — including user revocations and signing-key changes, which live in the account JWT — so the server's resolver matches your store.
- [ ] Keep the system account configured; the nats-based resolver refuses to start without it.
- [ ] Give `.creds` files `0600` permissions; never bake, log, or commit them.
- [ ] Consider monitoring issues if using credentials which have expiration times baked in

### Decentralized authentication — see [Pitfalls](/learn/security/decentralized-auth#pitfalls)

- [ ] Back up the operator offline before building anything on it: `nats auth operator backup ACME acme-operator.backup`.
- [ ] Configure the server with the operator JWT — public material only — never a private seed.
- [ ] Sign users with a scoped signing key, not the account root seed.
- [ ] Mint credentials with a deliberate expiry (`nats auth user credential order-svc.creds order-svc ORDERS --expire 720h`) and pair it with a re-issue plan.

### Auth callout — see [Pitfalls](/learn/security/auth-callout#pitfalls)

- [ ] Run more than one `auth-svc` instance and set `timeout` deliberately; the service is on the connection path.
- [ ] List only `auth-svc` in `auth_users`; every other user must go through the callout.
- [ ] Run `auth-svc` in its own account, and reach for `xkey` when the wire carries secrets.

### Encryption & TLS — see [Pitfalls](/learn/security/encryption#pitfalls)

- [ ] Add `verify` (or `verify_and_map`): TLS alone encrypts but doesn't authenticate the client.
- [ ] Match the `verify_and_map` user string to the certificate identity (read it with `openssl x509 -noout -subject`).
- [ ] Configure TLS on cluster, leafnode, and gateway blocks too, not just clients.
- [ ] Give each cluster node's certificate both `serverAuth` and `clientAuth` extended key usage; the same cert acts as server and client on routes.
- [ ] Migrate to TLS-first with a duration value (`handshake_first: "300ms"`) before setting it to `true`, so legacy clients keep connecting during the rollout.
- [ ] Rotate certificates ahead of expiry and send `nats-server --signal reload` afterwards; certificate files are read once at startup.
- [ ] Keep the JetStream encryption key out of the config file (`key: $JS_KEY`), and carry `prev_key` for one rotation restart only.

## See also

- [Reference](/reference/) — every field, type, and default in full.
- [Core Concepts → Security](/concepts/security) — the five-minute
  overview of everything this chapter expanded.
- [Clustering](/learn/clustering) — the deep dive where multiple
  servers, routes, and gateways are built.
