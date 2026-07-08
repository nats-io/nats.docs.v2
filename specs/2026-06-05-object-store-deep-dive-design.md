# Object Store Deep Dive — Design Spec

**Date:** 2026-06-05
**Status:** Draft for implementation
**Audience for this spec:** the writer (Claude or human) of each page

---

## 1. Goal

Land the **Object Store** deep dive in the "Learn" section — the chapter that
teaches NATS as a place to store *blobs*: invoices, shipping labels, packing
slips, any file too large or too binary for a plain message. It teaches the
object abstraction (put a file, get a file, list and watch them) and the chunked
JetStream stream that backs it.

It sits beside the Key-Value deep dive in the storage family and directly above
the JetStream deep dive it is built on. There is **no Object Store concept
primer** under `/concepts/` to overlap with, so this chapter is the reader's
first and only structured tour of the feature. That removes the
overlap-with-concepts tension that the Core NATS chapter had — there is nothing
to go "deeper than." The bar here is instead: be runnable, build one Acme
session, and never re-teach JetStream.

### 1.1 The hard problem for this chapter: don't re-teach JetStream

Object Store is *entirely* a JetStream construct. The temptation is to explain
streams, subjects, retention, and direct-get from scratch. Resist it. The reader
arrives having done the JetStream deep dive (or is sent there). Every time a
stream mechanism surfaces, name it in one sentence and link to
`/learn/jetstream`. The new material is the **object layer**: chunking, the
SHA-256 digest, metadata, links, watch/list, and the `OBJ_<bucket>` /
`$O.<bucket>.{C,M}.>` mapping.

If a paragraph would be at home verbatim in the JetStream chapter, it is in the
wrong chapter. Summarize the stream fact, link out, and get back to objects.

### 1.2 Non-goals (the boundary — link, do not teach)

- **Stream fundamentals** — what a stream is, consumers, acks, retention, direct
  get, replication → `/learn/jetstream`. Summarize in one line, link out.
- **Small structured values, multi-revision history, watch-a-key** →
  `/learn/key-value`. Object Store is rollup-latest + chunks; KV is the
  multi-revision store. State the contrast once (index), then defer.
- **Replication / surviving node loss for the backing stream** →
  `/learn/jetstream/surviving-node-loss`. Mention `replicas` as a knob, link.
- **Securing a bucket / cross-account export of `$O.INVOICES.>`** →
  `/learn/security`. Name it on `under-the-hood`, link out.
- **Archiving, tiering, multi-revision versioning of objects** — out of scope
  entirely; versioning belongs to KV, tiering is a future feature.
- Not version-conditional; unversioned, concepts only.

---

## 2. Decisions (resolved with the requester)

| Topic | Decision |
|---|---|
| Visuals | **Maximize animation.** Author THREE new NatsFlow scenarios (put/get-with-chunks, watch-and-sync, rollup-under-the-hood). Reuse one existing scenario (`jetStreamContrastAnimated`) on the index for the "it's a stream" framing. |
| Depth angle | **One runnable Acme session.** Build the `INVOICES` bucket once and carry it forward: create → put/get an invoice → chunk a large invoice → add metadata + a label link → watch/list the bucket → reveal the stream underneath. |
| Running scenario | **The Acme order platform, extended.** `INVOICES` bucket stores invoice/label/packing-slip blobs for orders; `order-svc` puts, `warehouse` gets, `analytics` watches. |
| Reader assumption | Has done the JetStream deep dive (or will be sent there from the index). Comfortable with streams, subjects, consumers. New to objects. |
| Versioning | Unversioned, concepts only. |

---

## 3. Files & sidebar plumbing

Pages live under `learn/object-store/` (served at `/learn/object-store`). The
sidebar (`sidebars-learn.ts`) already lists all 7 pages in order — **no sidebar
edit, no new or removed pages**:

```
learn/object-store/
  index.md                  # sidebar_position 1 — chapter intro
  your-first-object.md      # 2 — put/get
  chunking.md               # 3
  metadata-and-links.md     # 4
  watching-and-listing.md   # 5
  under-the-hood.md         # 6
  where-next.md             # 7
```

Current files are structure-only stubs (`title` frontmatter + an H1 + a TODO
comment). The writer replaces each stub wholesale with the full page, applying
the numbered-title frontmatter convention below.

### 3.1 Frontmatter convention (matches the JetStream chapter)

Content pages use a **numbered title**:

```yaml
---
id: your-first-object
title: 1. Your first object
sidebar_position: 2
description: Put a file into the INVOICES bucket and get it back
---
```

