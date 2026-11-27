---
id: jetstream-data-recovery
title: JetStream data recovery
sidebar_position: 6
description: Recover JetStream servers at another site by moving each server's storage volume together with its config file, one volume per server
---

# JetStream data recovery

Snapshots and mirrors are copies you make before an outage. Sometimes the
outage leaves you something better: the data center can't run servers
anymore, but the disks survived. A storage volume can be detached and
attached elsewhere, a cloud disk snapshot can be copied to another region,
or a storage array can be replicated to a second site.

In that case you can recover a JetStream server completely, including every
stream and consumer it held, by moving its volume and its config file to a
new machine. This page explains what a JetStream volume holds, how to move
it, and the one rule that makes it safe: each volume belongs to exactly one
server.

The example is the `east` cluster: three servers, `n1-east`, `n2-east` and
`n3-east`, each with its own volume mounted at `/data/jetstream`. The `east`
data center can't be used anymore, but the three volumes can be moved to
`site2`.

## What a JetStream volume holds

Each server keeps all of its JetStream state under one directory, the
`store_dir` in its `jetstream` block:

```
jetstream {
  store_dir: "/data/jetstream"
}
```

Put that directory on a single mount point, one volume per server. Then the
volume holds everything the server knows about JetStream, and nothing about
any other server:

```
/data/jetstream/jetstream/
├── ORDERS/                      account directory, one per account
│   └── streams/
│       └── ORDERS/              this server's replica of the stream
│           ├── msgs/            message blocks
│           └── obs/             consumer state
└── $SYS/                        system account (its public key in operator mode)
    └── _js_/
        ├── _meta_/              this server's copy of the meta group
        └── S-R3F-.../           this server's copy of each stream's RAFT group
```

Three kinds of state live there:

- **Messages and consumer state.** The server's replica of every stream it
  holds, and the delivery position of every consumer on those streams.
- **Its view of the meta group.** The assignments for every stream and
  consumer in the cluster, and the list of meta group peers.
- **Its RAFT state.** For the meta group and for every replicated stream and
  consumer, the server's own log, its list of peers, and the term and vote it
  last cast.

The RAFT state ties the volume to one server. In every RAFT group, a server
takes part under a peer ID that's derived from its `server_name`. The other
peers count its log and its vote as one member of the group. The volume is
only valid as the state of that server, with that name.

## The rule: one volume, one server

Copy each volume once, to one new machine, and run it under the same
`server_name` it had before. Never copy the same volume to two servers.

It's tempting to recreate a three-server cluster from one surviving volume
by copying it three times. That doesn't work, and it can silently corrupt
data:

- Every copy carries the same RAFT log, vote, and peer identity. Give the
  copies different names and their peer IDs no longer match the ones the
  RAFT groups recorded. Give them the same name and the cluster sees one
  server, not three.
- Even if the copies joined, RAFT's guarantees rely on each member's log and
  vote being its own. Three copies of one member would count as a majority
  that never existed, which is exactly the situation where acknowledged
  writes are lost or two leaders disagree.
- The volume only holds the streams that server had a replica of. On a
  cluster larger than the replica count, streams without a replica on that
  server aren't on the volume at all.

If only one volume survives, run that one server and use
[Rescue Meta details](./rescue-meta-details.md) to remove the others from
the meta group. Its streams then recover from that single replica, and
replacement servers bring them back to their replica count.

The same rule applies to the original server. The server doesn't lock its
`store_dir`, so nothing stops the old server and the copy from running at the
same time. Make sure the original can never start again before you start
the copy.

## What to move with each volume

A volume on its own isn't enough. Move each server's config file with it,
and keep these settings the same:

- **`server_name`.** The peer identity in every RAFT group comes from it.
  Change it and the server joins as a stranger whose data no group
  recognises.
- **The cluster name and the JetStream `domain`.** The meta group and the
  stream placements are recorded under them.
- **`store_dir`.** Point it at where the moved volume is mounted. The path
  may change; the contents must not.
- **The encryption key, if you use encryption at rest.** Without the same
  key the server can't read its data. A key sealed in a TPM is bound to the
  original machine's TPM and doesn't move with the disk; keep a recoverable
  copy of the key for this case. See
  [Encryption](../security/encryption.md).
