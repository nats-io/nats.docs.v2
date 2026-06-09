# Backup & Recovery Deep Dive — Design Spec

**Date:** 2026-06-05
**Status:** Draft for implementation
**Audience for this spec:** the writer (Claude or human) of each page

> ## ⚠️ CONTINUITY OVERRIDE — authoritative, supersedes any naming below
>
> The primary cluster is the **same physical cluster** as the done Topologies
> chapter. Wherever this spec writes `n1`/`n2`/`n3`, the page MUST use
> **`n1-east`/`n2-east`/`n3-east`**, and `orders-cluster` → cluster name
> **`east`**. (The DR site keeps its own names — `site1`/`site2`, mirror
> `ORDERS_DR` — those are correct as written.) This override wins over any
> conflicting cluster names below.

---

## 1. Goal

Land the **Backup & Recovery** deep dive in the "Learn" section — the Operate-half
chapter that teaches how to protect the Acme ORDERS platform's **data** and
**identity**: stream snapshots (point-in-time backup and restore), cross-site
mirrors used for disaster recovery, a disaster-recovery runbook, and backing up
the operator/account JWTs, nkeys, and server config.

It sits downstream of the JetStream deep dive (which makes the data exist) and the
Security deep dive (which makes the identity exist). This chapter does not create
streams or accounts — it keeps the ones the reader already built alive across a
node loss, a fat-fingered delete, a corrupted message, or a lost laptop full of
keys.

### 1.1 The hard problem for this chapter: overlap with JetStream mirrors

There is no Backup & Recovery concept primer to overlap with, so the usual
"earn your place against concepts" tension does not apply. The real overlap is
sideways: the **mirror/source mechanism** is already taught in full at
`/learn/jetstream/mirrors-and-sources`. This chapter must NOT re-teach how a
mirror works. It teaches the **operational application** — when a mirror is part
of a DR plan, how to read its lag before failing over, and why a mirror is not a
substitute for a snapshot. Every "how does replication work" paragraph belongs in
the JetStream chapter and must be linked, not duplicated.

If a paragraph would be at home verbatim in `/learn/jetstream/mirrors-and-sources`,
it is in the wrong chapter. Add the recovery procedure, the RPO/RTO trade-off, or
the failover step the JetStream page skips.

### 1.2 Non-goals (the boundary — link, do not teach)

- **The mirror/source MECHANISM** (how messages replicate, `filter_subject` vs
  `subject_transforms`, start position, lag internals) → `/learn/jetstream/mirrors-and-sources`.
  Here we only apply a mirror to DR and read its lag before promoting it.
- **The auth/JWT model itself** (what an operator, account, user, or signing key
  *is*; how trust chains) → `/learn/security/operator-mode`. Here we only copy
  those files off-site and put them back.
- **Replication (R3) as a safety net.** R3 is high availability, not a backup —
  it cannot recover from an accidental delete or a logic error, because the bad
  write replicates too. The leader-election story → `/learn/clustering`.
- **Sizing disks and store directories for capacity** → `/learn/deployment`.
- Not version-conditional; unversioned, concepts only.

---

## 2. Decisions (resolved with the requester)

| Topic | Decision |
|---|---|
| Visuals | **Maximize animation.** Propose new NatsFlow scenarios for the snapshot flow, the mirror-promotion failover, and the recovery workflow (3 new). Reuse none — no existing scenario shows backup/restore or failover. |
| Depth angle | **Operational procedures + one runnable narrative.** Show the exact `nats stream backup`/`restore` commands and runbook steps on the pinned ORDERS world. Link the mirror mechanism and the JWT model out. |
| Running scenario | **The Acme ORDERS world after JetStream + Security + Topologies** — an `ORDERS` stream on a 3-node cluster, with the ACME operator and ORDERS/ANALYTICS accounts already in place. This chapter protects all of it. |
| Reader assumption | Has finished JetStream, Security, and ideally Topologies. Runs NATS for someone else now. |
| Versioning | Unversioned, concepts only. |

