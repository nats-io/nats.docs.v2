# Core NATS Deep Dive — Design Spec

**Date:** 2026-06-04
**Status:** Draft for implementation
**Audience for this spec:** the writer (Claude or human) of each page

---

## 1. Goal

Land the **Core NATS** deep dive in the "Learn" section — the Develop-half
chapter that teaches the foundational, *ephemeral* messaging layer everything
else is built on: publish-subscribe, subjects and wildcards, request-reply,
queue groups, and scatter-gather.

It is the foundation chapter. It sits below the JetStream deep dive (persistence)
and expands the four Core Concepts primers (`pub-sub-basics`, `subjects`,
`request-reply`, `queue-groups`) into one runnable, build-it-up walkthrough.

### 1.1 The hard problem for this chapter: overlap with concepts

Core NATS overlaps the concept primers more than any other chapter. The primers
already explain *what* each pattern is, with the same NatsFlow animations. The
deep dive must earn its place by going **deeper and runnable**:

- **Concepts** = what each pattern is.
- **Deep dive** = how it works on the wire (interest graph, `_INBOX`,
  no-responder/503, at-most-once) **plus one runnable Acme ORDERS session** that
  grows pub/sub → subjects → request-reply → queue groups → scatter-gather, page
  by page.

If a paragraph would be at home verbatim in the concept primer, it is too
shallow for the deep dive. Add the mechanism, the runnable step, or the
trade-off the primer skips.

### 1.2 Non-goals (the boundary — link, do not teach)

- **Persistence, durability, redelivery, "survive a restart"** → JetStream
  (`/learn/jetstream`, `/concepts/jetstream`). Core NATS is **at-most-once** and
  ephemeral; say so and link out.
- **Reconnection, drain, slow consumers, connection resilience** →
  `/learn/resilient-clients`.
- **Geo-affinity of queue groups across regions** → `/learn/topologies/super-clusters`.
- **The Services (micro) framework** (built on request-reply + queue groups) →
  `/learn/services`.
- **Subject permissions / security** → `/learn/security`.
- Not version-conditional; unversioned, concepts only.

---

## 2. Decisions (resolved with the requester)

| Topic | Decision |
|---|---|
| Visuals | **Reuse existing NatsFlow scenarios** — no new components. Each page embeds the already-wired scenario that the matching concept page uses. |
| Depth angle | **Mechanics + one runnable narrative.** Go visibly deeper than concepts; build a single Acme ORDERS session across the chapter. |
| Running scenario | **The Acme ORDERS world, before it adds JetStream** — pure ephemeral pub/sub between the order services. |
| Reader assumption | Has read Core Concepts. New to building with NATS. This is usually the FIRST deep dive a reader does. |
| Versioning | Unversioned, concepts only. |

---

## 3. Files & sidebar plumbing

Pages live under `learn/core-nats/` (served at `/learn/core-nats`). The sidebar
(`sidebars-learn.ts`) already lists all 7 pages in order — **no sidebar edit**:

```
learn/core-nats/
  index.md                  # 0 — chapter intro
  publish-subscribe.md      # 1
  subjects-and-wildcards.md # 2
  request-reply.md          # 3
  queue-groups.md           # 4
  scatter-gather.md         # 5
  where-next.md             # 6
```

### 3.1 Cross-link from Core Concepts

Add a `:::tip` admonition near the top of `docs/concepts/pub-sub-basics.md`
pointing to `/learn/core-nats` (this is the natural entry primer). No content is
moved.

### 3.2 URL stability

`/learn/core-nats/<page>` URLs are part of the spec.

---

## 4. Master scenario (pinned — the Acme ORDERS world, pre-JetStream)

This is the SAME Acme order platform from the JetStream/Security/Topologies
chapters, shown at its foundation: the services talk over **core NATS only**, no
persistence yet. (The JetStream chapter later adds the stream; this chapter is
"before that.") Same payload shape:

```json
{
  "order_id": "ord_8w2k",
  "customer": "acme-co",
  "total_cents": 4200,
  "ts": "2026-05-22T10:14:22Z"
}
```

Pinned entities (same names, every page):

