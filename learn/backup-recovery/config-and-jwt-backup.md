---
id: config-and-jwt-backup
title: Config and JWT backup
sidebar_position: 5
description: Back up and restore the operator, accounts, keys, and server config off-site so the identity plane survives a clean-room rebuild
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

The first group is the **`nats auth` store**, the directory tree the
Security chapter built under `$XDG_DATA_HOME/nats` (by default
`~/.local/share/nats`). Two kinds of file live in it. A **JWT** is the
signed identity token: one for the operator, one per account, one per
user. A **seed** (an `.nk` file) is the private half of the nkey pair
whose public key the JWT names as its subject. Each JWT is signed by the
key one level up the chain: the operator signs the account JWTs, and each
account signs its own users' JWTs. The layout for the Acme world:

```text
$XDG_DATA_HOME/nats/nsc/            # store root; the on-disk layout is nsc-compatible
├── keys/
│   └── keys/
│       ├── O/BJ/OBJYFWT2….nk       # operator identity seed
│       ├── O/CY/OCYOEBDC….nk       # operator signing-key seed
│       ├── A/CX/ACXV2TF4….nk       # ORDERS account seed (+ ANALYTICS, SYSTEM)
│       └── U/A2/UA2YLJKK….nk       # order-svc user seed (+ analytics-reader, admin)
└── stores/
    └── ACME/
        ├── ACME.jwt                # operator JWT
        └── accounts/
            ├── ORDERS/ORDERS.jwt
            ├── ORDERS/users/order-svc.jwt
            ├── ANALYTICS/…         # ANALYTICS.jwt, analytics-reader.jwt
            └── SYSTEM/…            # SYSTEM.jwt, admin.jwt
```

The `stores` half holds only JWTs, which are public; they assert
identity, they sign nothing. The `keys` half is secret. A leaked
operator or account seed lets identity be forged, because those keys sign
the JWTs one level down; a leaked user seed lets an attacker connect as
that user; and a lost seed means that identity is lost. Protect the
`keys` subtree with the same controls you apply to stored passwords.

The second group is the **creds files**. A `.creds` file is a user's JWT
and seed concatenated into one file: the thing a client points at to
connect. They aren't inside the store — each one landed wherever
`--credential` wrote it when the user was created, and the copies your
services run with sit on the client machines. These are the files
`order-svc` and `analytics-reader` present at connect time.

The third group is the **server config**, the `server.conf` that
`nats server generate` wrote for the running cluster. It isn't identity
itself, but it anchors it: the operator JWT the server trusts, the
`SYSTEM` account preload, and the resolver directory where account JWTs
land. Restore the keys without the config and the server doesn't know to
trust them.

```conf
# ./acme-server/server.conf — what ties the identity together
operator: eyJ0eXAiOiJKV1Qi...              # the full ACME operator JWT

system_account: AAW27T5RB3M5GNDKLGEZ...    # the SYSTEM account public key

resolver_preload {
    # SYSTEM account JWT, baked into the config
    AAW27T5RB3M5GNDKLGEZ...: eyJ0eXAiOiJKV1Qi...
}

resolver {
   type: full
   dir: /var/lib/nats/resolver             # the server's own copy of account JWTs
}
```

The `resolver` block is the **account resolver**, the server component
that verifies accounts when a user connects. Its `dir` holds the
server's own copy of every pushed account JWT, and that copy matters at
restore time. The full set of resolver options lives in
[Reference → Resolver](/reference/config/resolver). For now you only need
to know that the server keeps its own copy.

## Backing up the files

The store has a native backup command. One line captures the whole
`ACME` subtree — every JWT and every private seed, operator, accounts,
and users — in a single file:

```bash
nats auth operator backup ACME acme-operator.backup
```

```
Wrote backup for ACME to acme-operator.backup

WARNING: The output file is unencrypted and contains secrets,
consider encrypting it with 'nats auth nkey seal'
```

The file is a single JSON document — treat it as an opaque blob and
don't edit it by hand. Read the warning literally: the file
holds the operator's private seed, every signing-key seed, and every
account and user seed. Whoever holds this one file *is* the `ACME`
operator. Never ship it anywhere unencrypted.