Numbering: the index is unnumbered; content pages number 1..5 in the title
(`your-first-object` = 1 … `under-the-hood` = 5); `where-next` = "6. Where to go
next". `sidebar_position` matches the sidebar order (index=1 … where-next=7).

### 3.2 No cross-link to add

There is no `/concepts/object-store` primer, so unlike Core NATS there is no
concept page to add a `:::tip` to. The JetStream `where-next` already links to
`/learn/object-store` (verified at `learn/jetstream/where-next.md:64`). No
sidebar or sibling-page edits are required by this chapter.

### 3.3 URL stability

`/learn/object-store/<page>` URLs are part of the spec.

---

## 4. Master scenario (pinned — the Acme order platform, extended)

This is the SAME Acme order platform from the Core NATS / JetStream / Security /
Topologies chapters. Object Store adds an operational blob store next to the
existing `ORDERS` stream. Same payload shape, byte-identical everywhere it
appears:

```json
{
  "order_id": "ord_8w2k",
  "customer": "acme-co",
  "total_cents": 4200,
  "ts": "2026-05-22T10:14:22Z"
}
```

The payload is the *order message*. Objects in this chapter are the **documents
attached to an order** — they are not the JSON above; they are the files an order
generates. Pinned entities (same names, every page):

| Role | Name(s) | Used on page |
|---|---|---|
| Bucket | `INVOICES` (description: "Invoice PDFs") | all |
| Invoice object | `invoice-ord_8w2k.pdf` | all |
| Label object | `label-ord_8w2k.png` | metadata-and-links, watching-and-listing |
| Packing-slip object | `packing-slip-ord_8w2k.txt` | watching-and-listing |
| Large invoice object | `invoice-ord_9x3m.pdf` (a 3 MB multi-chunk PDF) | chunking |
| Writer service | `order-svc` (puts invoices after payment confirmed) | all |
| Reader service | `warehouse` (gets the invoice before shipping) | your-first-object, metadata-and-links |
| Watcher service | `analytics` (watches the bucket for new objects) | watching-and-listing |
| Backing stream | `OBJ_INVOICES` on `$O.INVOICES.C.>` (chunks) + `$O.INVOICES.M.>` (metadata) | under-the-hood |

Reused, unchanged from earlier chapters (mention by name, do not re-introduce):
`order-svc`, `warehouse`, `analytics`, the `ORDERS` stream capturing `orders.>`.

Rules: the deployment is a single local `nats-server -js` (clustering and
replicas are a knob to link, not a topology to build). Carry the session
forward: the reader creates `INVOICES` on `your-first-object` and keeps it
across the chapter, adding objects, metadata, links, and watchers page by page.
Never invent a different payload, bucket, or service name.

---

## 5. Voice & wording rules

### 5.1 Voice (same hard rules as the four done chapters)

- Rust-book tone: welcoming, plain, second person. Active voice, present tense.
  No filler, no hedging.
- One teaching thought per paragraph. Two ideas joined by "and" → split.
- Define-then-use. Never use a term before the paragraph that defines it.
- ≤2 NEW concepts per content page. A third is deferred to a later page or
  linked out.
- Teach what matters; link `/reference` for the exhaustive knob list with the
  greppable handoff phrase (§5.3).
- Content page skeleton: numbered-title frontmatter → intro → concept H2s with
  embedded examples → `## Pitfalls` (2–4 concept-scoped gotchas, do/don't, one
  runnable handling example; placed BEFORE `## Where you are`) → `## Where you
  are` → `## What is next` → `## See also` (≤3 links).
- `index` skeleton: frontmatter (`id: index`, `sidebar_position: 1`) → intro →
  "By the end you will have" → "Who this is for" → "How to read it" → `## Map`
  table linking every page → `## Prerequisites`.
