# Resilient Clients Deep Dive — Design Spec

**Date:** 2026-06-05
**Status:** Draft for implementation
**Audience for this spec:** the writer (Claude or human) of each page

---

## 1. Goal

Land the **Resilient Clients** deep dive in the "Learn" section — the chapter
that makes the Acme ORDERS app's *client connections* production-grade. It
teaches the **client connection lifecycle** under real network faults and load:
how to open a connection with the right options, survive a disconnect, shut down
cleanly, keep a slow subscriber from drowning, make request-reply tolerate
failure, and consume TLS and auth credentials.

It sits beside the Core NATS and JetStream deep dives. Core NATS taught you to
publish and subscribe on a single laptop server; this chapter takes those same
publishers and subscribers and asks the harder question: *what happens when the
server goes away, the network stalls, or the handler can't keep up?* The answer
is a connection that detects faults, buffers through them, and recovers without
losing the application's place.

### 1.1 The hard problem for this chapter: it has no concept primer

Unlike Core NATS, JetStream, Security, and Topologies, there is **no
`/concepts/resilient-clients` primer** to overlap with. This chapter is the only
place the connection lifecycle is taught. That is freeing — there is no "too
shallow, it's already in the primer" trap — but it raises the bar the other way:
the chapter must define every term it uses (DISCONNECTED, RECONNECTING, drain,
slow consumer, no-responders) because nothing upstream defines them. Define
each one in its own paragraph before using it, exactly as the other chapters do.

The discipline that replaces the overlap check is the **client-vs-server line**
(§1.2). This chapter only ever talks about what the *client* does. The moment a
paragraph starts to explain *why* a server went away or *how* a credential was
issued, it has crossed into a sibling chapter and must link out instead.

### 1.2 Non-goals (the boundary — link, do not teach)

- **Server-side topology — why a server went away, how a cluster routes, what a
  gateway or leaf node is** → `/learn/topologies` and `/learn/clustering`. This
  chapter treats "the server is gone" as a fact the client reacts to, never a
  thing it explains.
- **How auth and TLS are *configured on the server* — accounts, JWTs, operator
  mode, issuing creds, writing a CA** → `/learn/security`. This chapter only
  ever **consumes** a credentials file and a CA certificate; it never makes one.
- **JetStream consumer redelivery semantics — ack, nak, term, max-deliver,
  AckWait** → `/learn/jetstream/acknowledgment`. When a connection drops, the
  consumer's *position* is the JetStream layer's job; this chapter stops at the
  connection re-subscribing.
- **The Services (micro) framework** built on request-reply → `/learn/services`.
- **Monitoring client health from the server side** (SlowConsumers metric,
  advisories) → `/learn/monitoring`.
- Not version-conditional; unversioned, concepts only.

---

## 2. Decisions (resolved with the requester)

| Topic | Decision |
|---|---|
| Visuals | **Maximize animation.** Six NEW NatsFlow scenarios, one per content page that carries a genuine message/control flow. No existing core/JetStream scenario fits the connection-lifecycle angle, so none are reused for the flow slot. |
| Depth angle | **The client connection lifecycle as a state machine.** Each page adds one mechanism on the same machine: open → reconnect → drain → backpressure → request resilience → secure transport. |
| Running scenario | **The Acme ORDERS app, hardened.** The `order-svc` publisher and the JetStream consumers (`warehouse`, `notifications`, `analytics`, `shipping`) get production connection options. Same payload, same subjects, no new entities. |
| Reader assumption | Has read Core NATS (knows publish/subscribe/request-reply) and ideally JetStream. New to running NATS clients in production. |
| Versioning | Unversioned, concepts only. |
| Source of truth | `nats.go` Options/Status/error constants, verified live (Status enum lines 187–213; `ErrConnectionDraining`/`ErrDrainTimeout` line 103–104; `ErrNoResponders` + 503 no-responders header). |

---

## 3. Files & sidebar plumbing

Pages live under `learn/resilient-clients/` (served at `/learn/resilient-clients`).
The sidebar (`sidebars-learn.ts`) already lists all 8 pages in this exact order —
**no sidebar edit, no new or removed pages**:

```
learn/resilient-clients/
  index.md                      # sidebar_position 1 — chapter intro
  connecting.md                 # 2
  reconnection.md               # 3
  drain-and-shutdown.md         # 4
  slow-consumers.md             # 5
  request-reply-resilience.md   # 6
  tls-and-auth.md               # 7
  where-next.md                 # 8
```

