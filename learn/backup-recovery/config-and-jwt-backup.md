---
id: config-and-jwt-backup
title: Config and JWT backup
sidebar_position: 5
description: Back up and restore the operator, accounts, creds, nkeys, and server config off-site so the identity plane survives a clean-room rebuild
---

# Config and JWT backup

The last three pages protected the data with a snapshot to return to, a
mirror to fail over to, and a runbook to choose between them. But a restored
`ORDERS` stream is useless if nobody is allowed to read it. The accounts
that gate it, the operator that signs those accounts, and the creds
`order-svc` connects with don't live in the stream. They live in
a different set of files, and those files need their own backup.

This page protects the **identity plane**. It does two things: it copies
the files that *are* your security layer off-site, encrypted; then it
puts them back in a clean-room rebuild and verifies that the platform runs
again.

This page doesn't teach what an operator, account, or user *is*; that
model lives in
[Security → Operator mode](/learn/security/operator-mode). Here you only
learn which files carry that identity, how to get them off-site, and
how to restore them.

## The files that carry identity

Everything that proves who may touch the `ORDERS` platform reduces to
files on disk. There are three groups, and losing any one of them breaks
the platform in a different way.

The first group is the **nsc tree** under `~/.nsc`. This is where the
`nsc` tool keeps the trust chain it built in the Security chapter. Two
kinds of file matter here. A **JWT** is the signed identity token: one
for the operator, one for each account. An **nkey** is the private signing key
that produced that signature. The layout for the Acme world:

```text
~/.nsc/nats/ACME/ACME.jwt                  # operator JWT
~/.nsc/nats/ACME/ORDERS/ORDERS.jwt         # ORDERS account JWT
~/.nsc/nats/ACME/ANALYTICS/ANALYTICS.jwt   # ANALYTICS account JWT
~/.nsc/nkeys/ACME/ACME.nk                  # operator nkey (signs accounts)
~/.nsc/nkeys/ACME/ORDERS/ORDERS.nk         # ORDERS account nkey (signs users)
~/.nsc/nkeys/ACME/ANALYTICS/ANALYTICS.nk   # ANALYTICS account nkey
```

The JWTs are public; they only assert identity, they sign nothing. The
nkeys are secret. An nkey is the private key that produced a JWT's
signature, so a leaked nkey lets identity be forged, and a lost nkey means
identity is lost. Protect the `nkeys` subtree with the same controls you
apply to stored passwords.

The second group is the **creds files**. A `.creds` file is a user's JWT
and nkey concatenated into one file: the thing a client points at to
connect. Each service has one:

```text
~/.nsc/.../users/order-svc.creds          # ORDERS account user
~/.nsc/.../users/analytics-reader.creds   # ANALYTICS account user
```

The exact path under the tree depends on how `nsc` was configured, but
`nsc list users` will print it. These are the files `order-svc` and
`analytics-reader` present at connect time.

The third group is the **server config**, the `nats-server.conf` the
running cluster reads. It isn't identity itself, but it points at all of
it: where the operator JWT lives, where the account resolver is, the TLS
files, and the JetStream store directory. Restore the keys without the
config and the server doesn't know to trust them.

```conf
# /etc/nats/nats-server.conf — what ties the identity together
operator: /etc/nats/ACME.jwt

resolver: {
  type: full
  dir: /etc/nats/jwt          # the account resolver's local JWT cache
}

jetstream {
  store_dir: /var/lib/nats/jetstream
}
```

The `resolver` block is the **account resolver**, the server component
that serves account JWTs to itself when a user connects. Note its `dir`:
that directory is a cache of account JWTs, and it matters at restore time.
The full set of resolver options lives in
[Reference → Resolver](/reference/config/resolver). For now you only need
to know the cache exists.

## Backing up the files

The backup repeats one idea for all three groups: collect the files,
encrypt them, and send them away from the cluster. A backup that sits on the
same disk as the live keys is lost when that disk is lost; **off-site** means a copy
that survives the event that takes the primary down.

Collect the nsc tree, the server config, and the resolver cache into one
encrypted archive:

```bash
# Bundle the identity plane and encrypt it with a passphrase.
# ~/.nsc carries the operator + account JWTs, the nkeys, and the creds.
# /etc/nats carries the server config and the resolver's JWT cache.

tar czf - ~/.nsc /etc/nats \
  | openssl enc -aes-256-cbc -pbkdf2 -salt \
      -out acme-identity-2026-06-04.tar.gz.enc

# Ship the encrypted bundle off-site, away from the live cluster.
aws s3 cp acme-identity-2026-06-04.tar.gz.enc \
  s3://acme-dr/identity/acme-identity-2026-06-04.tar.gz.enc
```

The archive is dated, like the snapshot directory from [Stream backup and restore](/learn/backup-recovery/stream-backup-restore). The date
serves a purpose. If you rotate the operator key (re-sign the chain under
a new operator nkey), an older archive points at the *previous* operator,
and a server restored from it trusts a chain nobody signs anymore. Tag
each backup with the day the identity was current so you can match an
archive to the operator version it belongs to.

Run this on a schedule the same way you schedule the snapshot. A daily
cron line keeps the identity copy as fresh as the data copy:

```bash
# /etc/cron.d/acme-identity-backup — daily at 02:30
30 2 * * *  nats  /usr/local/bin/backup-identity.sh
```

The passphrase that `openssl` prompts for is itself a secret. Store it
somewhere other than the bucket holding the archive. Keeping an archive and
its key in the same place is a single point of failure that defeats the
backup.