| Role | Name(s) | Used on page |
|---|---|---|
| Order subjects | `orders.created`, `orders.shipped`, `orders.cancelled` | all |
| Regional subjects (for wildcards) | `orders.us.created`, `orders.eu.created`, … | subjects-and-wildcards |
| Subscriber services | `warehouse`, `notifications`, `analytics` | publish-subscribe, queue-groups |
| Request-reply service | an **inventory** service answering on `orders.inventory.check` | request-reply |
| Queue group | a pool of **packers** sharing queue group name `packers` on `orders.created` | queue-groups |
| Scatter-gather | three **shipping-quote** providers answering on `shipping.quote` | scatter-gather |

Rules: the deployment is a single local `nats-server` (topology is a different
chapter). No page introduces persistence, acks, or reconnection. Carry the
session forward: a reader keeps `nats-server` running and adds subscribers/
services as the chapter progresses. Never invent a different payload or service
name.

---

## 5. Voice & wording rules

### 5.1 Voice (same hard rules as the other Learn chapters)

- One teaching thought per paragraph. Two ideas joined by "and" → split.
- Define-then-use. Never use a term before its own paragraph.
- ≤2 new concepts per page. A third goes to a later page or is linked out.
- Active voice, present tense. No filler.
- Length 150–400 source lines. `index`/`where-next` may be 80+.

### 5.2 Wording lockfile (same word for same thing; NEVER the banned terms)

| Term | Use | Don't use |
|---|---|---|
| subject | "subject" | "topic", "channel" |
| publish / subscribe | "publish" / "subscribe" | "send" / "listen" for pub/sub |
| request / reply / respond | request-reply verbs | "send a request" is OK; avoid "call"/"RPC" except one framing mention |
| message | "message" | "event", "packet", "record" |
| publisher / subscriber | the pub/sub roles | "producer"/"consumer" (consumer is a JetStream term) |
| client | the connecting application | conflating with publisher/subscriber |
| queue group | "queue group"; the shared name is the "queue group name" | "queue", "channel", "worker group", "consumer group" |
| single-token wildcard | `*` (after intro) | "star", "asterisk wildcard" in body |
| multi-token wildcard | `>` (after intro) | "greater-than", "tail wildcard" in body |
| inbox | the reply subject (`_INBOX.>`) | "callback subject", "return channel" |
| request-reply | hyphenated | "req/rep" in prose |
| at-most-once | core delivery guarantee (define once) | "best-effort"/"unreliable" loosely |
| scatter-gather | hyphenated | "fan-out-collect" |
| no responders | the no-responder error | "no listeners", "dead subject" |

**Boundary lockfile (critical):** do NOT use JetStream vocabulary as if it
applied to core NATS — no "stream", "consumer", "ack", "persisted", "stored",
"durable", "redelivered", "exactly-once". When the reader would want those,
name the gap and link to `/learn/jetstream`.

### 5.3 Reference handoff phrase (greppable)

> The wire-level `PUB`/`SUB`/`MSG` protocol is documented in
> [Reference → Client protocol](/reference/protocols/client). We only need the
> behavior here.

Each page ends with a **"## See also"** section: 1–3 links, hard max 3.

### 5.4 VALID internal link targets (allow-list)

- **Reference:** `/reference/protocols/client`, `/reference/` (root)
- **Concepts:** `/concepts/pub-sub-basics`, `/concepts/subjects`,
  `/concepts/request-reply`, `/concepts/queue-groups`, `/concepts/jetstream`,
  `/concepts/topologies`, `/concepts/security`, `/concepts/what-is-nats`
- **Learn siblings:** `/learn/core-nats/<slug>`; `/learn/jetstream` (+
  `/learn/jetstream/why-a-stream`); `/learn/services` (+
  `/learn/services/your-first-service`); `/learn/resilient-clients` (+
  `reconnection`, `slow-consumers`); `/learn/topologies/super-clusters`;
  `/learn/security`

Do NOT invent paths outside this list.

---

## 6. Example pattern (matches `CLAUDE.md`)