Stub frontmatter today carries only `title`. Each page must be rewritten with
full numbered frontmatter (`id`, `title`, `sidebar_position`, `description`) per
the voice rules in §5. Titles in the running text use the human labels already
in the sidebar: Connecting, Reconnection, Drain & Shutdown, Slow Consumers,
Request-Reply Resilience, TLS & Auth, Where Next.

### 3.1 Cross-link in

No concept primer exists to link from. The chapter is reached from Core NATS
(`/learn/core-nats/where-next` already lists Resilient Clients) and from the
JetStream where-next sibling list. No upstream edits are required by this spec.

### 3.2 URL stability

`/learn/resilient-clients/<page>` URLs are part of the spec.

---

## 4. Master scenario (PINNED — the Acme ORDERS app, hardened)

This is the SAME Acme order platform from every other Learn chapter. Nothing is
renamed or invented. This chapter takes the existing clients and gives their
*connections* production options. The canonical payload is byte-identical
everywhere:

```json
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}
```

Pinned entities (same names, every page — reuse, never rename):

| Role | Name(s) | Used on page |
|---|---|---|
| Order subjects | `orders.created`, `orders.shipped`, `orders.cancelled` | all |
| Regional subjects | `orders.us.created`, `orders.eu.created` | connecting, reconnection (server pool framing) |
| Publisher | `order-svc` (publishes `orders.created`) | connecting, reconnection, drain-and-shutdown, tls-and-auth |
| Subscribers | `warehouse`, `notifications`, `analytics` (subscribe `orders.>`) | slow-consumers, drain-and-shutdown |
| Request-reply | `inventory` responder on `orders.inventory.check`; `order-svc` is the requester | request-reply-resilience |
| JetStream consumers | the `shipping` pull consumer and the `analytics` consumer on the `ORDERS` stream | reconnection, drain-and-shutdown (their connections, not their ack semantics) |
| Cluster | the `n1`/`n2`/`n3` cluster from Topologies, used only as a **server pool the client connects to** | connecting, reconnection |
| Creds | account `ORDERS`, user `order-svc` — its `.creds` file and the cluster CA, **consumed** by the client | tls-and-auth |

Rules:

- The deployment is whatever the prior chapters built: a single `nats-server`
  for early pages, the `n1`/`n2`/`n3` cluster as the server pool once reconnection
  enters. The client points at the pool; this chapter never explains *how* the
  cluster forms — that is Topologies.
- Carry the session forward. A reader keeps `order-svc` connected and adds one
  resilience option per page: page 2 opens the connection, page 3 makes it
  reconnect, page 4 drains it on shutdown, and so on.
- Never invent a different payload, subject, or service name. Auth credentials
  are the existing `order-svc` user from the Security chapter — this chapter only
  loads its file.

---

## 5. Voice & wording rules

### 5.1 Voice (same hard rules as the four done chapters)

- One teaching thought per paragraph. Two ideas joined by "and" → split.
- Define-then-use. Never use a term before the paragraph that defines it.
- ≤2 NEW concepts per content page. A third is deferred to a later page or
  linked out.
- Active voice, present tense. No filler, no hedging.
- Teach what matters; link `/reference/` for the exhaustive knob list using the
  greppable handoff phrase (§5.3).
- Content page skeleton: numbered frontmatter → intro → concept H2s with
  embedded examples → **`## Pitfalls`** (2–4 concept-scoped gotchas, do/don't,
  one runnable handling example; placed BEFORE `## Where you are`) →
  `## Where you are` → `## What is next` → `## See also` (≤3 links).
- `index` skeleton: frontmatter (`id: index`, `sidebar_position: 1`) → intro →
  "By the end you will have" → "Who this is for" → "How to read it" → `## Map`
  table linking every page → `## Prerequisites`.