## Restoring the files

A clean-room restore is the backup run in reverse, plus one step that
teams often miss. You decrypt and extract the bundle, then you must clear
the account resolver's cache before the restored identity takes effect.

Start by pulling the bundle back and unpacking it:

```bash
# Fetch and decrypt the off-site bundle.
aws s3 cp \
  s3://acme-dr/identity/acme-identity-2026-06-04.tar.gz.enc .

openssl enc -d -aes-256-cbc -pbkdf2 \
  -in acme-identity-2026-06-04.tar.gz.enc \
  | tar xzf - -C /

# Confirm nsc sees the restored chain.
nsc list operators
nsc list accounts --operator ACME
```

`nsc list operators` should print `ACME`, and `nsc list accounts` should
print `ORDERS` and `ANALYTICS`. If they do, the keys and JWTs are back
where the tools expect them.

Next comes the step that a naive restore skips. The account resolver keeps a
local cache of account JWTs in its `dir` (the `/etc/nats/jwt` from the
config above). If that cache still holds the *old* account JWTs from
before the failure (say, an `ORDERS` account with stale
permissions), the server keeps serving the old identity even though the
new JWTs are on disk. Clear the cache so the restored JWTs win:

```bash
# Remove the stale resolver cache, then restart the server so it
# reloads the restored account JWTs from the nsc tree.
rm -rf /etc/nats/jwt/*

nats-server -c /etc/nats/nats-server.conf
```

With the cache empty, the server repopulates it from the restored chain
on first connect. Finally, prove a real client can connect with a
restored cred — identity plane and data plane together:

```bash
# Use the restored order-svc cred to reach the restored stream.
nats stream info ORDERS \
  --creds ~/.nsc/.../users/order-svc.creds
```

If `order-svc` authenticates and `nats stream info ORDERS` returns the
stream, the full platform is back: the data the earlier pages protected,
and now the identity that gates it.

## Pitfalls

Three traps come up the first time teams back up identity rather than
data. Each one stays inside this page's two jobs: backing the files
up, and restoring them.

**An nkey lost is identity lost.** There's no recovery path for a lost
nkey: no reset link, no support ticket that regenerates it. The nkey is
the private key that signs the chain, and without it you can't sign a
new account or rotate a user. Don't treat the `~/.nsc/nkeys` subtree as
ordinary config you can rebuild; back it up encrypted and off-site, and
guard the passphrase like a password.

You can prove your archive actually contains the nkeys before you ever
need them. List the secret subtree inside the encrypted bundle without
extracting the whole thing:

```bash
# Verify the encrypted archive carries the nkeys, not just the JWTs.
openssl enc -d -aes-256-cbc -pbkdf2 \
  -in acme-identity-2026-06-04.tar.gz.enc \
  | tar tzf - | grep '\.nk$'

# Expected — three nkeys present:
#   .nsc/nkeys/ACME/ACME.nk
#   .nsc/nkeys/ACME/ORDERS/ORDERS.nk
#   .nsc/nkeys/ACME/ANALYTICS/ANALYTICS.nk
#
# Empty output means you backed up the public JWTs but not the secret
# keys — your archive cannot rebuild the chain. Re-run the backup over
# all of ~/.nsc, not just the JWT paths.
```

**A stale account-resolver cache serves old permissions after a
restore.** Restoring the nsc tree puts the new account JWTs on disk, but
the resolver keeps serving whatever's in its `dir` cache until you clear
it. The symptom is confusing: the files are correct, `nsc list accounts`
looks right, yet connections behave as if the old permissions are still
in force. Clear the cache (`rm -rf /etc/nats/jwt/*`) and restart before
you trust a restored identity.

**An un-backed-up operator rotation orphans the archive.** If you rotate
the `ACME` operator (re-sign the chain under a fresh operator nkey) and
your last off-site backup predates the rotation, that archive restores a
server trusting an operator nobody signs accounts under anymore. Tag
every backup with the operator version or timestamp, and take a fresh
backup right after any rotation, so an archive and the live
operator never drift apart.

## Where you are

The identity plane is now recoverable. You have an off-site, encrypted
archive of the `ACME` operator JWT and nkey, the `ORDERS` and
`ANALYTICS` account JWTs and nkeys, the `order-svc` and
`analytics-reader` creds, and the server config, dated to the operator
version it belongs to. And you have a restore procedure that extracts it,
clears the stale resolver cache, restarts, and verifies a real client
connects.

Combined with the snapshot from [Stream backup and restore](/learn/backup-recovery/stream-backup-restore)
and the `ORDERS_DR` mirror from [Mirrors as a DR tool](/learn/backup-recovery/mirrors-and-sources),
the whole platform now survives a clean-room rebuild. The data
comes back from a snapshot, the site comes back from the mirror, and the
identity that gates both comes back from this archive.

## What's next

Every protective copy is now in place: snapshot, mirror, runbook, and
identity. The last page recaps the whole chapter and collects every page's
pitfalls into one production checklist you run before you trust the
platform with production traffic.

Continue to [Where to go next](/learn/backup-recovery/where-next).

## See also

- [Security → Operator mode](/learn/security/operator-mode) — what the
  operator, accounts, and users you backed up here actually are.
- [Security → Cross-account](/learn/security/cross-account) — the
  `ORDERS`-to-`ANALYTICS` export/import that a cross-account mirror also
  depends on, and must be backed up with the accounts.
- [Reference → Resolver](/reference/config/resolver) — the full set of
  account-resolver options, including the cache `dir` cleared on restore.