- `where-next` skeleton: recap "the whole game" → "Where the details live now" →
  `## Sibling deep dives` → `## Where you are` → `## Production checklist`
  (collects every page's Pitfalls action items, grouped per page with a link to
  that page's `#pitfalls`) → `## See also`.
- Length 150–400 source lines per content page; `index`/`where-next` may run
  longer.

### 5.2 Wording lockfile (same word for same thing; NEVER the banned terms)

| Term | Use | Don't use |
|---|---|---|
| object | the stored blob/file | "file" loosely (OK when literally a file on disk), "blob" in prose after intro, "artifact", "record" |
| bucket | the named object store (`INVOICES`) | "store" alone, "container", "namespace" |
| put / get | the store/fetch verbs | "upload"/"download", "save"/"load", "write"/"read" for object ops |
| chunk | one message holding a slice of an object | "block", "fragment", "part", "segment" |
| chunk size | the split boundary (default 128 KB) | "block size", "buffer size" |
| metadata | the per-object `ObjectInfo` fields (description, headers, metadata map) | "attributes", "properties", "tags" |
| description | the human label field on an object | "comment", "note" |
| digest | the SHA-256 integrity hash | "checksum", "hash" loosely (define digest once, then use) |
| link | a reference to another object or bucket | "alias" in prose (OK once as a synonym at intro), "pointer", "symlink" |
| bucket link | a link whose target is a whole bucket | "directory link", "store link" |
| watch | the streaming-updates operation | "subscribe to the bucket", "tail" |
| list | the snapshot-of-objects operation | "ls", "enumerate" loosely |
| rollup | the mechanism keeping only the latest metadata per object | "compaction", "dedup", "squash" |
| soft delete | a delete that marks `Deleted=true` and purges chunks | "tombstone", "mark for deletion" |
| backing stream | the `OBJ_<bucket>` stream | "underlying log", "shadow stream" |

**Boundary lockfile (critical):** stream vocabulary is allowed here because the
object store *is* a stream — but use it only to point AT the JetStream chapter,
never to re-teach it. Specifically:

- Do NOT define or explain from scratch: **consumer**, **ack**, **retention
  policy**, **direct get**, **sequence number**, **replica/RAFT**, **WorkQueue**.
  When one appears, give a one-line summary and link `/learn/jetstream` (or the
  specific sibling slug).
- Do NOT use KV vocabulary as if it applied here: no **revision**, **history**,
  **key** for objects. Object Store is rollup-latest, not multi-revision. When
  the reader would want versioning, name the gap and link `/learn/key-value`.
- Do NOT introduce security vocabulary (**account**, **export**, **import**,
  **permission**) except the single linked mention on `under-the-hood`.

### 5.3 Reference handoff phrase (greppable)

> The full set of object store configuration options is documented in
> [Reference](/reference/). We only need the behavior here.

Use this exact shape (verb-noun "the full set of X is documented in
[Reference](/reference/)") whenever a knob list is being deferred. Each page ends
with a `## See also` section: 1–3 links, hard max 3.

### 5.4 VALID internal link targets (allow-list)

Only these paths resolve. Do NOT invent any path outside this list.

- **Reference:** `/reference/` (root only — there is no `/reference/object-store`
  section yet, mirroring the Security chapter's situation).
- **Concepts:** `/concepts/jetstream`, `/concepts/subjects`, `/concepts/security`
  (all verified to exist under `docs/concepts/`).
- **Learn — JetStream:** `/learn/jetstream`, `/learn/jetstream/why-a-stream`,
  `/learn/jetstream/your-first-stream`, `/learn/jetstream/shaping-the-stream`,
  `/learn/jetstream/surviving-node-loss`.
- **Learn — Key-Value:** `/learn/key-value`, `/learn/key-value/under-the-hood`,
  `/learn/key-value/watching` (verified slugs in `learn/key-value/`).
- **Learn — siblings (chapter roots only):** `/learn/security`,
  `/learn/backup-recovery`, `/learn/monitoring`, `/learn/clustering`.
- **Learn — Object Store self:** `/learn/object-store` and
  `/learn/object-store/<slug>` for the real slugs only: `your-first-object`,
  `chunking`, `metadata-and-links`, `watching-and-listing`, `under-the-hood`,
  `where-next` (plus `#pitfalls` anchors of each).

---

## 6. Example pattern (matches `CLAUDE.md`)

Object Store is library-heavy: put/get/list/watch all have genuine
multi-language forms, so the `nats-example` div is the DEFAULT.

- Use a `nats-example` div for every real put/get/list/watch/link snippet:

  ```mdx
  <div class="nats-example"
       data-type="learn-object-store-<slug>-<snippet>"
       data-languages="cli,js,go,python,java,rust,csharp"></div>
  ```

  and author the matching CLI source
  `static/examples/snippets/cli/learn/object-store/<slug>/<snippet>.sh`
  (`#!/bin/bash`, real `nats object …` commands). The path dirs join with dashes
  to form the `data-type`; they MUST match exactly. Example:
  `cli/learn/object-store/your-first-object/put.sh` →
  `data-type="learn-object-store-your-first-object-put"`.
- `nats-server -js` startup, bucket-create one-liners shown as setup, and "run it
  in two terminals" watch demos are plain fenced `bash` blocks (no div) when they
  are CLI-only operations. When the same operation has a real multi-language form
  (create, put, get, list, watch, addLink), prefer the div.
- The pinned bucket/object/service names and the payload are identical across
  every page and language.

### 6.1 Planned `nats-example` snippets (data-type → CLI source path)

| Page | data-type | CLI source (`static/examples/snippets/cli/…`) | Shows |
|---|---|---|---|
| your-first-object | `learn-object-store-your-first-object-create` | `learn/object-store/your-first-object/create.sh` | `nats object add INVOICES --description "Invoice PDFs"` |
| your-first-object | `learn-object-store-your-first-object-put` | `learn/object-store/your-first-object/put.sh` | put a file into the bucket |
| your-first-object | `learn-object-store-your-first-object-get` | `learn/object-store/your-first-object/get.sh` | get the file back |
| your-first-object | `learn-object-store-your-first-object-getMissing` | `learn/object-store/your-first-object/getMissing.sh` | get a missing object → not-found (Pitfalls) |
| chunking | `learn-object-store-chunking-putLarge` | `learn/object-store/chunking/putLarge.sh` | put a 3 MB invoice, observe chunk count |
| chunking | `learn-object-store-chunking-chunkSize` | `learn/object-store/chunking/chunkSize.sh` | set chunk size, observe chunk count change (Pitfalls) |
| metadata-and-links | `learn-object-store-metadata-and-links-putWithMeta` | `learn/object-store/metadata-and-links/putWithMeta.sh` | put with description/header/metadata |
| metadata-and-links | `learn-object-store-metadata-and-links-info` | `learn/object-store/metadata-and-links/info.sh` | read `ObjectInfo` |
| metadata-and-links | `learn-object-store-metadata-and-links-addLink` | `learn/object-store/metadata-and-links/addLink.sh` | add a link from `label-…` to the invoice |
| metadata-and-links | `learn-object-store-metadata-and-links-staleLink` | `learn/object-store/metadata-and-links/staleLink.sh` | delete target, get via link fails (Pitfalls) |
| watching-and-listing | `learn-object-store-watching-and-listing-list` | `learn/object-store/watching-and-listing/list.sh` | list objects in the bucket |
| watching-and-listing | `learn-object-store-watching-and-listing-watch` | `learn/object-store/watching-and-listing/watch.sh` | watch for new objects |
| watching-and-listing | `learn-object-store-watching-and-listing-watchThenGet` | `learn/object-store/watching-and-listing/watchThenGet.sh` | watch gives metadata only; get the data (Pitfalls) |
| under-the-hood | `learn-object-store-under-the-hood-streamInfo` | `learn/object-store/under-the-hood/streamInfo.sh` | `nats stream info OBJ_INVOICES` reveals the backing stream |
| under-the-hood | `learn-object-store-under-the-hood-status` | `learn/object-store/under-the-hood/status.sh` | `nats object info INVOICES` / Status() introspection |

(These are the recommended set; the writer may merge or split, but every div
MUST have a matching committed `.sh` whose path equals the `data-type`.)

### 6.2 NatsFlow scenarios

This chapter MAXIMIZES animation. It needs **three new scenarios** and **reuses
one existing** scenario. Embed with:

```mdx
<div class="nats-flow" data-scenario="<camelCaseName>Animated" data-width="600" data-height="350"></div>
```

NEW scenarios to author (each requires the 5-file wiring: scenario component,
export in `src/components/NatsFlow/scenarios/index.ts`, registration in
`src/plugins/nats-flow/client-module.tsx`, the special-case branch in
`static/js/nats-flow-loader.js`, and a type entry in `src/types/global.d.ts` if
needed):

| Scenario name | Page | What flows (nodes + animated edges) |
|---|---|---|
| `objectPutGetAnimated` | your-first-object (and reused conceptually on chunking) | Nodes: `order-svc`, `INVOICES` bucket (split visually into a metadata subject and chunk subjects), `warehouse`. Edges: `order-svc` publishes N chunk messages then one metadata message → bucket; `warehouse` reads the metadata, then the chunks in order, reassembles, and verifies the digest. Shows put = chunks-then-meta, get = meta-then-chunks-then-verify. |
| `objectWatchSyncAnimated` | watching-and-listing | Nodes: `order-svc` (writer), `INVOICES` metadata subject, `analytics` (watcher). Edges: `order-svc` puts `invoice-…`, `label-…`, `packing-slip-…` → metadata subject; `analytics` watch (ordered delivery) receives each metadata update in order, then issues a separate `get` for the data. Shows real-time updates + metadata-only watch + follow-up get. |
| `objectRollupAnimated` | under-the-hood | Nodes: client, `OBJ_INVOICES` backing stream, server. Edges: client puts the same object name twice; each metadata publish carries the rollup header; the stream applies rollup, keeping only the latest metadata message and purging the prior one. Shows why a re-put leaves one current `ObjectInfo`, not a history. |

EXISTING scenario reused (already wired — do NOT author new):

| Scenario name | Page | Why it fits |
|---|---|---|
| `jetStreamContrastAnimated` | index | Establishes "this is built on a JetStream stream" before the chapter dives into objects — the same framing the index uses to send readers to `/learn/jetstream`. |

Do NOT use NatsFlow for pure config blocks, API-syntax snippets, or static
architecture diagrams. The `metadata-and-links` page does NOT get its own
animation — link traversal is shown with code, not flow (the candidate was rated
only MEDIUM and a third new component would exceed the ~1–3 cap; if the writer
finds a strong flow case, propose `objectLinkTraverseAnimated` separately rather
than reusing an unrelated existing scenario).

NEVER reference a `data-scenario` name that is neither in the existing wired set
nor in the three new scenarios above — it would render an error box.

---

## 7. Page-by-page outline

`stateIn`/`stateOut` track the running Acme session. ≤2 NEW concepts each.

| # | Slug | NEW concepts (≤2) | stateIn | stateOut | Defers / links |
|---|---|---|---|---|---|
| 0 | `index` | (1) what an **object** and a **bucket** are — a JetStream-backed store for files too big or too binary for a message; (2) the contrast: Object Store is rollup-latest + chunked, KV is multi-revision small values. Chapter map. No deep mechanics. | Reader has done JetStream. Nothing created yet. | A mental model: a bucket is a stream of chunks + metadata; the chapter map. Reuse `jetStreamContrastAnimated`. | Stream fundamentals → `/learn/jetstream`; small values/versioning → `/learn/key-value`. |
| 1 | `your-first-object` | (1) **put** — hand the store a name + bytes (or a file) and it stores them, computing a SHA-256 **digest**; (2) **get** — fetch by name, the store reassembles and verifies the digest. put-bytes / put-file / get-bytes / get-file convenience forms. | `INVOICES` not yet created. | `INVOICES` bucket created; `invoice-ord_8w2k.pdf` stored and fetched back. NatsFlow `objectPutGetAnimated`. | Why bytes are split → `chunking` (next page); chunk-size knob → `/reference/`. |
| 2 | `chunking` | (1) **chunks** — an object is split at the **chunk size** (default 128 KB), each chunk a message; get reassembles them in order and verifies the digest; (2) failure handling — a failed put purges partial chunks; a per-put identity means a re-put never overlaps old chunks. | `INVOICES` exists with the small invoice. | A 3 MB `invoice-ord_9x3m.pdf` stored across multiple chunks; reader can read `Chunks` count. (Animation reuses the put/get flow conceptually; no new component — see §6.2.) | Stream max message size → `/learn/jetstream/shaping-the-stream`; exact chunk-size range → `/reference/`. |
| 3 | `metadata-and-links` | (1) **metadata** — per-object `description`, HTTP-style `headers`, and a free-form `metadata` map carried in `ObjectInfo`; (2) **links** — an object whose target is another object or a whole **bucket link**, traversed transparently on get. | Invoices stored. | `invoice-ord_8w2k.pdf` carries a description + a `content-type` header; `label-ord_8w2k.png` linked to the invoice; get-via-link demonstrated. | `UpdateMeta` cannot change chunk size or link (Pitfalls); exhaustive `ObjectInfo` fields → `/reference/`. |
| 4 | `watching-and-listing` | (1) **list** — a snapshot of all non-deleted objects in the bucket; (2) **watch** — a stream of metadata updates in order, delivering only metadata (never the bytes), with a nil sentinel when caught up. | Several objects + a link in `INVOICES`. | `analytics` lists the bucket and watches it; new puts surface as metadata updates. NatsFlow `objectWatchSyncAnimated`. | watch modes (history / updates-only) → `/reference/`; KV's per-key watch contrast → `/learn/key-value/watching`. |
| 5 | `under-the-hood` | (1) the bucket **IS** the stream `OBJ_INVOICES` on `$O.INVOICES.C.>` (chunks) + `$O.INVOICES.M.>` (metadata); (2) the **rollup** header keeps only the latest metadata per object, and **soft delete** marks `Deleted=true` then purges chunks. | Objects, links, a watcher running. | Reader can `nats stream info OBJ_INVOICES`, read the chunk/meta subjects, and explain rollup + soft delete. NatsFlow `objectRollupAnimated`. | Stream config equivalents, replicas, purge semantics → `/learn/jetstream`; securing the bucket subjects → `/learn/security`. |
| 6 | `where-next` | Navigation only. Recap: a bucket is chunks + rollup metadata on a stream. Production checklist collecting every page's Pitfalls. Pointers to JetStream, Key-Value, Security, Backup, Monitoring, Clustering, Reference. | Whole `INVOICES` session standing. | A map of what is beyond objects; the bucket left running. | — |

### 7.1 Concept-budget notes

- `index` stays light: it names "object" and "bucket" and the KV contrast, no
  mechanics. The `jetStreamContrastAnimated` reuse is framing, not a third
  concept.
- `chunking` deliberately carries only the chunk mechanism + failure handling.
  The metadata that travels with chunks is named ("the metadata message follows
  the chunks") but defined on the NEXT page — define-then-use is preserved
  because `chunking` uses "metadata" only as a forward reference with a link.
- `under-the-hood` is the densest page; rollup and soft delete are paired because
  soft delete is *implemented via* a rollup metadata write. Keep RAFT/replicas
  to a one-line link.

---

## 8. Research domains / fact pack (verified — fold into the pages)

Source of truth: `nats.go` `jetstream/object.go` + `jetstream/errors.go`,
`natscli` (`nats object …`), ADR-20, and the client libs for API parity. The
following are the load-bearing facts each page must reflect.

### 8.1 Per-page mechanisms

**index**
- Object Store = JetStream-backed file/blob store. Bucket name constrained to
  `[a-zA-Z0-9_-]+` (ADR-20). Backed by one stream named `OBJ_<bucket>`.
- Two internal subject namespaces: `$O.<bucket>.C.>` (chunks) and
  `$O.<bucket>.M.>` (metadata).
- Contrast for the reader: KV is multi-revision small values; Object Store is
  rollup-latest metadata + chunked data.

**your-first-object**
- Put: name + `io.Reader` (or file/bytes) → split into chunks at chunk size →
  running SHA-256 digest → after chunks, a metadata message (`ObjectInfo` JSON)
  is published with the rollup header.
- Get: read latest `ObjectInfo` for the name, stream the chunks back in order,
  verify SHA-256 against `ObjectInfo.Digest`, return the bytes/stream.
- Convenience forms across languages: put-bytes, put-file, put-stream;
  get-bytes, get-file, get-stream; get-info.
- Errors: `ErrObjectNotFound`, `ErrBadObjectMeta`, `ErrDigestMismatch`.

**chunking**
- Default chunk size = 128 KB (`128 * 1024`). `ObjectInfo.Chunks` = uint32 count
  of chunk messages.
- Each put gets a fresh per-put identity (NUID) → chunk subject
  `$O.<bucket>.C.<object-nuid>`; a re-put never overlaps old chunks.
- A put that fails mid-stream purges the partial chunks before returning the
  error.
- Chunk-size knob (`max_chunk_size` in object meta options) is clamped to the
  stream's max message size; too small = many messages + overhead, too large =
  exceeds max message size.

**metadata-and-links**
- `ObjectMeta`: name, description, headers (HTTP-style), metadata (k/v map),
  options (link + chunk size). `ObjectInfo` = `ObjectMeta` + bucket, nuid, size,
  chunks, digest, deleted, mtime.
- `UpdateMeta` can change name, description, headers, metadata — NOT chunk size
  or link (silently kept). Rename to an existing non-deleted name →
  `ErrObjectAlreadyExists`.
- Links: object link `{bucket, name}`; bucket link = empty target name → links
  the whole bucket, traversed at get time. Cannot link to a deleted object
  (`ErrNoLinkToDeleted`) or to another link (`ErrNoLinkToLink`); cannot overwrite
  a non-deleted object with a link (`ErrObjectAlreadyExists`).

**watching-and-listing**
- Watch: ordered delivery of metadata updates (`ObjectInfo` JSON), sends a nil
  sentinel when caught up (unless updates-only). Options: include-history,
  ignore-deletes, updates-only. Watch delivers metadata ONLY — never the chunk
  bytes.
- List: builds on watch with ignore-deletes; returns the snapshot of non-deleted
  objects; `ErrNoObjectsFound` on an empty bucket.

**under-the-hood**
- Backing stream config: `AllowRollup=true`, `AllowDirect=true`,
  `Discard=DiscardNew`; optional S2 compression at the stream level.
- Every metadata publish carries `Nats-Rollup: sub` → only the latest
  `ObjectInfo` per object name is kept.
- Meta subject: `$O.<bucket>.M.<base64url(name)>` (names base64url-encoded so any
  object name is a safe subject). Chunk subject: `$O.<bucket>.C.<object-nuid>`.
- Soft delete = a metadata message with `Deleted=true`, `Size=0`, `Chunks=0`,
  empty digest + all chunks purged.
- Digest format: `SHA-256=<base64url(hash)>`.
- Reference config (ADR-20), use as the `under-the-hood` example block:

  ```json
  {
    "name": "OBJ_INVOICES",
    "subjects": ["$O.INVOICES.C.>", "$O.INVOICES.M.>"],
    "max_age": 0,
    "max_bytes": -1,
    "storage": "file",
    "num_replicas": 1,
    "discard": "new",
    "allow_rollup_hdrs": true,
    "allow_direct": true
  }
  ```

**where-next**
- `Status()` → backing stream info: bucket, description, TTL, storage, replicas,
  sealed flag, total size, compression flag, backing store = "JetStream".
- Patterns: config/binary blob storage, media libraries, backup/archive. Tuning:
  chunk size, replicas, compression trade-offs.

### 8.2 Default configuration values (fold where relevant)

| Parameter | Default |
|---|---|
| Chunk size | 128 KB (`128 * 1024`) |
| Replicas | 1 |
| MaxBytes | -1 (unlimited) |
| TTL (MaxAge) | 0 (no expiration) |
| Compression | off (S2 only if explicitly enabled; needs nats-server 2.10+) |
| Discard policy | DiscardNew |

### 8.3 Key commands (verified `nats` CLI)

```bash
nats object add INVOICES --description "Invoice PDFs"   # create bucket
nats object put INVOICES invoice-ord_8w2k.pdf           # store (reads file/stdin)
nats object get INVOICES invoice-ord_8w2k.pdf           # retrieve
nats object ls INVOICES                                 # list objects
nats object info INVOICES invoice-ord_8w2k.pdf          # object metadata
nats object rm INVOICES invoice-ord_8w2k.pdf            # delete object
nats object watch INVOICES                              # watch for changes
nats object seal INVOICES                               # no further writes
nats stream info OBJ_INVOICES                           # reveal backing stream
```

Verify exact subcommand spelling against the installed `nats` CLI when authoring
the `.sh` files (`add`/`create`, `ls`/`list`, `rm`/`del` aliases differ across
versions; pin one and keep it consistent across all snippets).

### 8.4 API parity (one table for the writer; do not reproduce in full per page)

Create / Put(bytes|stream|file) / Get(bytes|stream|file) / GetInfo / UpdateMeta /
AddLink / AddBucketLink / Delete / List / Watch / Seal / Status exist across
nats.go, nats.js, nats.java, nats.py, nats.rs. The `nats-example` pipeline
supplies the per-language code; the prose names the operation, not the signature.
Known gap: a `revision` field exists on `ObjectInfo` in JS/Rust/Java but not in
Go's public API — do not lean on `revision` in prose (it is a stream detail, and
naming it risks importing KV's revision vocabulary, which §5.2 bans).

### 8.5 Error catalog (use for Pitfalls handling examples)

| Error | When | Handle |
|---|---|---|
| `ErrObjectNotFound` | get/get-info on missing or deleted name | retry or handle gracefully |
| `ErrBucketNotFound` | bucket lookup before create | create the bucket or exit |
| `ErrDigestMismatch` | reassembled bytes' SHA-256 ≠ stored digest | retry; flag possible data loss |
| `ErrObjectAlreadyExists` | put/add-link over a non-deleted name | delete first or choose a new name |
| `ErrNoLinkToDeleted` | add-link to a deleted target | check the target exists first |
| `ErrNoLinkToLink` | add-link to a link | traverse to the final target |
| `ErrNoObjectsFound` | list on an empty bucket | treat as an empty result, not an error |
| `ErrInvalidStoreName` | bucket name fails `[a-zA-Z0-9_-]+` | use a compliant name |

### 8.6 Server version constraints (mention only where load-bearing)

- Base Object Store: nats-server 2.8.0+.
- Stream-level metadata + S2 compression: nats-server 2.10.0+.
- Subject delete markers (future soft-delete cleanup optimization):
  nats-server 2.11.0+.

### 8.7 Pitfalls (one `## Pitfalls` per content page — these are the canonical four)

1. **Digest mismatch on a corrupted transfer** (your-first-object or chunking):
   chunks publish asynchronously; an unchecked mid-stream failure yields an
   incomplete object and get fails with `ErrDigestMismatch`. Do: always check
   the get result/error before using the bytes; retry with backoff. Don't:
   assume a put "worked" without confirming. Runnable handling example via the
   `getMissing`/error-path snippet.
2. **Stale link target after deletion** (metadata-and-links): a link is a
   snapshot at creation; delete the target and get-via-link fails with
   `ErrObjectNotFound`. Do: verify the target exists, or prefer a bucket link for
   loose coupling. Don't: assume add-link pins the target alive. Runnable via the
   `staleLink` snippet.
3. **`UpdateMeta` silently ignores chunk size and link** (metadata-and-links):
   `UpdateMeta` updates only name/description/headers/metadata; passing a new
   chunk size or link is silently kept. Do: delete + re-put to change chunk size;
   delete + add-link to change a link target. Don't: expect `UpdateMeta` to
   re-chunk.
4. **Watch delivers metadata only, not the bytes** (watching-and-listing): watch
   subscribes to the metadata subject; the chunk bytes live on a separate
   subject. Do: use watch to learn WHAT changed, then get the data. Don't: try to
   read a 100 MB payload off the watch channel. Runnable via the `watchThenGet`
   snippet.

A fifth, chunking-specific gotcha (chunk size too small = overhead, too large =
exceeds stream max message size) anchors the `chunking` page's Pitfalls so every
content page has one. `under-the-hood`'s Pitfalls covers soft delete: a soft
delete does NOT reclaim disk until the chunks purge, and a re-put after delete is
a new object identity (don't expect history).

### 8.8 Continuity check (verified — no forced additions)

Object Store fits the Acme world naturally as an operational store beside the
`ORDERS` stream. `order-svc` (Core NATS publisher / JetStream producer) puts
invoices; `warehouse` (Core NATS subscriber) gets them; `analytics` (JetStream
consumer) watches the bucket. The Security chapter's account/export model and the
Topologies chapter's replicas apply unchanged and are referenced, not rebuilt.

### 8.9 Canonical examples to mine (real URLs)

- `docs.nats.io/nats-concepts/jetstream/object-store` — official docs.
- `github.com/nats-io/nats.go` `jetstream/README.md` (Put/Get/Delete/Watch/List).
- `github.com/nats-io/nats.go` `jetstream/test/object_test.go` (errors, links,
  compression).
- ADR-20 "JetStream based Object Stores" — naming, config, structures, API.
- natsbyexample.com `examples/os/intro`, `examples/os/deleting`,
  `examples/os/watching`.

Do not invent example URLs beyond these.

---

## 9. Acceptance criteria

Chapter-wide:

- [ ] All 7 `/learn/object-store/*` URLs return 200 and render.
- [ ] Every embedded `data-scenario` is either an existing wired scenario
      (`jetStreamContrastAnimated`) or one of the three NEW scenarios authored in
      this chapter (`objectPutGetAnimated`, `objectWatchSyncAnimated`,
      `objectRollupAnimated`) — no fabricated names.
- [ ] Each new scenario is wired in all required files (export, registration,
      loader special-case, types) before its page references it.
- [ ] `npm run typecheck` and `npm run build` pass; no broken internal links.
- [ ] Wording lockfile (§5.2) holds — grep returns no banned terms; no JetStream
      mechanism is re-taught from scratch; no KV revision/history vocabulary
      applied to objects.
- [ ] No `/reference/object-store` (or any invented path) appears; only allow-list
      paths from §5.4.

Per page:

- [ ] ≤2 NEW concepts; one `## See also` block (≤3 links from §5.4).
- [ ] Bucket / object / service names and payload match §4 exactly.
- [ ] 150–400 source lines (`index`/`where-next` may run longer).
- [ ] Every `nats-example` div has a matching committed CLI `.sh`; `data-type`
      equals the file path with dashes; CLI is the default tab where Tabs appear.
- [ ] `## Pitfalls` present, placed before `## Where you are`, with a runnable
      handling example.
- [ ] No leaked tool-call tags (`</content>`, `</invoke>`, `</parameter>`) in the
      file.

`where-next` specifically:

- [ ] `## Production checklist` collects every content page's Pitfalls action
      items, grouped per page, each group linking that page's `#pitfalls` anchor.

---

## 10. Out of scope

- Stream fundamentals, KV multi-revision history, replication/RAFT internals,
  security/account export, archiving/tiering — all linked, none taught here.
- Versioned Learn content; translation; search tuning.
- A `/concepts/object-store` primer or any `/reference/object-store` section
  (neither exists; do not link to or assume them).
- Auto-generation — every page is hand-written prose; only embedded code comes
  from the `nats-example` pipeline.