- `where-next` skeleton: recap "the whole game" → "Where the details live now" →
  `## Sibling deep dives` → `## Where you are` → `## Production checklist`
  (collects every page's Pitfalls action items, grouped per page with a link to
  that page's `#pitfalls`) → `## See also`.
- Length 150–400 source lines per content page; `index`/`where-next` may run
  longer.

### 5.2 Wording lockfile (same word for same thing)

| Term | Use | Don't use |
|---|---|---|
| client | the connecting application object | "the SDK", "the driver", conflating with publisher/subscriber |
| connection | the live link to a server | "session", "socket" (except when literally the TCP socket) |
| connection option | a setting passed at connect time | "config flag", "parameter" loosely |
| publisher / subscriber | the pub/sub roles (`order-svc`, `warehouse`…) | "producer" / "consumer" — *consumer* is reserved for JetStream |
| consumer | ONLY a JetStream consumer | the pub/sub subscriber role |
| server pool | the list of server URLs a client may connect to | "cluster" (the cluster is server-side; the *pool* is the client's view) |
| reconnect | client re-establishing a dropped connection | "reconnection" as a verb; "fail over" loosely (reserve "failover" for the act) |
| backoff | the growing wait between reconnect attempts | "retry delay" loosely, "cooldown" |
| jitter | random added to backoff | "randomization", "fuzz" |
| drain | graceful shutdown that flushes then closes | "graceful close" loosely, "shutdown" for the API call |
| close | abrupt connection teardown | "drop", "kill" for `Close()` |
| in-flight message | a message delivered but not yet handled | "pending" (reserve "pending" for the subscription buffer count) |
| pending limit | the cap on a subscription's buffered messages/bytes | "buffer size" loosely, "queue limit" |
| slow consumer | a subscriber whose buffer overflows | "lagging subscriber", "backed-up client" |
| backpressure | slowing the producer when the consumer can't keep up | "throttling", "rate limiting" |
| request / reply / respond | request-reply verbs | "call"/"RPC" except one framing mention |
| timeout | the request's deadline for a reply | "deadline" loosely (OK once, defined) |
| no responders | the no-responder signal (503) | "no listeners", "dead subject" |
| retry / backoff | the request retry loop | "re-request", "loop" loosely |
| credentials file | the `.creds` consumed by the client | "auth file", "key file", "cert" (a cert is separate) |
| CA certificate | the root the client trusts | "cert" alone, "the CA" loosely |
| mTLS | mutual TLS (client presents a cert) | "two-way TLS", "client auth TLS" |
| lame duck | a server signaling graceful shutdown to clients | "draining server", "shutting-down node" |
| at-most-once | core delivery guarantee (carried from Core NATS) | "best-effort" loosely |

### 5.3 Boundary lockfile (banned cross-chapter vocabulary)

Do NOT teach or lean on these terms as if they were this chapter's job. Name the
gap and link out instead.

- **JetStream redelivery vocabulary** — "ack", "nak", "term", "AckWait",
  "max-deliver", "redelivered", "exactly-once", "durable consumer position". A
  reconnect re-subscribes; what happens to a JetStream consumer's *acks* is
  `/learn/jetstream/acknowledgment`.
- **Cluster/topology mechanics** — "RAFT", "leader election", "route", "gateway",
  "supercluster", "leaf node", "replica", "why the node died". The client sees a
  *server pool* and a disconnect; the rest is `/learn/topologies` /
  `/learn/clustering`.
- **Auth/TLS *configuration*** — "operator", "account JWT", "user JWT issuance",
  "signing key", "export/import", "nkey generation", "writing the server
  `tls{}` block". The client *loads* a creds file and a CA; making them is
  `/learn/security`.
- **Services framework** — "service group", "endpoint", "service discovery".
  Request-reply resilience here is the raw `request()` call; the framework is
  `/learn/services`.

### 5.4 Reference handoff phrase (greppable)

> The full set of connection options is documented in
> [Reference](/reference/). We cover only the ones that change how a connection
> behaves under fault here.

Each page ends with a **`## See also`** section: 1–3 links, hard max 3.

### 5.5 VALID internal link targets (allow-list)

Only these paths resolve. Do NOT invent any others.

- **Reference:** `/reference/` (root only — no resilient-clients reference
  section exists).
- **Concepts:** `/concepts/request-reply`, `/concepts/security`,
  `/concepts/topologies`, `/concepts/what-is-nats`.
- **Learn — this chapter:** `/learn/resilient-clients/connecting`,
  `/learn/resilient-clients/reconnection`,
  `/learn/resilient-clients/drain-and-shutdown`,
  `/learn/resilient-clients/slow-consumers`,
  `/learn/resilient-clients/request-reply-resilience`,
  `/learn/resilient-clients/tls-and-auth`,
  `/learn/resilient-clients/where-next` (and each page's `#pitfalls` anchor).
- **Learn — siblings (real slugs only):**
  - `/learn/core-nats` (+ `/learn/core-nats/request-reply`,
    `/learn/core-nats/publish-subscribe`)
  - `/learn/jetstream` (+ `/learn/jetstream/acknowledgment`,
    `/learn/jetstream/pull-consumers`)
  - `/learn/security` (+ `/learn/security/authentication-basics`,
    `/learn/security/encryption`)
  - `/learn/topologies` (+ `/learn/topologies/your-first-cluster`,
    `/learn/topologies/single-server`)
  - `/learn/clustering` (+ `/learn/clustering/raft-and-leaders`)
  - `/learn/services` (+ `/learn/services/your-first-service`)
  - `/learn/monitoring` (+ `/learn/monitoring/monitoring-endpoints`)

---

## 6. Example pattern (matches `CLAUDE.md`)

Resilient Clients is the most *client-library* chapter of all — almost every
snippet is a connection option or a callback that exists in every SDK. The
`nats-example` div is the DEFAULT here.

- Use a `nats-example` div for every real connect / reconnect-option / drain /
  pending-limit / request-retry / creds snippet:

  ```mdx
  <div class="nats-example"
       data-type="learn-resilient-clients-<slug>-<snippet>"
       data-languages="cli,js,go,python,java,rust,csharp"></div>
  ```

  and author the matching CLI source
  `static/examples/snippets/cli/learn/resilient-clients/<slug>/<snippet>.sh`
  (`#!/bin/bash`, real `nats` commands). The path dirs join with dashes to form
  the `data-type` — they MUST match exactly. Commit every `.sh` with
  `git add static/examples/snippets/cli/learn/resilient-clients/...`.

- **CLI caveat for this chapter:** the `nats` CLI exposes connection-resilience
  flags but not every client option (there is no CLI for `SetPendingLimits`,
  `CustomReconnectDelayCB`, or `UserJWTHandler`). Where the CLI genuinely cannot
  show a knob, use the `nats-example` div anyway (the CLI tab shows the closest
  global flag such as `--creds`, `--tls`, `nats sub` for a slow-consumer demo)
  and let the JS/Go/etc. tabs carry the option. Where there is no meaningful CLI
  at all, drop to a plain language-tabbed block per CLAUDE.md's "purely
  language-specific" exception. Prefer the div.

- "Run it in two terminals" demos, killing/restarting `nats-server` to force a
  reconnect, and `nats server report connections` are plain fenced `bash` blocks
  (no div) — they are CLI-only operations.

- The pinned ORDERS payload, subjects, and entity names are identical across
  every page and language.

### 6.1 NatsFlow scenarios

This run **maximizes animation**: one NEW scenario per content page that carries
a genuine message/control flow. No existing scenario captures the
connection-lifecycle angle (the core/JetStream/security/topologies scenarios are
about message routing and topology, not connect → disconnect → recover), so the
flow slots are all new. Embed with:

```mdx
<div class="nats-flow" data-scenario="<camelCaseName>Animated" data-width="600" data-height="350"></div>
```

NEW scenarios to build (one per flow-bearing page):

| Page | `data-scenario` | What flows |
|---|---|---|
| `connecting` | `connectHandshakeAnimated` | client → server: TCP connect, server's INFO, client's CONNECT with credentials, server's `+OK` (or `-ERR`); two visible end states, CONNECTED and rejected. |
| `reconnection` | `reconnectBackoffAnimated` | client in RECONNECTING cycling a server pool (`n1`,`n2`,`n3`): a failed dial, a wait-plus-jitter pause, the next dial, finally a `+OK`; buffered publishes flush on success. |
| `drain-and-shutdown` | `drainVsCloseAnimated` | side-by-side: `Close()` drops in-flight messages immediately vs `Drain()` sending UNSUB, delivering the last in-flight messages to handlers, then closing. |
| `slow-consumers` | `slowConsumerAnimated` | fast `order-svc` → server → a `warehouse` subscriber whose pending buffer fills and overflows; the overflow message is dropped and an async error fires. |
| `request-reply-resilience` | `requestRetryAnimated` | `order-svc` requesting `orders.inventory.check`: a request that times out, a backoff wait, a retry, then a reply; plus the distinct no-responders (503) immediate-return path. |
| `tls-and-auth` | `tlsAuthHandshakeAnimated` | client → server: TLS handshake and CA validation of the server cert, then CONNECT carrying the `order-svc` credentials, then `+OK`; an auth-failure `-ERR` branch. |

Existing scenarios reused: **none** (none fit the connection-lifecycle angle).

`index` and `where-next` carry no NatsFlow (navigation/recap pages — CLAUDE.md
bans NatsFlow for non-flow content). Do NOT reference any `data-scenario` name
not in the table above; an unknown name renders an error box.

---

## 7. Page-by-page outline

`stateIn`/`stateOut` track the running ORDERS session. ≤2 NEW concepts each.

| # | Slug | Teaches (≤2 NEW concepts) | stateIn → stateOut | Defers / links |
|---|---|---|---|---|
| 1 | `index` | What resilience means for a NATS client: the connection is a **state machine** (DISCONNECTED → CONNECTING → CONNECTED → RECONNECTING → DRAINING → CLOSED) that survives faults. Frames the seven mechanisms the chapter adds to the Acme clients. Chapter map. | stateIn: `order-svc` + subscribers exist from Core NATS, the `ORDERS` stream + consumers from JetStream. → stateOut: reader has the lifecycle mental model and the map. | Server-side faults → `/learn/topologies`; consumer acks → `/learn/jetstream/acknowledgment`. |
| 2 | `connecting` | (1) **connection options** — naming the connection, the server pool (multiple URLs, randomized), and the connect timeout; (2) the **connect handshake** as a sequence: TCP → server INFO → client CONNECT → `+OK`/`-ERR`, and what `max_payload`/`auth_required` in INFO mean for the client. Open `order-svc`'s production connection. NatsFlow `connectHandshakeAnimated`. | stateIn: clients exist but connect with defaults. → stateOut: `order-svc` connects with a name, a server pool, and a sane timeout. | TLS/auth *credentials* → page 7; why a server is unreachable → `/learn/topologies`. |
| 3 | `reconnection` | (1) **reconnect with backoff and jitter** — `AllowReconnect`, `MaxReconnect`, `ReconnectWait` + jitter, and the RECONNECTING state cycling the server pool; (2) the **reconnect buffer** — publishes queue (up to a size cap) while disconnected and flush on reconnect; subscriptions auto-restore. (PING/PONG keepalive deferred to one linked line.) Make `order-svc` and the JetStream consumers reconnect to the `n1`/`n2`/`n3` pool. NatsFlow `reconnectBackoffAnimated`. | stateIn: a single-server connection. → stateOut: a connection that survives a server going away and rejoins the pool. | What the consumer's *ack position* does across a reconnect → `/learn/jetstream/acknowledgment`; why the node died / how the pool is a cluster → `/learn/topologies`. |
| 4 | `drain-and-shutdown` | (1) **drain vs close** — `Close()` drops in-flight messages; `Drain()` unsubscribes, delivers in-flight messages to handlers, flushes pending publishes, then closes (DRAINING_SUBS → DRAINING_PUBS); (2) the **drain timeout** and reacting to a server's **lame-duck** signal. Shut `order-svc` and the subscribers down cleanly on SIGTERM. NatsFlow `drainVsCloseAnimated`. | stateIn: a reconnecting connection. → stateOut: a connection that exits without losing in-flight work. | Acking JetStream in-flight messages before drain → `/learn/jetstream/acknowledgment`; why a server enters lame duck → `/learn/topologies`. |
| 5 | `slow-consumers` | (1) the **subscription pending buffer** and **pending limits** — async subscribers buffer in memory (unbounded by default); `SetPendingLimits` caps messages/bytes; (2) the **slow-consumer signal** — overflow drops the message and fires the async error callback, and the server-side write-deadline that can drop the whole connection. Bound `warehouse`'s buffer and detect overflow. NatsFlow `slowConsumerAnimated`. | stateIn: subscribers with default unbounded buffers. → stateOut: subscribers that bound memory and surface backlog instead of OOMing silently. | Distributing load across many subscribers → `/learn/core-nats` (queue groups); server-side metrics for slow consumers → `/learn/monitoring`. |
| 6 | `request-reply-resilience` | (1) **request timeout and no-responders (503)** — a request returns either a reply, a timeout, or an immediate no-responders signal, and the two failures mean different things; (2) **retry with backoff + idempotency** — retry no-responders with growing backoff, fast-retry a timeout, and key retries by `order_id` so a duplicate is a no-op. Harden `order-svc`'s `orders.inventory.check` call. NatsFlow `requestRetryAnimated`. | stateIn: a bare `request()` from Core NATS. → stateOut: a request call that distinguishes "responder absent" from "responder slow" and retries safely. | The `_INBOX` mechanism itself → `/learn/core-nats/request-reply`; the Services framework → `/learn/services`. |
| 7 | `tls-and-auth` | (1) **consuming a credentials file** — point the client at the `order-svc` `.creds` and let it authenticate; (2) **trusting a CA and the TLS handshake** — supply the cluster CA so the client validates the server cert, plus a one-line note on mTLS (client cert). Connect `order-svc` securely. NatsFlow `tlsAuthHandshakeAnimated`. | stateIn: a plaintext, unauthenticated connection. → stateOut: a connection that presents `order-svc` creds over a CA-validated TLS link. | How creds and the CA are *created* → `/learn/security`; account/permission design → `/learn/security`. |
| 8 | `where-next` | Navigation + recap: the connection lifecycle is one state machine, and every page added one fault it survives. Production checklist collecting every page's Pitfalls. Pointers to Topologies (why servers move), JetStream acknowledgment (consumer position), Security (issuing creds), Monitoring, Services, Reference. | stateIn: a fully hardened `order-svc` + subscribers + consumers. → stateOut: a map of what's beyond the client. | — |

Per-page NEW-concept count is two or fewer; the third mechanism on each page
(keepalive on page 3, server lame-duck detail on page 4, server write-deadline
on page 5, the Services framework on page 6, mTLS depth on page 7) is a single
linked line, not a taught section.

---

## 8. Research domains / fact pack (verified — fold into the pages)

Source of truth: `nats.go` (Options struct, Status enum, error constants —
verified live: Status `DRAINING_SUBS`/`DRAINING_PUBS` at lines 194–195,
`ErrConnectionDraining`/`ErrDrainTimeout` at 103–104, `ErrNoResponders` + the
`noResponders` 503 status header), cross-checked against `nats.js`, `nats.py`,
`nats.rs`, and `nats-server` (lame-duck, slow-consumer write deadline,
`max_payload`). Canonical examples sweep: nats-by-example.

### RC_CONNECT — connecting (page 2)
- Client receives a **server pool** of URLs (`nats://host:port`,
  comma-separated, randomized by default unless `NoRandomize`). Multiple URLs
  give failover at connect time; DNS resolution blocks the initial connect up to
  the connect **Timeout** (default 2s) before the next URL is tried.
- **Connect handshake on the wire:** TCP/WS dial → server sends **INFO**
  (`server_id`, `max_payload`, `auth_required`, `tls_required`, `proto`,
  `ldm`/lame-duck) → client sends **CONNECT** (name, auth, headers, no_responders
  support) → `+OK` or `-ERR`. After `+OK` the connection is CONNECTED.
- **Name the connection** (`Name("order-svc")` / equivalent) so it is
  identifiable in `nats server report connections`.
- Pitfalls: DNS blocking with no fallback (pass multiple URLs / IPs / raise
  Timeout); wrong auth credential *type* for the server → `AUTHORIZATION_ERR`;
  oversized message vs server `max_payload` (1 MB default) → publish fails before
  send.
- CLI: `nats sub`/`nats pub` accept `--server url1,url2` and `--connection-name`.
- Canonical examples: nats-by-example `connect-basic`,
  `connect-with-user-and-password`, `connect-with-token`.

### RC_RECONNECT — reconnection (page 3)
- **Disconnect detection:** read loop sees EOF/timeout, or a missed PING/PONG
  (PingInterval default 2m, MaxPingsOut default 2 → stale connection). The
  disconnect callback fires with the error (nil on an explicit close).
- **Backoff:** after exhausting every URL in the pool, wait `ReconnectWait`
  (default 2s) **+ jitter** (`ReconnectJitter` 100ms non-TLS / 1s TLS). Bounded
  by `MaxReconnect` (default 60; **negative = forever**). A custom delay
  callback can implement exponential backoff + circuit breaking.
- **State machine during reconnect:** status is RECONNECTING; subscriptions
  auto-resend SUB; publishes queue in the **reconnect buffer** (default 8 MB,
  `ReconnectBufSize`) and flush on success; a publish that overflows it fails
  with `ErrReconnectBufExceeded`.
- Server discovery: if a server's INFO advertises new cluster member URLs, the
  client appends them to its pool automatically.
- Pitfalls: `MaxReconnect` exhausted → connection CLOSED (set −1 for long-lived
  services, log via the reconnect-error callback); reconnect buffer overflow →
  back off publishing on `ErrReconnectBufExceeded`; a zero-delay custom backoff
  spins CPU → always add jitter; a stale connection on an overloaded server may
  not be caught for 2m → lower PingInterval under load.
- CLI: cannot script the callbacks; demo by killing `nats-server` and watching
  the client log a reconnect. `nats server report connections` shows reconnects.
- Canonical examples: nats-by-example `reconnect-on-disconnect`.

### RC_DRAIN — drain & shutdown (page 4)
- **`Close()`**: closes the TCP socket immediately, abandons in-flight messages,
  sends no UNSUB. **`Drain()`**: enters DRAINING_SUBS, sends UNSUB for every
  subscription, refuses new publishes, waits for in-flight async handlers to
  finish, flushes pending publishes (DRAINING_PUBS), then closes.
- **Drain timeout** (`DrainTimeout`, default 30s): if drain does not finish in
  time, remaining queued messages are discarded and the connection closes;
  `ErrDrainTimeout` surfaces. A publish after `Drain()` returns
  `ErrConnectionDraining`.
- **Subscription-level drain** (`sub.Drain()`): wind down one subscription while
  the connection stays alive — e.g. stop one queue member.
- **Lame duck:** server INFO carries `ldm=true` when it begins a graceful
  shutdown; a client can stop publishing and proactively reconnect elsewhere.
- Pitfalls: publishing after `Drain()` (drain last, not first); drain timeout
  shorter than the slowest handler (size it to handler latency); a server in
  lame duck the client never checks (watch `ldm`); JetStream in-flight messages
  are not auto-handled by a core drain (ack them first →
  `/learn/jetstream/acknowledgment`).
- CLI: `nats sub`/`nats pub` honor SIGINT cleanly; `nats server ... --lame-duck`
  is a server-side op (plain bash block).
- Canonical examples: nats-by-example `connection-drain`.

### RC_SLOW — slow consumers (page 5)
- Async subscriptions buffer messages **in memory, unbounded by default**.
  `SetPendingLimits(msgLimit, bytesLimit)` caps the buffer; exceeding either
  limit **drops the message** and fires the async-error callback with
  `ErrSlowConsumer`. `PendingLimits()` / pending stats report the current state;
  the subscription status becomes `SubscriptionSlowConsumer`. The subscription
  stays active — new messages still arrive once the handler catches up.
- **Server-side slow consumer** is distinct: if the server cannot write to the
  client within its per-client write deadline, it closes the *whole connection*
  (surfaces as a disconnect with a read error). The server tracks a
  `SlowConsumers` metric.
- `max_payload` (server INFO, 1 MB default): the client refuses a publish over
  it with `ErrMaxPayload` before sending.
- Pitfalls: no pending limits = unbounded memory → always `SetPendingLimits` +
  set the async-error callback; limits too tight on a high-rate subject → size
  to handler latency × rate; a nil error callback hides dropped messages →
  always set it; confusing local drop (high async-error rate) with server-side
  disconnect (read error) → tune them separately.
- CLI: demo the *server-side* case with `nats sub` against a flood; the local
  limit is a client API (use the div, CLI tab shows the flood).
- Canonical examples: nats-by-example `slow-consumer`.

### RC_REQREPLY — request-reply resilience (page 6)
- `request(subject, data, timeout)` returns one of: a reply, `ErrTimeout`
  (deadline hit, responder may be up but slow), or `ErrNoResponders` (server
  signals **503 no-responders** because no subscription/queue member exists —
  requires server proto 1+ and headers).
- The modern request uses a single muxed `_INBOX` subscription and routes
  replies by token; the `_INBOX` mechanism itself is Core NATS
  (`/learn/core-nats/request-reply`) — this page assumes it.
- **Retry strategy:** `ErrNoResponders` → exponential backoff (the responder may
  be starting); `ErrTimeout` → fast retry (responder is up, just slow). Always
  bound retries (e.g. 5 attempts) and add jitter. Make retries **idempotent** by
  keying on `order_id` so the `inventory` responder can de-dupe a re-sent
  request.
- A request in flight when the connection drops is lost (no persistence); the
  inbox re-subscribes on reconnect so a retry works.
- Pitfalls: timeout shorter than the responder's p99 (measure, set 2–3×);
  treating `ErrNoResponders` and `ErrTimeout` the same (handle separately);
  request lost on reconnect (idempotent IDs + responder cache); unbounded retry
  loop (cap + jitter).
- CLI: `nats request orders.inventory.check '<payload>' --timeout 2s`;
  `nats reply orders.inventory.check '<reply>'` for the responder. No-responders
  is visible: request a subject with no responder and the CLI prints the 503.
- Canonical examples: nats-by-example `request-reply`.

### RC_TLSAUTH — TLS & auth (page 7)
- **Credentials file (`.creds`)**: holds a user JWT and an nkey seed; the client
  loads it (`--creds` / `credsFile` / `UserCredentials`) and signs the server's
  nonce automatically. This chapter **consumes** the `order-svc` creds from the
  Security chapter; it never issues them.
- **TLS:** supply the cluster **CA certificate** so the client validates the
  server's cert (`--tlsca` / a root-CA option). With a verified CA the link is
  encrypted and the server is authenticated. **mTLS** (one line): the client may
  also present its own cert+key for the server to validate.
- Auth failures arrive as `-ERR` → `ErrAuthorization`, `ErrAuthExpired`,
  `ErrAuthRevoked`, `ErrPermissionViolation`, `ErrMaxConnectionsExceeded`; on a
  reconnect they surface via the disconnect/error callback.
- Pitfalls: hardcoding credentials in source (load from a file/env, never
  commit `.creds`); an unmonitored JWT expiry breaking reconnect (refresh before
  expiry / monitor the auth-error rate); insecure TLS (skip-verify) in
  production (always supply a CA); a creds-file rotation race mid-connection
  (reload via a fresh connection + drain the old).
- CLI: `nats sub orders.> --creds order-svc.creds --tlsca ca.pem`.
- Canonical examples: nats-by-example connect-with-creds / TLS examples; client
  TLS test suites for cross-language parity.

### RC_RESOURCES — examples sweep
Sweep nats-by-example and the nats-io client repos for canonical
connect/reconnect/drain/slow-consumer/request-retry/creds examples. Return real
URLs + what each shows + which slug it supports. Do not invent URLs.

### Cross-language API parity (fold into tabs)
`AllowReconnect`, `MaxReconnect`, `ReconnectWait`, `ReconnectJitter`,
`PingInterval`, `MaxPingsOut`, `SetPendingLimits`, async-error callback,
`request`, `drain`, credentials-file loader, and CA/TLS config all exist in
nats.go / nats.js / nats.py / nats.java / nats.rs / nats.net — name the local
spelling per tab; the concept is identical.

---

## 9. Acceptance criteria

Chapter-wide:

- [ ] All 8 `/learn/resilient-clients/*` URLs return 200 and render.
- [ ] Every embedded `data-scenario` is one of the six NEW names in §6.1 — no
      fabricated names; `index`/`where-next` carry none.
- [ ] `npm run typecheck` and `npm run build` pass; no broken internal links.
- [ ] Every internal link resolves against the §5.5 allow-list — no invented
      paths (esp. no `/concepts/resilient-clients`, no `/reference/clients/...`).
- [ ] Wording lockfile (§5.2) holds; boundary lockfile (§5.3) holds — grep finds
      no JetStream-ack, cluster-internal, or auth-issuance vocabulary used as if
      it were this chapter's job.

Per page:

- [ ] ≤2 NEW concepts; one `## See also` block (≤3 links from §5.5).
- [ ] Service names / payload / subjects match §4 exactly (`order-svc`,
      `warehouse`, `notifications`, `analytics`, `inventory`, `orders.created`,
      `orders.inventory.check`, the `ord_8w2k` payload).
- [ ] `## Pitfalls` present on every content page, BEFORE `## Where you are`,
      with 2–4 do/don't gotchas and one runnable handling example.
- [ ] `where-next` carries a `## Production checklist` collecting every page's
      Pitfalls action items, grouped per page with a link to that page's
      `#pitfalls`.
- [ ] 150–400 source lines (`index`/`where-next` may run longer).
- [ ] Every `nats-example` div has a matching committed CLI `.sh`; `data-type`
      equals the dash-joined path; CLI is the default tab where Tabs appear.
- [ ] No leaked tool-call tags (`</content>`, `</invoke>`, `</parameter>`) in any
      file.

---

## 10. Out of scope

- Cluster/topology mechanics, JetStream ack semantics, auth/TLS *creation*,
  the Services framework, server-side monitoring — all linked, none taught.
- Versioned Learn content; translation; search tuning.
- A `/concepts/resilient-clients` primer or a `/reference/clients` section
  (neither exists; do not link them).
- Auto-generation — every page is hand-written prose; only embedded code comes
  from the `nats-example` pipeline.