Core NATS is the most *client-library* of the chapters — most snippets have a
genuine multi-language form, so the `nats-example` div is the DEFAULT here.

- Use a `nats-example` div for every real pub/sub/request/queue snippet:

  ```mdx
  <div class="nats-example"
       data-type="learn-core-nats-<slug>-<snippet>"
       data-languages="cli,js,go,python,java,rust,csharp"></div>
  ```

  and author the matching CLI source
  `static/examples/snippets/cli/learn/core-nats/<slug>/<snippet>.sh`
  (`#!/bin/bash`, real `nats` commands). The path dirs join with dashes to form
  the `data-type`; verify they match.
- "Try it in two terminals" demos and `nats-server` startup are plain fenced
  `bash` blocks (no div).
- The pinned ORDERS payload and entity names are identical across every page and
  language.

### 6.1 Reuse these existing NatsFlow scenarios (already wired — do not author new)

| Page | `data-scenario` |
|---|---|
| `publish-subscribe` (and optionally `index`) | `publishSubscribeAnimated` |
| `subjects-and-wildcards` | `subjectsWildcardAnimated` |
| `request-reply` | `requestReply` |
| `queue-groups` | `queueGroupAnimated` |
| `scatter-gather` | `requestReplyScatterGather` |

(`fanOut` / `fanIn` are also available if a page wants a supplementary one.)
Embed with `<div class="nats-flow" data-scenario="<name>" data-width="600" data-height="350"></div>`.
NEVER reference a `data-scenario` name not in this list (it would render an error box).

---

## 7. Page-by-page outline

`stateIn`/`stateOut` track the running session. ≤2 new concepts each.

| # | Slug | Teaches (≤2 concepts) | Leaves reader with | Defers / links |
|---|---|---|---|---|
| 0 | `index` | What Core NATS is — the ephemeral foundation — and the five patterns the chapter builds (pub/sub → subjects → request-reply → queue groups → scatter-gather) on the Acme ORDERS app before persistence. Chapter map. | A mental model: subjects + interest = the whole core. | Persistence → `/learn/jetstream`. |
| 1 | `publish-subscribe` | (1) fire-and-forget publish — a copy goes to every interested subscriber, and to nobody if there is none (discarded); (2) **at-most-once** delivery and the 1 MB default max payload. Run the ORDERS publisher + `warehouse`/`notifications`/`analytics` subscribers. NatsFlow `publishSubscribeAnimated`. | The decoupling model and core's delivery guarantee. | Durability/redelivery → `/learn/jetstream`; wire protocol → `/reference/protocols/client`. |
| 2 | `subjects-and-wildcards` | (1) subjects are dot-delimited tokens forming a hierarchy; (2) subscriber wildcards — `*` matches exactly one token, `>` matches one-or-more and only at the end. Add regional `orders.us.*` subscribers. Note reserved `$`/`_INBOX` prefixes + subjects-are-free. NatsFlow `subjectsWildcardAnimated`. | How to address and pattern-match messages. | Subject-based security → `/learn/security`; interest routing across servers → `/learn/topologies/super-clusters`. |
| 3 | `request-reply` | (1) the `_INBOX` mechanism — the client subscribes to a unique reply subject and sends it with the request; the responder replies to it; (2) timeouts and the **no-responders** (503) signal. Build the `inventory` service answering on `orders.inventory.check`. One line on headers. NatsFlow `requestReply`. | Synchronous RPC-style calls on top of pub/sub, and how failure surfaces. | Headers detail → `/reference/`; the Services framework → `/learn/services`. |
| 4 | `queue-groups` | (1) a **queue group** — subscribers sharing a queue group name, where each message goes to exactly one member; (2) queue groups coexist with plain subscribers on the same subject, and membership is dynamic. Add a `packers` pool on `orders.created`. NatsFlow `queueGroupAnimated`. | Built-in load balancing without a broker or coordinator. | Geo-affinity across regions → `/learn/topologies/super-clusters`; durable work queues → `/learn/jetstream`. |
| 5 | `scatter-gather` | (1) one request fanned to many responders (no queue group) means **many replies**; (2) gathering them — subscribe to the inbox yourself and collect by count or deadline rather than taking the first. Query three `shipping.quote` providers and pick the best. NatsFlow `requestReplyScatterGather`. | When to gather multiple replies and how to bound the wait. | request-many client helpers → `/reference/`; aggregation services → `/learn/services`. |
| 6 | `where-next` | Navigation. Recap: subjects + interest + reply subjects + queue groups = all of core. The one thing core does NOT do is remember — that is JetStream. Pointers to JetStream, Services, Resilient Clients, Topologies, Security, Reference. May be 80+ lines. | A map of what's beyond the foundation. | — |