---

## 3. Files & sidebar plumbing

Pages live under `learn/backup-recovery/` (served at `/learn/backup-recovery`).
The sidebar (`sidebars-learn.ts`) already lists all 6 pages in order — **no
sidebar edit**, **no new or removed pages**:

```
learn/backup-recovery/
  index.md                    # sidebar_position 1 — chapter intro
  stream-backup-restore.md    # 2
  mirrors-and-sources.md      # 3
  disaster-recovery.md        # 4
  config-and-jwt-backup.md    # 5
  where-next.md               # 6
```

Stub frontmatter today is title-only. The writer replaces each stub with the full
frontmatter block (`id`, `title`, `sidebar_position`, `description`) per the
voice rules in §5. Numbered titles run 1–6 to match `sidebar_position`.

### 3.1 No cross-link edits required

The JetStream chapter already links *into* this chapter
(`/learn/jetstream/mirrors-and-sources` and `/learn/jetstream/where-next` both
point at `/learn/backup-recovery/...`). Do not add or move content in other
chapters; this chapter only consumes inbound links.

### 3.2 URL stability

`/learn/backup-recovery/<page>` URLs are part of the spec.

---

## 4. Master scenario (pinned — the Acme ORDERS world, fully built, now protected)

This is the SAME Acme order platform from the four DONE chapters, shown at the
point where it has data and identity worth protecting. The byte-identical
payload, used in every example and language:

```json
{
  "order_id": "ord_8w2k",
  "customer": "acme-co",
  "total_cents": 4200,
  "ts": "2026-05-22T10:14:22Z"
}
```

Pinned entities (same names, every page — reuse, never rename):

| Layer | Entities | Used on page |
|---|---|---|
| Subjects | `orders.created`, `orders.shipped`, `orders.cancelled`; regional `orders.us.created`, `orders.eu.created` | all |
| Core NATS | publisher `order-svc`; subscribers `warehouse`, `notifications`, `analytics`; `inventory` responder; `packers` queue group; three `shipping.quote` providers | recap only |
| JetStream | `ORDERS` stream capturing `orders.>`; `shipping` pull consumer; `analytics` consumer filtering `orders.shipped` | stream-backup-restore, disaster-recovery |
| Security | operator `ACME`; account `ORDERS` (user `order-svc`); account `ANALYTICS` (user `analytics-reader`); `ORDERS` exports `orders.shipped`, `ANALYTICS` imports it | config-and-jwt-backup |
| Topology | single server → 3-node cluster `n1`/`n2`/`n3` → supercluster (gateways) → leaf nodes | mirrors-and-sources, disaster-recovery |

How this chapter extends the world (additions, not renames):

- A **snapshot** of `ORDERS` stored off-site (a dated directory, e.g.
  `./backups/orders/2026-06-04`).
- A cross-site **mirror** of `ORDERS` named `ORDERS_DR`, living at a second site
  (`site2` / a leaf or gateway-connected cluster) for disaster recovery.
- Backed-up **identity**: the `ACME` operator JWT + nkey, the `ORDERS` and
  `ANALYTICS` account JWTs + nkeys, the `order-svc` and `analytics-reader` creds,
  and the server config — all carried off-site encrypted.

Rules: carry the session forward page to page. The reader keeps the cluster and
the `ORDERS` stream running, takes a snapshot, stands up `ORDERS_DR`, then walks
the runbook against those same objects. Never invent a different payload, stream
name, account, or service name. The DR mirror is always `ORDERS_DR`; the snapshot
dir is always under `./backups/orders/`.

---

## 5. Voice & wording rules

### 5.1 Voice (same hard rules as the four done chapters)

- Rust-book tone: welcoming, plain, second person. Active voice, present tense.
  No filler, no hedging.