The `--key` flag encrypts the backup with a curve key. Generate the key
once, then point `--key` at the seed file — it takes a file path, not
the key string:

```bash
nats auth nkey gen curve --output backup-curve.nk

nats auth operator backup ACME acme-operator.backup --key backup-curve.nk
```

```
Wrote backup for ACME to acme-operator.backup
```

No warning this time: the output is a sealed blob that only the curve
seed can open. That makes `backup-curve.nk` the key to every future
restore. Store it somewhere other than the location holding the
backups; keeping an archive and its key in the same place is a single
point of failure that defeats the backup.

Two things the backup does *not* contain. It carries no creds files —
those are re-minted from the restored store, as you'll see below. And
it carries nothing from the server side: back up `server.conf`
alongside it, because the `SYSTEM` preload inside it is what lets you
repopulate a server after a disaster. The resolver directory itself
needs no backup; re-pushing the accounts rebuilds it.

Ship both files off-site, dated:

```bash
# Ship the sealed backup and the server config away from the live cluster.
aws s3 cp acme-operator.backup \
  s3://acme-dr/identity/acme-operator-2026-07-04.backup
aws s3 cp ./acme-server/server.conf \
  s3://acme-dr/identity/server-2026-07-04.conf
```

The date serves a purpose. If you rotate the operator key (re-sign the
chain under a new operator identity), an older backup restores the
*previous* operator, and a server rebuilt from it trusts a chain nobody
signs anymore. Tag each backup with the day the identity was current so
you can match a file to the operator version it belongs to.

Run this on a schedule the same way you schedule the snapshot. A daily
cron line keeps the identity copy as fresh as the data copy:

```bash
# /etc/cron.d/acme-identity-backup — daily at 02:30
30 2 * * *  nats  /usr/local/bin/backup-identity.sh
```

## Restoring the files

A clean-room restore is one command against the backup file, then a
verification pass, then one server-side step that teams often miss.

Pull the backup down and restore it. `--key` names the same curve seed
file the backup was sealed with:

```bash
aws s3 cp s3://acme-dr/identity/acme-operator-2026-07-04.backup acme-operator.backup

nats auth operator restore ACME acme-operator.backup --key backup-curve.nk
```

```
Operator ACME (OBJYFWT2JMTZJBNNXZWQU5UDZSQYUKK2GQ6OGTDSBDN35WW3PXWPSSP6)

Configuration:

            Name: ACME
         Subject: OBJYFWT2JMTZJBNNXZWQU5UDZSQYUKK2GQ6OGTDSBDN35WW3PXWPSSP6
        Accounts: 3
  System Account: SYSTEM (AAW27T5RB3M5GNDKLGEZR27S2HY5XHGL2PWVKOMBU7L4ZZYEPEGHOS7J)
    Signing Keys: OCYOEBDCJQKV3F6LWKCWVLGDOLMLZYO5LRLILZVRW376BDWBBZOO4RQX
```

The `Subject` is the same operator public key as before the loss:
restore brings back the original keys, it doesn't mint new ones. That
has a useful consequence — every creds file you handed out before the
disaster keeps working, because nothing rotated. One caveat: restore
refuses to run if the operator already exists in the store
(`nats: error: operator ACME already exist`). It's for rebuilding a
clean machine; to restore over a corrupted store, move the old store
directory aside first.

Confirm the chain is complete:

```bash
nats auth account ls
nats auth user ls ORDERS
```

`account ls` should list `ANALYTICS`, `ORDERS`, and `SYSTEM` with one
user each, and `user ls ORDERS` should show `order-svc`. If a service's
creds file was lost along with the machine it lived on, mint a fresh
one from the restored seeds:

```bash
nats auth user credential order-svc.creds order-svc ORDERS
```

```
Wrote credential for order-svc to order-svc.creds
```

Next comes the step that a naive restore skips. Restoring the store
rebuilds your workstation's copy of the chain, but the server validates
connections against its *own* copy: the account JWTs in its resolver
directory. If that directory survived, the server never notices your
restore. If it didn't — a fresh machine, a wiped disk — the server
starts from the saved `server.conf`, trusts `ACME`, and still rejects
every user:

```bash
nats pub orders.new "hello" --creds order-svc.creds
```

```
nats: error: nats: Authorization Violation
```

The resolver directory is empty, so the server can't find the `ORDERS`
account JWT. Fill it by pushing each account, exactly as on first
setup:

```bash
nats auth account push ORDERS --operator ACME --creds sys.creds
nats auth account push ANALYTICS --operator ACME --creds sys.creds
```

```
Updating account ORDERS (ACXV2TF4CTC575UWIFY75K4ZHLS337VNP2JKAD4E5IS346TATYFTDLYR) on 1 server(s)

✓ Update completed on acme-1

Success 1 Failed 0 Expected 1
```

The push itself authenticates with the `SYSTEM` creds, and it can get
in even though the resolver is empty because `server.conf` preloads the
`SYSTEM` account JWT. That preload is the bootstrap path for the whole
recovery — and the reason the config file belongs in the backup set.

Finally, prove a real client can connect — identity plane and data
plane together:

```bash
nats pub orders.new "back" --creds order-svc.creds
```

```
13:48:24 Published 4 bytes to "orders.new"
```

If `order-svc` authenticates with the same creds file it had before the
disaster, and `nats stream info ORDERS --creds order-svc.creds` returns
the restored stream, the full platform is back: the data the earlier
pages protected, and now the identity that gates it.

## Pitfalls

Three traps come up the first time teams back up identity rather than
data. Each one stays inside this page's two jobs: backing the files
up, and restoring them.

**The backup file is the whole authority.** `operator backup` writes
every private seed in the `ACME` subtree into one file; anyone who
reads it can sign accounts and users as you. Treat it more carefully
than any single key: always pass `--key` so it leaves your machine
sealed, and keep the curve seed file away from the backups it opens.
The flip side is that the curve seed is now load-bearing. Restore
without it fails —

```bash
nats auth operator restore ACME acme-operator.backup
```

```
nats: error: unmarshal failed: invalid character 'e' looking for beginning of value
```

— and there's no recovery path: no reset link, no support ticket that
regenerates a seed. Losing both the store and the means to open its
backup is losing the identity. Test-restore on a spare machine once so
you know the file and the key actually pair up.

**A restored store doesn't refill the server's resolver.** The store on
your workstation and the resolver directory on the server are separate
copies of the account JWTs. `operator restore` rebuilds only yours. A
server that lost its resolver directory keeps rejecting users with
`Authorization Violation` — the files on your side are correct,
`account ls` looks right, yet nobody can connect. The fix is one
`nats auth account push` per account, authenticated with the `SYSTEM`
creds that the config's `resolver_preload` lets in. That works only
while you still have `server.conf`; back it up with the identity, not
as an afterthought.

**An un-backed-up operator rotation orphans the archive.** If you
rotate the `ACME` operator (re-sign the chain under a fresh operator
key) and your last off-site backup predates the rotation, that backup
restores an operator nobody signs accounts under anymore. Tag every
backup with the operator version or timestamp, and take a fresh backup
right after any rotation, so a backup and the live operator never
drift apart.

## Where you are

The identity plane is now recoverable. You have a sealed, off-site
backup of the whole `ACME` subtree — the operator, `ORDERS`,
`ANALYTICS`, and `SYSTEM` with all their JWTs and private seeds — plus
the `server.conf` that anchors it, dated to the operator version it
belongs to, with the curve seed stored apart. And you have a restore
procedure that rebuilds the store, re-mints any lost creds, re-pushes
the accounts into an empty resolver, and verifies a real client
connects.

Combined with the snapshot from [Stream backup and restore](/learn/backup-recovery/stream-backup-restore)
and the `ORDERS_DR` mirror from [Mirrors as a DR tool](/learn/backup-recovery/mirrors-and-sources),
the whole platform now survives a clean-room rebuild. The data
comes back from a snapshot, the site comes back from the mirror, and the
identity that gates both comes back from this backup.

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
  depends on; it lives in the account JWTs, so the backup carries it.
- [Reference → Resolver](/reference/config/resolver) — the full set of
  account-resolver options, including the `dir` the push refills on
  restore.