---

## 8. Research domains (Phase 1 — verified fact packs)

Source of truth: `nats-server` (subject matching, no-responders, max_payload),
`natscli` (`nats pub`/`sub`/`req`/`reply` flags), the client libs (`nats.go`,
`nats.rs`, etc. for `_INBOX`/request-many), `/reference/protocols/client`. Also
sweep nats-io / synadia-io / synadia-labs / ConnectEverything + nats-by-example
for canonical core-pattern examples.

| Key | Focus |
|---|---|
| `C_PUBSUB` | Pub/sub mechanics: the in-memory interest graph, fire-and-forget, at-most-once, "discarded if no interest", `max_payload` (1 MB default) and how the server enforces it, flush/round-trip. `nats pub` / `nats sub` flags. |
| `C_SUBJECTS` | Subjects: token rules, `*` (exactly one token) vs `>` (one-or-more, end-only), subscriber-only wildcards, allowed characters/case-sensitivity, reserved prefixes (`$SYS`/`$JS`/`$KV`/`$O`/`$SRV`/`_INBOX`), trie-based matching, why subjects are cheap. |
| `C_REQREPLY` | Request-reply: the `_INBOX` subject (old muxed inbox vs modern per-request), `request()`/`respond()` across clients, timeouts, the no-responders signal (503 / `Status: 503` no-responder), request headers. `nats req` / `nats reply` flags. |
| `C_QUEUE` | Queue groups: queue-subscribe semantics, random member selection, app-defined queue group name, mixing queue + plain subscribers on one subject, dynamic membership, queue + wildcard interaction. `nats sub --queue`. |
| `C_SCATTER` | Scatter-gather: collecting multiple replies — manual inbox subscription, gather by count or deadline, request-many helpers in clients (nats.go/nats.rs/orbit), `nats req --replies`. Fan-in aggregation. |
| `C_RESOURCES` | Hidden-examples sweep ONLY across nats-io/synadia-io/synadia-labs/ConnectEverything + nats-by-example: canonical pub/sub, request-reply, queue-group, scatter-gather examples. Return real URLs + what each shows + which slug it helps. Do not invent URLs. |

---

## 9. Acceptance criteria

Chapter-wide:

- [ ] All 7 `/learn/core-nats/*` URLs return 200 and render.
- [ ] Every embedded `data-scenario` is one of the existing wired scenarios
      (§6.1) — no fabricated names, no new components.
- [ ] `npm run typecheck` and `npm run build` pass; no broken internal links.
- [ ] `docs/concepts/pub-sub-basics.md` carries the `/learn/core-nats` cross-link.
- [ ] Wording lockfile (§5.2) holds — grep returns no banned terms, and **no
      JetStream vocabulary** is used as if it applied to core NATS.

Per page:

- [ ] ≤2 new concepts; one "See also" block (≤3 links from the §5.4 allow-list).
- [ ] Service names/payload match §4 exactly.
- [ ] 150–400 lines (`index`/`where-next` may be 80+).
- [ ] Every `nats-example` div has a matching committed CLI `.sh`; `data-type`
      matches the file path; CLI default tab where Tabs are used.
- [ ] No leaked tool-call tags (`</content>`, `</invoke>`) in the file.

---

## 10. Out of scope

- Persistence/JetStream, connection resilience, services framework, security,
  topology — all linked, none taught here.
- Versioned Learn content; translation; search tuning.
- New NatsFlow components.
- Auto-generation — every page is hand-written prose; only embedded code comes
  from the `nats-example` pipeline.
</content>
