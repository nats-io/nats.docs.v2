# Key-Value Store Deep Dive — Design Spec

**Date:** 2026-06-05
**Status:** Draft for implementation
**Audience for this spec:** the writer (Claude or human) of each page

---

## 1. Goal

Land the **Key-Value Store** deep dive in the "Learn" section — the Develop-half
chapter that teaches the KV abstraction NATS layers on top of JetStream: buckets,
keys, put/get, watching, history and revisions, per-key TTL and bucket limits,
and the stream that backs it all.

It is a JetStream-derived chapter. It sits *after* the JetStream deep dive and
*before* the Object Store deep dive, and it has no concept primer of its own
(there is no `/concepts/key-value`). The closest primer is
[`/concepts/jetstream`](/concepts/jetstream); this chapter is the first place a
reader meets KV in depth.

### 1.1 The hard problem for this chapter: KV is "just a stream"

Every KV mechanism is a JetStream mechanism wearing a friendlier name. A bucket
is a stream. A key is a subject token. A revision is a sequence number. A watch
is a consumer. The deep dive must do two things at once:

- **Teach the abstraction on its own terms** so a reader who has not memorized
  JetStream internals can be productive: `Put`, `Get`, `Watch`, `Create`,
  `Update`, TTL.
- **Reveal the stream underneath** so the abstraction stops being magic — the
  `KV_INVENTORY` stream on `$KV.INVENTORY.>`, the CAS header, the rollup marker.

The split is deliberate and ordered: pages 2–5 teach the abstraction; page 6
(`under-the-hood`) lifts the lid. Earlier pages may *name* the stream backing in
one sentence and link to JetStream, but they do not teach stream/consumer
fundamentals — that is the boundary below.

If a paragraph would be at home verbatim in the JetStream deep dive, it is in the
wrong chapter. Link to `/learn/jetstream` and keep going.

### 1.2 Non-goals (the boundary — link, do not teach)

- **Stream and consumer fundamentals** — what a stream is, how a consumer tracks
  position, ack/redelivery, retention policies → **`/learn/jetstream`** (and
  `/concepts/jetstream`). KV *is* a stream; summarize and link, never re-teach.
- **Large blobs (multi-MB values, files, chunking)** → **`/learn/object-store`**.
  KV values are small; the size cap is real and is named, not worked around.
- **Per-message TTL as a stream feature** (the general mechanism) →
  **`/learn/jetstream/message-ttl`**. This chapter teaches KV's *per-key* TTL,
  which rides on it.
- **Replication, `R=3`, placement, leader election** → **`/learn/clustering`**.
  A bucket's `Replicas` field is named on page 6; the mechanics are not taught.
- **Sourcing and mirroring internals** → **`/learn/jetstream/mirrors-and-sources`**.
  `where-next` mentions KV-to-KV sourcing exists; it links out.
- Not version-conditional except where a feature needs a server floor (per-key
  TTL needs 2.11+); name the floor, do not branch.

---

## 2. Decisions (resolved with the requester)

| Topic | Decision |
|---|---|
| Visuals | **Maximize animation.** Propose NEW NatsFlow scenarios for the three pages that carry a genuine message/control flow (watch, CAS retry, TTL expiry); reuse `jetStreamContrastAnimated` on `under-the-hood` to make the bucket-is-a-stream point. No animation on pure-config / pure-API pages. |
| Depth angle | **Abstraction first, stream underneath last.** Pages 2–5 teach KV's own API; page 6 reveals `KV_<bucket>` / `$KV.<bucket>.>` and direct GET. |
| Running scenario | **The Acme INVENTORY bucket**, built on the JetStream the previous chapter established. Keys are SKUs; values are stock counts the inventory service reads and decrements. |
| Reader assumption | Has read the JetStream deep dive (or `/concepts/jetstream`). Comfortable with publish/subscribe and "a stream stores messages." New to KV. |
| Versioning | Unversioned, concepts only. Server floor named where required (per-key TTL: 2.11+). |
| Object store | Out of scope; linked from boundary and `where-next`. |

---

## 3. Files & sidebar plumbing

Pages live under `learn/key-value/` (served at `/learn/key-value`). The sidebar
(`sidebars-learn.ts`, lines 105–112) already lists all 7 pages in order — **no
sidebar edit, no new or removed pages**:

```
learn/key-value/
  index.md                  # 1 — chapter intro (sidebar_position: 1)
  your-first-bucket.md      # 2
  watching.md               # 3
  history-and-revisions.md  # 4
  ttl-and-limits.md         # 5
  under-the-hood.md         # 6
  where-next.md             # 7
```

Each stub currently holds only a title and a `{/* TODO */}` marker; the writer
replaces the whole file, including frontmatter, with the numbered-title form
below.

### 3.1 Numbered titles (lock these exactly)

| File | `id` | `title` | `sidebar_position` |
|---|---|---|---|
| `index.md` | `index` | `Key-Value Store` | `1` |
| `your-first-bucket.md` | `your-first-bucket` | `1. Your first bucket` | `2` |
| `watching.md` | `watching` | `2. Watching` | `3` |
| `history-and-revisions.md` | `history-and-revisions` | `3. History and revisions` | `4` |
| `ttl-and-limits.md` | `ttl-and-limits` | `4. TTL and limits` | `5` |
| `under-the-hood.md` | `under-the-hood` | `5. Under the hood` | `6` |
| `where-next.md` | `where-next` | `6. Where to go next` | `7` |

(`index` is unnumbered; content pages number 1–5; `where-next` is 6, mirroring
the JetStream chapter's convention.)

### 3.2 No concept cross-link to add

Unlike Core NATS, there is no `/concepts/key-value` page to back-link from. The
discovery path into this chapter is the JetStream `where-next` page, which
already links `/learn/key-value`. No primer edit is required.

### 3.3 URL stability

`/learn/key-value/<page>` URLs are part of the spec.

---

## 4. Master scenario (pinned — the Acme INVENTORY bucket)

This is the SAME Acme order platform from every other Learn chapter, now growing
a key-value layer **on top of the JetStream the previous chapter built**. The KV
chapter does not invent a new world; it adds one bucket to the existing one.

Canonical order payload (byte-identical everywhere it appears — used when the
text needs to refer to an order message, e.g. on `orders.created`):

```json
{
  "order_id": "ord_8w2k",
  "customer": "acme-co",
  "total_cents": 4200,
  "ts": "2026-05-22T10:14:22Z"
}
```

Pinned KV entities (same names, every page):

| Role | Name / value | Used on page |
|---|---|---|
| Bucket | `INVENTORY` (backing stream `KV_INVENTORY` on `$KV.INVENTORY.>`) | all |
| Keys | SKUs: `widget-blue`, `widget-red`, `gadget-pro` (`widget-blue` is the worked example) | all |
| Values | stock counts as bytes, e.g. `42`, `41`, `0` | all |
| Reader/writer | the **inventory service** — reads a SKU's count, decrements it on a sale | your-first-bucket, history-and-revisions |
| Watcher | the **warehouse dashboard** — watches `INVENTORY` for live stock changes | watching |
| Established neighbors (reuse, do not re-teach) | `ORDERS` stream on `orders.>`; the inventory responder on `orders.inventory.check` from Core NATS now answers by reading the bucket | index, where-next |

Established world entities the chapter may *name* but must not re-explain:

- **Core NATS:** publisher `order-svc`; subscribers `warehouse`,
  `notifications`, `analytics`; the inventory responder on
  `orders.inventory.check`.
- **JetStream:** the `ORDERS` stream capturing `orders.>`; the shipping pull
  consumer; the analytics consumer filtering `orders.shipped`.

Rules: a single local `nats-server -js` (JetStream on; KV requires it). Carry the
session forward — a reader who runs `nats kv add INVENTORY` on page 2 still has
that bucket on pages 3–6, and adds a watcher, then history, then TTL on top of
it. Never invent a second bucket in the body (a regional `EU_INVENTORY` is
mentioned only on `where-next`, as a sourcing teaser, and is not built).

### 4.1 The one-sentence backing-stream framing (reuse verbatim shape)

The whole chapter rests on this fact, stated plainly on `index` and `your-first-bucket`
and proven on `under-the-hood`:

> A bucket is a JetStream stream named `KV_<bucket>` whose subjects are
> `$KV.<bucket>.>`; a key is the last token of that subject, and a value is a
> message on it.

For `INVENTORY`: the stream is `KV_INVENTORY`, the subjects are
`$KV.INVENTORY.>`, and the key `widget-blue` is the message on
`$KV.INVENTORY.widget-blue`.

---

## 5. Voice & wording rules

### 5.1 Voice (same hard rules as the four done chapters)

- Rust-book tone: welcoming, plain, second person, active voice, present tense.
  No filler, no hedging.
- One teaching thought per paragraph. Two ideas joined by "and" → split.
- Define-then-use. Never use a term before the paragraph that defines it.
- ≤2 NEW concepts per content page. A third is deferred to a later page or
  linked out.
- Teach what matters; hand the exhaustive knob list to Reference with the
  greppable phrase in §5.3.
- Length 150–400 source lines per content page. `index` and `where-next` may run
  longer.

### 5.2 Content-page skeleton (every page 2–6)

```
frontmatter (id, title, sidebar_position, description)
# <numbered title>
intro (2–4 sentences: what this page adds to the session)
## <concept H2>   (≤2 concepts total on the page)
   ...embedded example(s)...
## Pitfalls       (2–4 concept-scoped gotchas; do/don't; ONE runnable
                   handling example; placed BEFORE "## Where you are")
## Where you are  (bulleted recap of session state: stateOut)
## What is next   (one sentence pointing to the next page)
## See also       (≤3 links from the §5.5 allow-list)
```

`index` skeleton: frontmatter (`id: index`, `sidebar_position: 1`) → intro → "By
the end you will have" → "Who this is for" → "How to read it" → "## Map" table
linking every page → "## Prerequisites".

`where-next` skeleton: recap "the whole game" → "Where the details live now" →
"## Sibling deep dives" → "## Where you are" → "## Production checklist" (collects
every page's Pitfalls action items, grouped per page with a link to that page's
`#pitfalls`) → "## See also".

### 5.3 Reference handoff phrase (greppable)

Each page hands the exhaustive list to Reference with a sentence of this shape:

> The full set of bucket configuration options is documented in
> [Reference → Create Stream](/reference/jetstream/api/stream/create).

(A bucket is created as a stream, so the stream-create reference is the
authoritative knob list. KV-specific config — `History`, per-key `TTL` — is
named in prose and pointed at the same reference, since the client maps it onto
stream fields.)

### 5.4 Wording lockfile (same word for same thing; NEVER the banned terms)

| Term | Use | Don't use |
|---|---|---|
| bucket | "bucket" | "store", "namespace", "table", "map" |
| key | "key" | "field", "name", "id" (for the key itself) |
| value | "value" | "payload" (in KV prose), "blob", "record" |
| put | "put" (the unconditional write) | "set", "write", "store a value" loosely |
| get | "get" | "read" as the verb name; "fetch" as the API |
| entry | a `KeyValueEntry` returned by get/watch/history | "record", "row", "object" |
| revision | the per-key version number (a sequence) | "version", "generation", "seq" in prose |
| create | conditional write that fails if the key exists | "put if absent", "insert" |
| update | conditional write guarded by an expected revision | "put with check", "conditional put" |
| compare-and-swap (CAS) | the create/update concurrency mechanism (define once, then "CAS") | "lock", "transaction", "atomic write" |
| optimistic concurrency | the no-locks model behind CAS (define once) | "pessimistic"/"locking" without contrast |
| watch / watcher | live updates; the thing that receives them | "subscribe"/"subscriber" (those are core-NATS roles), "listener" |
| history | the kept prior revisions of a key | "log", "audit log" (one framing mention OK), "changelog" |
| delete | non-destructive marker; key reads empty, history kept | "remove" (that is the marker reason, keep distinct) |
| purge | destructive; drops prior revisions, leaves one marker | "wipe", "clear", "truncate" |
| marker | the message left after delete/purge/expiry | "tombstone" (mention once as the common term, then "marker") |
| TTL | time-to-live; per-key or bucket-level | "expiry policy", "lifetime" loosely |
| backing stream | the `KV_<bucket>` stream under a bucket | "underlying topic", "internal stream" inconsistently |
| direct get | the read path via `$JS.API.DIRECT.GET.<stream>.<subject>` | "fast read", "cache read" |

**Capitalization:** API names in code voice keep their library casing in code
blocks (`Put`, `Get`, `Create`, `Update`, `Watch`). In prose use lowercase
("put the value", "watch the bucket") so the verb reads naturally; reserve
CamelCase for code spans.

### 5.5 Boundary lockfile (banned cross-chapter vocabulary — link instead)

These belong to other chapters. If the reader would want them, name the gap and
link out; do not teach them here.

- **JetStream internals taught as if new:** "stream", "consumer", "ack", "nak",
  "redelivery", "ack wait", "pull", "fetch", "durable", "retention policy",
  "work queue". You MAY *name* the backing stream and say "a watch is an
  ephemeral consumer underneath" with a link to `/learn/jetstream`; you may NOT
  explain what a consumer is or how acking works.
- **Object-store vocabulary:** "chunk", "object", "blob", "part". Large values →
  `/learn/object-store`.
- **Clustering vocabulary:** "RAFT", "leader election", "quorum", "peer",
  "placement". The `Replicas` field is named on page 6; the mechanics →
  `/learn/clustering`.
- **Security vocabulary:** "account", "operator", "JWT", "export/import" — KV
  access control is out of scope; if mentioned, link `/learn/security`.

### 5.6 "See also" cap

Each page ends with **"## See also"**: 1–3 links, hard max 3, all from §5.7.

### 5.7 VALID internal link targets (allow-list — only these resolve)

**Reference:**
- `/reference/` (root)
- `/reference/jetstream/api/stream/create`
- `/reference/jetstream/api/stream/msg-get`

**Concepts:**
- `/concepts/jetstream`
- `/concepts/subjects`

**Learn — this chapter (siblings):**
- `/learn/key-value`
- `/learn/key-value/your-first-bucket`
- `/learn/key-value/watching`
- `/learn/key-value/history-and-revisions`
- `/learn/key-value/ttl-and-limits`
- `/learn/key-value/under-the-hood`
- `/learn/key-value/where-next`
- Per-page Pitfalls anchors: append `#pitfalls` to any of the above (used by the
  `where-next` Production checklist).

**Learn — other chapters (link out, do not teach):**
- `/learn/jetstream`
- `/learn/jetstream/why-a-stream`
- `/learn/jetstream/delivery-semantics`
- `/learn/jetstream/message-ttl`
- `/learn/jetstream/mirrors-and-sources`
- `/learn/object-store`
- `/learn/object-store/your-first-object`
- `/learn/clustering`

Do NOT invent paths outside this list. There is no `/concepts/key-value`, no
`/reference/key-value`, no `/learn/key-value/sourcing`.

---

## 6. Example pattern (matches `CLAUDE.md`)

KV is highly client-library-shaped — put/get/create/update/watch all have a clean
multi-language form — so the `nats-example` div is the DEFAULT here.

- Use a `nats-example` div for every real put/get/create/update/watch/history
  snippet:

  ```mdx
  <div class="nats-example"
       data-type="learn-key-value-<slug>-<snippet>"
       data-languages="cli,js,go,python,java,rust,csharp"></div>
  ```

  and author the matching CLI source
  `static/examples/snippets/cli/learn/key-value/<slug>/<snippet>.sh`
  (`#!/bin/bash`, real `nats kv` commands). The path dirs join with dashes to
  form the `data-type`; verify they match exactly:
  `cli/learn/key-value/your-first-bucket/createBucket.sh` →
  `learn-key-value-your-first-bucket-createBucket`.

- `nats-server -js` startup, "run it in two terminals" watch demos, and
  CLI-only stream-internals inspection (`nats stream info KV_INVENTORY`) are
  plain fenced `bash`/`conf` blocks (no div).

- The `INVENTORY` bucket, SKU keys, and stock-count values are identical across
  every page and language.

### 6.1 CLI snippet inventory (committed `.sh` files to author)

One `.sh` per `nats-example` div. Slug → snippets:

| Slug | Snippet (`data-type` suffix) | What it shows |
|---|---|---|
| `your-first-bucket` | `createBucket` | `nats kv add INVENTORY --history 1` |
| `your-first-bucket` | `putValue` | `nats kv put INVENTORY widget-blue 42` |
| `your-first-bucket` | `getValue` | `nats kv get INVENTORY widget-blue --raw` |
| `your-first-bucket` | `bucketStatus` | `nats kv status INVENTORY` |
| `watching` | `watchBucket` | `nats kv watch INVENTORY` (whole bucket) |
| `watching` | `watchFiltered` | `nats kv watch INVENTORY 'widget-*'` |
| `history-and-revisions` | `keyHistory` | `nats kv history INVENTORY widget-blue` |
| `history-and-revisions` | `casUpdate` | `nats kv update INVENTORY widget-blue 41 <revision>` (CAS) |
| `history-and-revisions` | `casConflictRetry` | re-get on mismatch, then update with fresh revision (the Pitfalls handling example) |
| `ttl-and-limits` | `bucketWithLimits` | `nats kv add CACHE --ttl 1h --max-bucket-size ... --max-value-size ...` (named generically; see note) |
| `ttl-and-limits` | `perKeyTTL` | `nats kv create INVENTORY flash-sale 99 --ttl 30m` (create-only TTL) |
| `under-the-hood` | `streamInfoOfBucket` | `nats stream info KV_INVENTORY` (CLI-only; plain bash unless multi-lang lookup is shown) |
| `under-the-hood` | `deleteVsPurge` | `nats kv del INVENTORY widget-blue` vs `nats kv purge INVENTORY widget-blue` |

Notes:
- `bucketWithLimits` uses a throwaway `CACHE` name *in the snippet only* to avoid
  implying the pinned `INVENTORY` bucket has a bucket-wide TTL (it does not — its
  TTLs are per-key). Keep `INVENTORY` for everything else. Confirm the exact
  `nats kv add` limit flag names against `nats kv add --help` during authoring.
- `streamInfoOfBucket` is intentionally a raw `nats stream info` against the
  KV-managed stream to prove the backing; it may stay a plain bash block if no
  multi-language equivalent reads as natural.

### 6.2 NatsFlow scenarios

This run **maximizes animation**. Three NEW scenarios (one each for the three
genuine flows) plus one reuse. Pure-config pages (`ttl-and-limits` limits half,
`your-first-bucket` create/put) get NO animation per `CLAUDE.md`.

**NEW scenarios to build** (cap respected: 3 new):

| Page | `data-scenario` | Flow (nodes + animated edges) |
|---|---|---|
| `watching` | `kvWatchAnimated` | Nodes: warehouse-dashboard (watcher), `KV_INVENTORY` backing stream, an ephemeral ordered consumer. Edges animate: (1) watcher opens watch → consumer created with last-per-subject; (2) stream replays the current value of every key as the initial snapshot; (3) an end-of-initial-data marker flows back (the nil entry); (4) a fresh `put widget-blue 41` flows live to the watcher. Shows snapshot-then-live transition and the EOI signal. |
| `history-and-revisions` | `kvCasRetryAnimated` | Nodes: inventory service, server (`KV_INVENTORY`). Edges animate: (1) get `widget-blue` → revision 7; (2) update with expected-revision 7; (3) a concurrent writer bumps the key to revision 8; (4) the service's update is REJECTED (revision mismatch); (5) the service re-gets → revision 8 and retries → accepted. Shows optimistic concurrency, the rejected write, and the retry loop. |
| `ttl-and-limits` | `kvTtlExpiryAnimated` | Nodes: inventory service, `KV_INVENTORY`, warehouse-dashboard (watcher). Edges animate a timeline: (1) `create flash-sale 99 --ttl 30m`; (2) clock advances past the TTL; (3) server places a marker with reason `MaxAge`; (4) the watcher receives it as a purge/delete operation. Shows per-key expiry and how a watcher learns a value is gone. |

**Existing scenario reused:**

| Page | `data-scenario` | Why it fits |
|---|---|---|
| `under-the-hood` | `jetStreamContrastAnimated` | Already wired; reuse to make the "a bucket IS a stream" point — the same stream-storage animation the JetStream chapter uses, reframed as the layer under KV. Do not author a new one for this. |

Embed all with
`<div class="nats-flow" data-scenario="<name>Animated" data-width="600" data-height="350"></div>`.
NEVER reference a `data-scenario` not listed above (a new one must be built; an
unbuilt name renders an error box). `index` and `where-next` carry no animation.

---

## 7. Page-by-page outline

`stateIn`/`stateOut` track the running session (the `INVENTORY` bucket the reader
builds up). ≤2 NEW concepts each; a third is deferred or linked.

| # | Slug | NEW concepts (≤2) | stateIn | stateOut | Defers / links | NatsFlow |
|---|---|---|---|---|---|---|
| 1 | `index` | (framing only) KV is a friendly layer over a JetStream stream; the five things the chapter builds on the `INVENTORY` bucket. Chapter map + prerequisites. | A running `nats-server -js`; reader knows "a stream stores messages." | A mental model: bucket = stream, key = subject token, revision = sequence; and a map of the 5 pages. | Stream fundamentals → `/learn/jetstream`, `/concepts/jetstream`. | none |
| 2 | `your-first-bucket` | (1) a **bucket** is created as a configured stream, and **put/get** read and write a key's current value; (2) get returns an **entry** (value + revision + timestamp), not a bare value. Build `INVENTORY`, put `widget-blue 42`, get it back, read `nats kv status`. | Empty server with JetStream. | `INVENTORY` bucket exists; `widget-blue` = 42 at revision 1; reader can read status. | History depth (page 4); the stream underneath (page 6); full config → Reference. | none (config + API; no flow worth animating) |
| 3 | `watching` | (1) a **watch** delivers the current value of every matching key as an initial snapshot, then streams live changes; (2) the **end-of-initial-data signal** (a nil entry) marks the snapshot/live boundary and must be consumed. Run the warehouse-dashboard watching `INVENTORY`, then put a new count and see it arrive. Wildcard watch `widget-*`. | `INVENTORY` with `widget-blue` = 42. | A watcher running; reader has seen snapshot-then-live and the EOI marker; a second put delivered live. | "a watch is an ephemeral consumer underneath" → name + link `/learn/jetstream`; watch options (`IgnoreDeletes`, `UpdatesOnly`, `MetaOnly`) → Reference. | `kvWatchAnimated` (NEW) |
| 4 | `history-and-revisions` | (1) every put bumps the key's **revision**, and **history** keeps prior revisions up to the bucket's history depth; (2) **create** and **update** use **compare-and-swap (CAS)** for **optimistic concurrency** — update with an expected revision, retry on mismatch. Decrement `widget-blue` from 42 → 41 safely with `update` + revision; show a conflict + retry. | `INVENTORY` with a watcher and `widget-blue` = 42 (rev 1). | `widget-blue` decremented via CAS; reader can read history and reason about revisions; understands no-locks retry. | "revision is a sequence number underneath" → page 6; history depth limit (max 64) named, full config → Reference. | `kvCasRetryAnimated` (NEW) |
| 5 | `ttl-and-limits` | (1) **per-key TTL** set at **create** time expires a single value, and **bucket limits** (`MaxBytes`, max value size, history depth) bound the whole bucket; (2) when a value expires, the server leaves a **marker** so a watcher learns it is gone. Add a `flash-sale` key with a 30m TTL; name the bucket-size and value-size caps. Server floor: per-key TTL needs 2.11+. | `INVENTORY` with history and CAS in use. | A TTL'd key in the bucket; reader knows TTL is create-only and that limits bound size; watcher sees the expiry marker. | Bucket-wide TTL / the general per-message TTL mechanism → `/learn/jetstream/message-ttl`; large values → `/learn/object-store`. | `kvTtlExpiryAnimated` (NEW) |
| 6 | `under-the-hood` | (1) a bucket **is** a stream named `KV_<bucket>` on `$KV.<bucket>.>`, and **direct get** reads the last message for a subject with no consumer; (2) **delete vs purge** — delete leaves a non-destructive marker (history kept), purge drops prior revisions and leaves one rollup marker. Run `nats stream info KV_INVENTORY`; trace `widget-blue` → `$KV.INVENTORY.widget-blue`; show delete vs purge. | The full `INVENTORY` bucket from pages 2–5. | Reader can map every KV op to its stream mechanism and inspect the bucket as a stream. | Replicas/placement → `/learn/clustering`; full stream config → Reference; sourcing/mirroring → page 7 + `/learn/jetstream/mirrors-and-sources`. | reuse `jetStreamContrastAnimated` |
| 7 | `where-next` | Navigation + recap: bucket = stream, key = subject token, put = message, revision = sequence, watch = consumer. Production checklist collecting every page's Pitfalls. Sibling deep dives. May run long. | The complete `INVENTORY` bucket session. | A map of what's beyond KV and a single pre-production checklist. | KV-to-KV sourcing teaser (`EU_INVENTORY`) → `/learn/jetstream/mirrors-and-sources`; large blobs → `/learn/object-store`; replication → `/learn/clustering`. | none |

### 7.1 Pitfalls per page (the standing convention — 2–4 each, one runnable handling example)

Drawn from the verified fact pack; each is concept-scoped to its page.

- **`your-first-bucket`** — (a) get returns an entry, not a bare value; reading
  `.Value()` without checking the entry exists trips up on a missing key
  (key-not-found is not the same as empty). (b) Bucket and key names are
  validated: bucket names are alphanumeric/dash/underscore only; keys allow
  `-/_=.` and alphanumerics, no leading/trailing dots — an order id with a `:`
  or a leading dot is rejected. Handling example: the `getValue` div doubles as
  the "check existence before use" demo, or add a tiny "name rejected" snippet.
- **`watching`** — (a) the EOI nil entry must be consumed; ignoring it (or
  stopping the loop early) misses live updates — show the `if entry == nil:
  continue` handling. (b) a watch is live state, not a query: it is an ephemeral
  ordered consumer and goes away when the process ends — use history/get for a
  point read.
- **`history-and-revisions`** — (a) optimistic concurrency without a retry loop
  loses writes: an update on a stale revision is *rejected*, not queued; the
  runnable handling example is re-get + retry (`casConflictRetry`). (b) put is
  unconditional and will clobber a concurrent write — reach for update (CAS) for
  read-modify-write like a decrement, not put.
- **`ttl-and-limits`** — (a) per-key TTL is **create-only**; passing a TTL to
  put/update does not change it — to change a TTL, delete then create. (b)
  limits silently discard: a bucket at `MaxBytes` drops the oldest to make room
  (discard `new` policy), so size the bucket for the working set, not the
  average. Handling example: create-with-TTL, then show that re-TTLing requires
  delete+create.
- **`under-the-hood`** — (a) delete does **not** remove history; a deleted key
  still has its prior revisions via history — use purge to actually drop them.
  (b) the backing stream is managed: do not hand-edit `KV_INVENTORY` config or
  publish to `$KV.INVENTORY.>` directly with raw `nats pub` — use the KV API so
  rollup/marker headers stay correct. Handling example: `deleteVsPurge` div.

### 7.2 Production checklist (assemble on `where-next` from §7.1)

Group by page, each group headed `### <page title> — see [Pitfalls](/learn/key-value/<slug>#pitfalls)`,
with one checkbox per action item, in the JetStream `where-next` style. Cover:
existence-check on get; name validation; consume the EOI marker; watch is not a
point read; always retry CAS conflicts; use update (not put) for
read-modify-write; TTL is create-only (delete+create to change); size the bucket
for the working set; delete keeps history (purge to remove); never hand-edit or
raw-publish to the backing stream.

---

## 8. Research domains (Phase 1 — verified fact pack already folded in)

Source of truth: `nats-server` (KV stream config, `$JS.API.DIRECT.GET`, rollup
and marker headers), `natscli` (`nats kv` subcommands, verified in
`cli/cheats/kv.md`), client libs (`nats.go:jetstream/kv.go`,
`nats.py:nats-key-value`, `nats.java`), and the ADRs. The fact pack below is the
authoritative input; this section records the keys for any re-verification pass.

| Key | Focus | Anchors (verified) |
|---|---|---|
| `KV_MODEL` | Bucket = `KV_<bucket>` stream on `$KV.<bucket>.>`; discard `new`; `allow_direct=true`; `rollup_hdrs=true`; `deny_delete=true`; history = `max_msgs_per_subject` (default 1, max 64). | nats.go:jetstream/kv.go:611–702; ADR-8 §Buckets |
| `KV_OPS` | Create/Put/Get/Update/Delete/Purge/Watch/History/Status/Keys across nats.go/nats.py/nats.java; entry = value + revision (`Sequence`) + time. | nats.go:jetstream/kv.go:32–207, 1004–1176; nats.py:nats-key-value/__init__.py |
| `KV_WATCH` | Ephemeral ordered consumer, `last_per_subject`; EOI = nil entry when `delta == 0`; options `IncludeHistory`/`IgnoreDeletes`/`UpdatesOnly`/`MetaOnly`. | nats.go:jetstream/kv.go:1215–1340; ADR-8 §Watch |
| `KV_CAS` | `Nats-Expected-Last-Subject-Sequence` header; create = expected 0; update = expected prior revision; rejection on mismatch; no locks. | nats.go:jetstream/kv.go:1058–1121; ADR-8 §Storing Values |
| `KV_TTL` | Per-key TTL via create only (`Nats-TTL`), create-only by design; bucket `MaxAge`; limit markers (`Nats-Marker-Reason: MaxAge\|Purge\|Remove`), `LimitMarkerTTL`, server 2.11+. | nats.go:jetstream/kv.go:264–270, 658–668, 960–975; ADR-48, ADR-43 |
| `KV_DIRECT` | Direct get via `$JS.API.DIRECT.GET.<stream>.<subject>`; delete (`KV-Operation: DEL`) vs purge (`+ Nats-Rollup: sub`); key/bucket validation regexes. | nats.go:jetstream/kv.go:922–982; ADR-31; ADR-8 §Get/Deleting |
| `KV_ADVANCED` | (where-next only) sourcing/mirroring via subject transforms (auto `$KV.SRC.>` → `$KV.DST.>`), compression, metadata; Java parity gaps. | nats.go:jetstream/kv.go:250–260; ADR-57, ADR-54 |

Server floors: KV base 2.6.0+; per-key TTL / limit markers 2.11.0+;
sourcing/mirroring optimal 2.11+; compression 2.10+.

---

## 9. Acceptance criteria

Chapter-wide:

- [ ] All 7 `/learn/key-value/*` URLs return 200 and render.
- [ ] Every embedded `data-scenario` is either one of the three NEW scenarios
      (`kvWatchAnimated`, `kvCasRetryAnimated`, `kvTtlExpiryAnimated`) once they
      are built, or the reused `jetStreamContrastAnimated` — no fabricated names.
- [ ] `npm run typecheck` and `npm run build` pass; no broken internal links;
      every link resolves to §5.7.
- [ ] Wording lockfile (§5.4) holds — grep returns no banned terms; boundary
      lockfile (§5.5) holds — no JetStream/object-store/clustering internals are
      *taught* (naming + link is fine).
- [ ] The pinned `INVENTORY` bucket, SKU keys, and stock values are byte-stable
      across pages and languages; the order payload matches §4 where used.

Per page:

- [ ] ≤2 new concepts; one "See also" block (≤3 links from §5.7).
- [ ] Content pages carry "## Pitfalls" (2–4 items, one runnable handling
      example) placed BEFORE "## Where you are".
- [ ] `where-next` carries "## Production checklist" collecting every page's
      Pitfalls, grouped per page with a `#pitfalls` link.
- [ ] 150–400 source lines (`index`/`where-next` may run longer).
- [ ] Every `nats-example` div has a matching committed CLI `.sh`; `data-type`
      equals the path with dirs joined by dashes; CLI is the default tab where
      Tabs are used.
- [ ] No leaked tool-call tags (`</content>`, `</invoke>`, etc.) in any file.

---

## 10. Out of scope

- Stream/consumer fundamentals, object store, clustering/replication, security,
  the general per-message TTL mechanism — all linked, none taught here.
- KV-to-KV sourcing/mirroring as a built example — teased on `where-next` only,
  linked to `/learn/jetstream/mirrors-and-sources`.
- KV codecs (ADR-54 Orbit extension) — not in core clients; do not document.
- A `/concepts/key-value` primer — none exists; do not link or assume one.
- Versioned Learn content; translation; search tuning.
- Auto-generation — every page is hand-written prose; only embedded code comes
  from the `nats-example` pipeline.
