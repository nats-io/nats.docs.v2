---
id: security
title: Security
description: Authentication, authorization, and encryption in NATS
---

# Security

NATS security rests on three independent pillars: authentication, authorization,
and encryption. For each of these, NATS provides flexible options to fit a wide
range of use cases, from simple development environments to complex production
deployments.

## Accounts and Users

Each NATS user belongs to an account, which acts as a tenant boundary — meaning
that each account has its own isolated subject space.

<img src="/img/concepts/security-accounts-isolation.png" alt="NATS account boundary" class="security-image" />

Cross-account communication is possible but requires explicit configuration.

## Authentication

Authentication verifies the identity of clients connecting to the NATS server.
There are two main ways to configure authentication:

- **Config-based authentication**: Define accounts, users, and credentials
  directly in the server configuration file. This is the simplest option for
  development and smaller deployments. There are several supported credential
  types, including username/password, token authentication, NKeys, and TLS client
  certificates.
- **Decentralized authentication**: Each client provides a signed credential
  (JWT) that the server can verify using a public key. This means there is no
  central user list — accounts can issue their own credentials independently.
  This makes it well-suited to larger deployments.

For more advanced setups, NATS also supports auth callouts, which allow you to
delegate authentication to an application-defined NATS service which returns a
signed JWT. This is useful for integrating with external identity providers
(e.g., OIDC, LDAP) or implementing custom authentication logic.

## Authorization

Authorization controls what authenticated clients are allowed to do. NATS uses a
permissions model based on subjects. You can specify which subjects a user can
publish to, subscribe to, or both. Permissions support the same wildcards as
subjects themselves.

Permissions are defined per user — either on the user in the server
configuration, or embedded in the user's JWT. This allows for fine-grained
access control, enabling you to restrict clients to only the subjects they need
to interact with.

## Encryption

NATS uses TLS to encrypt data in transit between client and server (and between
servers in a cluster). You can configure TLS settings in the server
configuration file, including specifying certificates, keys, and trusted
certificate authorities.

## Try It Yourself

Save the following as `nats.conf`:

```conf
accounts {
    ORDERS {
        users [
            { 
              user: alice, password: "s3cret",
              permissions: { publish: "orders.>", subscribe: "_INBOX.>" }
            }
        ]
    }
}
```

Start a server with this config:

```bash
nats-server -c nats.conf
```

Now try publishing a message — you'll see permissions in action:

```bash
# works — alice can publish to orders.>
nats pub --user alice --password s3cret orders.created "hello"

# fails — alice has no publish permission for billing.*
nats pub --user alice --password s3cret billing.invoice "nope"
```

## Related Concepts

- [Subjects](./subjects) - the flexible addressing system that enables
  powerful filtering and routing capabilities.
  