- **Accounts and credentials.** In operator mode, the server needs the same
  operator and account JWTs. If the resolver directory isn't on the same
  volume, move it too, or restore it as described on
  [Config and JWT backup](./config-and-jwt-backup.md).

Update the settings that describe the old location: the `routes` to the
other cluster members, `gateways` and leaf node remotes, listen addresses,
and TLS certificates for the new host names. The servers find each other by
route and identify each other by name, so new addresses are fine.

## Get a consistent copy

The server writes messages, indexes, and RAFT state as it runs. A copy taken
file by file while the server is running can catch those files at different
moments and doesn't recover cleanly.

Two kinds of copy are safe:

- **A copy of a stopped server.** Stop `nats-server` and wait for it to exit
  before you detach or copy the volume.
- **A crash-consistent snapshot of the whole volume.** A block-level snapshot
  of the single mount point captures every file at the same instant. To the
  server that looks like a power loss, and it recovers the same way: writes
  that weren't synced to disk yet are lost. By default the server syncs
  every 2 minutes, as covered on
  [Replication and R3](../clustering/replication-and-r3.md).

This is why the single mount point matters. If the store is spread over
several volumes, their snapshots aren't taken at the same instant.

## Recover the servers at the new site

The procedure for the `east` example:

1. **Fence the old servers.** Make sure `n1-east`, `n2-east` and `n3-east`
   can't start again in the old data center, including through automatic
   restarts.
2. **Move each volume and its config file.** Attach the `n1-east` volume to
   one new machine with the `n1-east` config, and the same for `n2-east` and
   `n3-east`. One volume per machine.
3. **Adjust the configs for the new site.** Change `routes`, listen
   addresses, and certificates. Keep `server_name`, the cluster name, the
   domain, and the encryption key.
4. **Start the servers.** Each one recovers its streams and RAFT state from
   its volume. Once a majority of the meta group is up, it elects a leader,
   and each stream elects a leader once a majority of its replicas is up.
5. **Verify.** Check that the meta group has a leader and lists exactly the
   servers you expect:

   ```bash
   nats --context sys server report jetstream
   ```

   Then check that each stream has a leader and its replicas are current:

   ```bash
   nats stream report
   ```

6. **Redirect clients.** Point publishers and consumers at the new site.

## When only some volumes survive

Recovery depends on how many of the meta group's servers you can bring back:

- **All of them.** The cluster comes back as it was, with no data lost beyond
  what wasn't synced to disk when the snapshot or shutdown happened.
- **A majority, for example two of three.** The meta group elects a leader
  without help. Remove the server that's gone with
  `nats server cluster peer-remove`, then add a replacement server with a new
  name and an empty `store_dir`. Streams recover from their surviving
  replicas and grow back to their replica count on the new server.
- **A minority, for example one of three.** The meta group can't elect a
  leader. Start the servers you have, then follow
  [Rescue Meta details](./rescue-meta-details.md) to rescue the meta group
  and remove the lost servers.

Moving a volume is the only way to recover an R1 stream without a snapshot,
because its only copy is on that one server.

## Caveats

**Copy each volume once.** One volume, one server, under its original name.
A volume copied to several servers breaks RAFT's guarantees.

**Never run the original and the copy together.** Fence the old servers
first. Nothing in the store prevents two servers from using the same state.

**Keep the identity, change the addresses.** `server_name`, cluster name,
domain, and encryption key stay the same; routes, listen addresses and
certificates change.

**Copy a stopped server or a whole-volume snapshot.** A file-by-file copy of
a running server isn't consistent.

**Unsynced writes are lost.** A snapshot of a running server loses what
wasn't synced to disk yet, the same as a power loss.

**A volume is not a backup.** A moved volume carries the server's current
state, including any mistake that was replicated to it. For an accidental
delete or corrupt data, use a [snapshot](./stream-backup-restore.md).

## See also

- [Disaster recovery](./disaster-recovery.md) — the runbook that picks the
  recovery for each kind of failure.
- [Rescue Meta details](./rescue-meta-details.md) — rescue the meta group
  when fewer than a majority of servers come back.
- [Stream backup and restore](./stream-backup-restore.md) — snapshots of a
  single stream, independent of any server.
- [Config and JWT backup](./config-and-jwt-backup.md) — back up the config
  files and identity this page moves with the volumes.
- [Reference → jetstream](/reference/config/jetstream) — `store_dir` and the
  other JetStream settings.