- One teaching thought per paragraph. Two ideas joined by "and" → split.
- Define-then-use. Never use a term before the paragraph that defines it.
- ≤2 new concepts per content page. A third is deferred to a later page or
  linked out.
- Teach what matters; hand the exhaustive knob list to Reference with the
  greppable phrase in §5.3.
- Content page skeleton: numbered-title frontmatter → intro → concept H2s with
  embedded examples → **`## Pitfalls`** (2–4 concept-scoped gotchas, do/don't,
  one runnable handling example; placed BEFORE `## Where you are`) →
  `## Where you are` → `## What is next` → `## See also` (≤3 links).
- `index` skeleton: frontmatter (`id: index`, `sidebar_position: 1`) → intro →
  "By the end you will have" → "Who this is for" → "How to read it" → `## Map`
  table linking every page → `## Prerequisites`.
- `where-next` skeleton: recap "the whole game" → "Where the details live now"
  → `## Sibling deep dives` → `## Where you are` → `## Production checklist`
  (collects every page's Pitfalls action items, grouped per page, each group
  linking that page's `#pitfalls`) → `## See also`.
- Length 150–400 source lines per content page; `index`/`where-next` may run
  longer.

### 5.2 Wording lockfile (same word for same thing)

| Term | Use | Don't use |
|---|---|---|
| snapshot | "snapshot" — a point-in-time copy of a stream | "dump", "export", "image" |
| backup (verb/noun) | "backup" / "back up" for the off-site copy operation in general | "save", "archive" as a synonym for snapshot |
| restore | "restore" — rebuild a stream from a snapshot | "import", "reload", "recover" (recover is the outcome, not the command) |
| mirror | "mirror" — a read-only live copy of an upstream stream | "replica" (replica = R3 cluster copy; keep them distinct), "clone" |
| upstream stream | the source a mirror copies from | "master", "origin" |
| promote | turn a mirror into a writable primary during failover | "fail over to" (as a verb on the object), "activate" |
| lag | how far a mirror trails its upstream (`Lag` field) | "delay", "drift", "behind-ness" |
| failover | the act of switching traffic to the DR site | "switchover" (reserve for planned), "cutover" |
| consumer state | durable consumer config + delivery position captured by `--consumers` | "cursor backup", "offset" |
| RPO | recovery point objective — how much data you can afford to lose | spelling it out every time after first defining it |
| RTO | recovery time objective — how long recovery may take | as above |
| runbook | the ordered DR procedure | "playbook", "SOP" |
| operator / account / user | the security identities being backed up | "tenant", "principal", "role" |
| JWT | the signed identity token file | "token" loosely, "cert" |
| nkey | the private signing key | "private key" loosely, "secret" |
| creds / credentials | the user `.creds` file (JWT + nkey concatenated) | "login", "password file" |
| account resolver | the server component that serves account JWTs | "JWT store", "auth DB" |
| off-site | where a backup is stored away from the live cluster | "remote", "cloud" loosely |
| R3 / replication | cluster availability, explicitly NOT a backup | calling R3 a "backup" anywhere |

### 5.3 Reference handoff phrase (greppable)

> The full set of snapshot request options is documented in
> [Reference → Snapshot Stream](/reference/jetstream/api/stream/snapshot). We
> only need the behavior here.

Each page ends with a **`## See also`** block: 1–3 links, hard max 3, all from
the §5.4 allow-list.

### 5.4 Boundary lockfile (banned cross-chapter vocabulary — link instead)

Do NOT teach these in this chapter; name the gap and link out:

- **Mirror/source mechanism words used to *explain* replication** — `filter_subject`,
  `subject_transforms`, `opt_start_seq`, `opt_start_time`, fan-in, subject
  rename, cycle detection internals. Mention a mirror's *existence* and *lag*;
  for *how it replicates* link `/learn/jetstream/mirrors-and-sources`.
- **Auth-model teaching** — explaining what an operator signs, how an account
  trust chain validates, what a signing key delegates. Back the files up; for
  the model link `/learn/security/operator-mode`.
- **Cross-account export/import teaching** — for the model link
  `/learn/security/cross-account`; here only note that a cross-account mirror
  *uses* an export/import that must be backed up too.
- **R3 / leader election / placement internals** — link `/learn/clustering`.
- **Disk sizing / store-dir capacity planning** — link `/learn/deployment`.
- **Core NATS delivery semantics** (at-most-once, no responders) — those are
  `/learn/core-nats` vocabulary; do not re-derive them.

### 5.5 VALID internal link targets (allow-list — only these resolve)

**Reference (verified to exist):**
- `/reference/` (root)
- `/reference/jetstream/api/stream/snapshot`
- `/reference/jetstream/api/stream/restore`
- `/reference/jetstream/api/stream/create`
- `/reference/jetstream/advisory/snapshot-create`
- `/reference/jetstream/advisory/snapshot-complete`
- `/reference/jetstream/advisory/restore-create`
- `/reference/jetstream/advisory/restore-complete`
- `/reference/config/resolver`

**Concepts:**
- `/concepts/jetstream`, `/concepts/security`, `/concepts/topologies`

**Learn siblings (real slugs only):**
- This chapter: `/learn/backup-recovery/index`, `/stream-backup-restore`,
  `/mirrors-and-sources`, `/disaster-recovery`, `/config-and-jwt-backup`,
  `/where-next`
- JetStream: `/learn/jetstream`, `/learn/jetstream/mirrors-and-sources`,
  `/learn/jetstream/surviving-node-loss`, `/learn/jetstream/your-first-stream`,
  `/learn/jetstream/acknowledgment`
- Security: `/learn/security`, `/learn/security/operator-mode`,
  `/learn/security/cross-account`, `/learn/security/encryption`
- Topologies: `/learn/topologies`, `/learn/topologies/super-clusters`,
  `/learn/topologies/leaf-nodes`
- Other new siblings (landing pages only — they are not yet written, so link the
  chapter root, never a sub-slug): `/learn/clustering`, `/learn/monitoring`,
  `/learn/deployment`

Do NOT invent paths outside this list. Do NOT deep-link an unwritten sibling
chapter's sub-page (clustering/monitoring/deployment): link the chapter root.

---

## 6. Example pattern (matches `CLAUDE.md`)

Snapshot/restore and JWT backup are mostly **CLI and shell operations**, with a
genuine multi-language form only for the snapshot/restore *API*. So the mix is:

- **`nats-example` div** for the snapshot/restore *API* operations that have a
  real client-library form (backup a stream, restore a stream, read stream info
  before failover). Pattern:

  ```mdx
  <div class="nats-example"
       data-type="learn-backup-recovery-<slug>-<snippet>"
       data-languages="cli,js,go,python,java,rust,csharp"></div>
  ```

  with a matching committed CLI source at
  `static/examples/snippets/cli/learn/backup-recovery/<slug>/<snippet>.sh`
  (`#!/bin/bash`, real `nats` commands). The path dirs join with dashes to equal
  the `data-type` — they MUST match exactly. Verify before committing.

- **Plain fenced `bash` blocks (no div)** for: server config snippets, the
  cron/`tar`/`openssl`/`aws s3` backup scripts, `nsc list`/file-copy operations,
  the resolver-cache clear, and "run it in two terminals / on two sites" demos.
  These have no meaningful non-CLI client form.

- **Plain fenced `conf` blocks** for `nats-server.conf` fragments shown when
  explaining what to back up.

The pinned ORDERS payload, `ORDERS` / `ORDERS_DR` names, account names, and the
`./backups/orders/` path are identical across every page and language.

### 6.1 CLI snippet inventory (author + commit each `.sh`)

Paths must equal the `data-type` exactly.

| `data-type` | CLI file |
|---|---|
| `learn-backup-recovery-stream-backup-restore-backup` | `cli/learn/backup-recovery/stream-backup-restore/backup.sh` |
| `learn-backup-recovery-stream-backup-restore-restore` | `cli/learn/backup-recovery/stream-backup-restore/restore.sh` |
| `learn-backup-recovery-stream-backup-restore-verifyCounts` | `cli/learn/backup-recovery/stream-backup-restore/verify-counts.sh` |
| `learn-backup-recovery-disaster-recovery-restoreStream` | `cli/learn/backup-recovery/disaster-recovery/restore-stream.sh` |
| `learn-backup-recovery-disaster-recovery-checkLag` | `cli/learn/backup-recovery/disaster-recovery/check-lag.sh` |

(Mirror creation, promotion, JWT backup, and the cron/encrypt scripts are
CLI-only / shell-only and stay as plain `bash` blocks — no div, no `.sh` in the
example pipeline.)

### 6.2 NatsFlow — NEW scenarios to build (this run maximizes animation)

Embed with
`<div class="nats-flow" data-scenario="<name>" data-width="600" data-height="350"></div>`.
NEVER reference a `data-scenario` not in this list (it renders an error box).

| Page | New scenario `name` | What flows (nodes + animated edges) |
|---|---|---|
| `stream-backup-restore` | `streamSnapshotAnimated` | Nodes: `ORDERS` stream, backup client, an inbox `deliver_subject`, an off-site backup store. Animated edges: snapshot request → config/state response → S2-tar chunks streaming to the inbox with flow-control acks per chunk → `backup.json` + `stream.tar.s2` land in the store. Shows chunked pull with backpressure. |
| `mirrors-and-sources` | `mirrorDRAnimated` | Nodes: `site1` (`ORDERS`, primary), `site2` (`ORDERS_DR`, mirror), publisher `order-svc`. Animated edges: `order-svc` writes to `ORDERS`; messages replicate continuously to `ORDERS_DR` with a visible `Lag` counter trending toward 0. Pure replication-as-DR picture; no promotion yet (that is the runbook page). |
| `disaster-recovery` | `mirrorFailoverAnimated` | Nodes: `site1` (failing), `site2` `ORDERS_DR`, `order-svc`, consumers. Animated edges: `site1` goes dark → lag check on `ORDERS_DR` reaches 0 → mirror promoted to writable `ORDERS` → `order-svc` and consumers redirect to `site2`. Shows the promotion + redirect sequence. |

`config-and-jwt-backup`, `index`, and `where-next` carry **no** NatsFlow:
JWT/file backup is static identity plumbing (CLAUDE.md: no NatsFlow for
config/static architecture); index and where-next are navigation.

### 6.3 Reused existing scenarios

**None.** No existing scenario depicts snapshot streaming or mirror failover, so
this chapter introduces all three above and reuses zero.

---

## 7. Page-by-page outline

`stateIn`/`stateOut` track the running session. ≤2 new concepts per content page.

| # | Slug | Teaches (≤2 new concepts) | stateIn → stateOut | Defers / links | NatsFlow |
|---|---|---|---|---|---|
| 1 | `index` | Orientation only. Backup & recovery as a **triad**: snapshots (point-in-time data), mirrors (live cross-site copy), and identity (operator/account JWTs + nkeys + config). Why all three matter (data loss, site failure, lost keys) and why R3 is not on the list. Chapter map. | in: a built ORDERS world (stream + accounts + cluster). out: a mental model of the triad and the page roadmap. | Mechanism of mirrors → `/learn/jetstream/mirrors-and-sources`; auth model → `/learn/security/operator-mode`; R3 → `/learn/clustering`. | none |
| 2 | `stream-backup-restore` | (1) a **snapshot** = a point-in-time copy of a stream's messages + config (+ consumer state with `--consumers`), streamed as chunked S2-tar blobs plus a `backup.json`; (2) **restore** rebuilds the stream byte-identical, and the stream name may not change on restore. Take a snapshot of `ORDERS`, restore it, verify counts match. | in: live `ORDERS` stream. out: a dated off-site snapshot of `ORDERS` and a verified restore procedure. | Chunk/window tuning + the full request schema → `/reference/jetstream/api/stream/snapshot` and `/restore`; advisories → `/reference/jetstream/advisory/snapshot-create`. | `streamSnapshotAnimated` |
| 3 | `mirrors-and-sources` | (1) a **mirror** as a DR tool — a read-only live copy of `ORDERS` at a second site, kept current by replication, monitored by its **lag**; (2) the sharp line: a mirror gives you availability/RTO, a snapshot gives you a recovery point/RPO, and a mirror is NOT a backup (delete the upstream and the mirror follows). Stand up `ORDERS_DR` at `site2`. | in: snapshot procedure known; `ORDERS` live. out: `ORDERS_DR` mirror running at `site2`, lag understood. | HOW a mirror replicates (config, filters, start position) → `/learn/jetstream/mirrors-and-sources`; cross-account mirror export/import → `/learn/security/cross-account`. | `mirrorDRAnimated` |
| 4 | `disaster-recovery` | (1) the DR **runbook** — choosing between restore-from-snapshot and promote-the-mirror per failure class (site loss, accidental delete, logical corruption, consumer-state loss); (2) **promotion** — verify lag is 0, drop the mirror config, add subjects so the copy accepts writes, redirect publishers and consumers. Walk each scenario against `ORDERS`/`ORDERS_DR`. | in: snapshot + `ORDERS_DR` both available. out: a rehearsed, ordered recovery for each failure class. | Snapshot internals → page 2; mirror mechanism → JetStream; R3/leader election (a third option, deferred) → `/learn/clustering`. | `mirrorFailoverAnimated` |
| 5 | `config-and-jwt-backup` | (1) **identity backup** — the files that ARE the security layer: operator/account JWTs, nkeys, user creds, and the server config + resolver setup; where they live and how to copy them off-site encrypted; (2) **identity restore** — put them back, clear a stale account-resolver cache, restart, and verify connections. Back up the `ACME` operator + `ORDERS`/`ANALYTICS` accounts + `order-svc`/`analytics-reader` creds. | in: a restorable data plane (pages 2–4). out: the identity plane is recoverable too — the full platform survives a clean-room rebuild. | What an operator/account/user IS → `/learn/security/operator-mode`; cross-account exports → `/learn/security/cross-account`; resolver knobs → `/reference/config/resolver`. | none |
| 6 | `where-next` | Navigation + recap. The whole game: snapshot for the point you can return to, mirror for the site you can fail over to, identity backup for the keys that prove who you are; R3 is availability, not any of these. Then the **Production checklist** collecting every page's Pitfalls. | in: full triad understood. out: a map onward + a single pre-trust checklist. | — | none |

Per-page concept budget is respected: page 2 = snapshot + restore; page 3 =
mirror-as-DR + the not-a-backup distinction; page 4 = runbook + promotion; page 5
= identity backup + identity restore. No page exceeds two new concepts.

### 7.1 Per-page Pitfalls (concept-scoped; from the fact pack)

Each content page (2–5) carries a `## Pitfalls` section with 2–4 do/don't items
and one runnable handling example. These feed the where-next Production checklist
verbatim (grouped per page, each linking `#pitfalls`).

**stream-backup-restore:**
- Memory streams cannot be snapshotted (`ErrMemoryStreamNotSupported`) — use file
  storage. (runnable: backup attempt + the error.)
- Stream name cannot change on restore ("stream name may not be changed during
  restore") — restore to the original name, then mirror/source if you need a copy
  under a new name.
- Flow-control timeout on slow disk/high-latency link ("408 No Flow Response",
  5s default) — reduce `--chunk-size` (e.g. `64k`) and `--window-size` (e.g.
  `1m`).
- `--no-consumers` silently drops durable consumer config + delivery state — use
  `--consumers` for full recovery unless you recreate consumers by hand.

**mirrors-and-sources:**
- A mirror is not a backup: delete or corrupt the upstream and the mirror
  follows — pair a mirror with snapshots.
- A mirror's config is effectively locked after creation — plan the topology
  upfront; to change it, delete and recreate.
- Read the `Lag` field before trusting a mirror — replication is eventually
  consistent, not synchronous.
- Avoid Work Queue retention on a mirrored upstream — the replication consumer
  bypasses the single-consumer guarantee; use Limits or Interest.

**disaster-recovery:**
- Never promote a mirror before lag reaches 0 — you would publish on top of a
  stream that is still missing tail messages.
- R3 will not save you from an accidental delete or a logical error — the bad
  write replicates; that is what snapshots are for.
- Test restore on a schedule (quarterly) — an untested snapshot is a guess; a
  green `nats stream info` on the live stream proves nothing about the archive.
- Stop publishers before purging corrupted messages — purging under live writes
  races new bad data in.

**config-and-jwt-backup:**
- An nkey lost is identity lost — there is no recovery; back nkeys up encrypted
  and off-site, treat them like passwords.
- A stale account-resolver cache serves old permissions after a restore — clear
  the resolver cache and restart so the restored JWTs take effect.
- An operator-JWT rotation that was never backed up leaves your archive pointing
  at a dead operator — tag each backup with the operator version/timestamp.

---

## 8. Research domains / fact pack (verified — fold these in)

Source of truth, all verified against repo source and ADRs in the supplied fact
pack: `nats-server/server/jetstream_api.go`, `jsm.go/snapshots.go`,
`nats-server/server/jetstream_events.go`, ADR-1, ADR-59, and natscli source.

| Key | Facts to fold |
|---|---|
| `B_SNAPSHOT` | Snapshot = chunked S2-tar (`stream.tar.s2`) + `backup.json` (= `JSApiStreamRestoreRequest`: config + state). Request to `$JS.API.STREAM.SNAPSHOT.<STREAM>`; restore to `$JS.API.STREAM.RESTORE.<STREAM>`. Defaults: chunk 128KB (clamp 1KB–1MB), window 8MB (clamp 1KB–32MB), ack timeout 5s. `--consumers` includes consumer state; `--jsck` runs a health/CRC check. Memory streams unsupported. Restore name must match original. Staging in `.snap-staging`, cleaned on startup. Insufficient-disk error `JSErrCodeInsufficientResourcesErr` (10023). |
| `B_API` | Canonical = jsm.go: `Stream.SnapshotToDirectory`/`SnapshotToBuffer`, `Manager.RestoreSnapshotFromDirectory`/`FromBuffer`; opts `SnapshotConsumers()`, `SnapshotHealthCheck()`, `SnapshotNotify()`, `RestoreConfiguration()`. natscli: `nats stream backup <stream> <dir>` [`--consumers` `--jsck` `--chunk-size` `--window-size` `--no-progress`]; `nats stream restore <dir>` [`--config` `--replicas` `--placement`]. nats.rs error codes `STREAM_SNAPSHOT`/`STREAM_RESTORE`; nats.py/nats.c partial — note via cross-language parity, jsm.go canonical. |
| `B_ADVISORY` | Snapshot/restore advisories in `jetstream_events.go`: `JSSnapshotCreateAdvisory`, `JSSnapshotCompleteAdvisory`, `JSRestoreCreateAdvisory`, `JSRestoreCompleteAdvisory`; subjects under `$JS.EVENT.ADVISORY...`; subject type `io.nats.jetstream.advisory.v1.snapshot_*`. Use for backup monitoring/alerting (one mention; full list → Reference advisory pages). |
| `B_MIRROR_DR` | Mirror = 1:1 read-only copy; lag/active/error surfaced in `StreamInfo.mirror`. Mirror solves availability, not data loss (upstream delete propagates). Work Queue upstream problematic for mirroring. Cross-domain cycle detection only same-account. MECHANISM lives in ADR-59 / `/learn/jetstream/mirrors-and-sources` — link, don't re-teach. |
| `B_RUNBOOK` | Five recovery scenarios from the fact pack: (1) site failure → restore snapshot + restore identity, verify counts; (2) accidental delete → restore latest snapshot (do not recreate empty first); (3) gradual failover → verify lag 0, drop mirror, add subjects, redirect; (4) logical corruption → stop publishers, identify + purge bad sequences or restore known-good snapshot; (5) consumer-state loss → restore from a `--consumers` snapshot. |
| `B_IDENTITY` | NSC layout: operator `~/.nsc/nats/ACME/ACME.jwt` + nkey `~/.nsc/nkeys/ACME/ACME.nk`; accounts `.../ACME/ORDERS/ORDERS.jwt` + nkey; user creds `.../users/order-svc.creds` (JWT+nkey concatenated). Server config `/etc/nats/nats-server.conf` (operator path, resolver URL, TLS, store dir). Backup = tar `~/.nsc` + `/etc/nats` + resolver cache, encrypt, ship off-site. Restore = decrypt, extract, `nsc list operators`/`accounts`, clear resolver cache, restart, verify with `nats context list` / `nats stream list`. Pitfalls: nkey loss is terminal; stale resolver cache; un-backed-up operator rotation. |
| `B_RESOURCES` | The fact pack notes **no natsbyexample backup/restore examples exist** at time of writing. Do NOT invent example URLs. Verified source references (for the writer's confidence, not for linking): `nats-server/server/jetstream_test.go:3393–3466`, `natscli/tests/stream_command_test.go:458–533`, `jsm.go/snapshots.go:354–749`. Public links in pages come only from §5.5. |

---

## 9. Acceptance criteria

Chapter-wide:

- [ ] All 6 `/learn/backup-recovery/*` URLs return 200 and render.
- [ ] Exactly three NEW NatsFlow scenarios exist and are wired
      (`streamSnapshotAnimated`, `mirrorDRAnimated`, `mirrorFailoverAnimated`);
      no other `data-scenario` name appears; no existing scenario reused.
- [ ] `npm run typecheck` and `npm run build` pass; no broken internal links.
- [ ] Every internal link is in the §5.5 allow-list; no unwritten sibling
      sub-pages are deep-linked.
- [ ] Wording lockfile (§5.2) holds and the boundary lockfile (§5.4) holds —
      the mirror MECHANISM and the auth MODEL are linked, never re-taught; R3 is
      never called a backup.

Per page:

- [ ] ≤2 new concepts; one `## See also` block (≤3 links from §5.5).
- [ ] Stream/account/service names + payload + `ORDERS_DR` + `./backups/orders/`
      match §4 exactly.
- [ ] 150–400 source lines (`index`/`where-next` may run longer).
- [ ] Content pages 2–5 carry a `## Pitfalls` section (placed before
      `## Where you are`) drawn from §7.1.
- [ ] `where-next` carries a `## Production checklist` collecting every page's
      Pitfalls, grouped per page, each group linking that page's `#pitfalls`.
- [ ] Every `nats-example` div has a matching committed CLI `.sh` whose path
      equals the `data-type` (§6.1); CLI is the default tab where Tabs appear.
- [ ] No leaked tool-call tags (`</content>`, `</invoke>`, `</parameter>`) in any
      file.

---

## 10. Out of scope

- The mirror/source mechanism, the auth/JWT model, cross-account export/import
  internals, R3/leader election, and disk sizing — all linked, none taught here.
- Versioned Learn content; translation; search tuning.
- Cloud-vendor-specific backup tooling beyond an illustrative `aws s3`/`tar`/
  `openssl` script shown as a plain bash block.
- New example languages beyond the standard `cli,js,go,python,java,rust,csharp`
  set on the snapshot/restore API divs.
- Inventing natsbyexample URLs — none exist for backup/restore; do not fabricate.
