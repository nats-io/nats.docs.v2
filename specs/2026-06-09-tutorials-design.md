# Tutorials — Design Spec

**Date:** 2026-06-09
**Status:** Draft for implementation
**Audience for this spec:** the writer (Claude or human) of each tutorial

---

## 1. Goal

Add the **Tutorials** section — the learning-oriented quadrant the docs are
missing. The navbar + footer already point to `/tutorials/` (a `tutorials` docs
instance, `tutorialsSidebar`); this spec fills it.

A **tutorial** takes a newcomer by the hand and guarantees a small, complete,
working result. It is NOT the deep dive. The contrast (Diataxis):

| | Tutorial (this section) | Deep dive (`/learn/*`) |
|---|---|---|
| Reader | brand new; "show me it works" | wants to understand and use well |
| Promise | guaranteed success following the steps | understanding + judgment |
| Explanation | MINIMAL — only enough to proceed; defer the *why* | rich: mechanisms, trade-offs |
| Scope | one small result, ~10–20 min | a whole subsystem, page by page |
| Errors/pitfalls | AVOIDED — one clean happy path | covered (Pitfalls, Production checklist) |
| Shape | numbered steps + "you should see X" | concept H2s → Pitfalls → where-you-are |
| Ending | "it works! now understand it → deep dive" | "go deeper / siblings" |

Hard rule: a tutorial never lectures. If a paragraph explains *why* rather than
telling the reader what to do next, cut it or replace it with a one-line link to
the deep dive. No pitfalls, no trade-offs, no "it depends."

## 2. Decisions

| Topic | Decision |
|---|---|
| Home | New `tutorials` docs instance, `routeBasePath: tutorials`, `sidebars-tutorials.ts` (key `tutorialsSidebar`). Already wired in `docusaurus.config.ts` + navbar. |
| Continuity | Each tutorial is SELF-CONTAINED. No shared running-scenario narrative (that is the deep dives). Use the simplest concrete example per tutorial (greetings, tasks, a counter). |
| Examples | `nats-example` divs (CLI default tab + client tabs) for app steps; plain fenced `bash` for install / `nats-server` start / "two terminals" demos. |
| Visuals | REUSE existing NatsFlow scenarios where a flow helps (no new components). |
| Versioning | Unversioned; link out to versioned Reference. |
| Relationship to Getting Started | `docs/concepts/getting-started` stays; "Hello NATS" is the canonical install+first-message tutorial and may supersede it over time. Do not delete getting-started. |

## 3. Files & plumbing

Pages live under `tutorials/` (served at `/tutorials`). `sidebars-tutorials.ts`
already lists all 8 — no sidebar edit:

```
tutorials/
  index.md            # 0 — landing / learning path
  hello-nats.md       # 1 — install + pub/sub
  request-reply.md    # 2 — a responder + a request
  work-queue.md       # 3 — queue group across workers
  first-stream.md     # 4 — first JetStream stream + replay
  stream-consumer.md  # 5 — durable consumer + ack
  key-value.md        # 6 — KV put/get/watch
  build-an-app.md     # 7 — capstone: combine the above
```

CLI snippets: `static/examples/snippets/cli/tutorials/<slug>/<snippet>.sh`
(`#!/bin/bash`, real commands). The dirs dash-join to the `data-type`:
`tutorials-<slug>-<snippet>`. Commit every `.sh`.

## 4. Voice & wording rules

- Imperative, second person, present tense: "Run this." "Open a second terminal."
- Every action step pairs a command with its **expected result**: "You should
  see `Hello NATS!` printed." A tutorial the reader can't self-verify is broken.
- ≤1 new idea introduced per step, and only as much as the step needs.
- No pitfalls / edge cases / "in production you'd…" — link the deep dive instead.
- Reuse the project wording lockfile (subject, publish/subscribe, message, stream,
  consumer, etc.) — same terms as the deep dives so a reader graduating to a deep
  dive sees no vocabulary shift.
- Length 80–220 source lines. `index` may differ.

### 4.1 Page skeleton (content tutorials)

1. Frontmatter: `id`, numbered `title`, `sidebar_position`, `description`.
2. One-paragraph intro: what you'll build + the end result, in plain terms.
3. **"What you'll need"** — prerequisites (server installed, `nats` CLI; the
   prior tutorial if it builds on one). Keep it to bullets.
4. **Numbered steps** (`## Step 1: …`). Each: a short instruction, a command
   (`nats-example` div or fenced bash), and "you should see …".
5. **"What you built"** — one short recap of the working result.
6. **"Next"** — link to the next tutorial AND to the matching Learn deep dive
   for the *why* (e.g. "Now understand how this works: [JetStream deep dive]").

### 4.2 index skeleton

Intro (what tutorials are, how they differ from Learn/Concepts) → an ordered
"Start here" path listing all 7 tutorials with a one-line outcome each → a short
"Already comfortable? jump to the [Learn deep dives](/learn/)" pointer.

### 4.3 VALID internal link targets (allow-list)

- `/tutorials/<slug>` (real slugs above)
- `/learn/<chapter>` and the specific deep-dive pages a tutorial hands off to
  (`/learn/core-nats`, `/learn/core-nats/request-reply`, `/learn/core-nats/queue-groups`,
  `/learn/jetstream`, `/learn/jetstream/your-first-stream`, `/learn/jetstream/your-first-consumer`,
  `/learn/key-value`, `/learn/services`, `/learn/resilient-clients`)
- `/concepts/intro`, `/concepts/getting-started`, `/concepts/jetstream`, `/concepts/pub-sub-basics`
- `/reference/` (root) and verified deep reference paths only
- External: `https://natsbyexample.com` is allowed (it is the canonical examples site)

Do NOT invent paths.

## 5. NatsFlow reuse (no new components)

| Tutorial | Reuse `data-scenario` |
|---|---|
| hello-nats | `publishSubscribeAnimated` |
| request-reply | `requestReply` |
| work-queue | `queueGroupAnimated` |
| first-stream / stream-consumer | `jetStreamConsumersAnimated` (or `jetStreamContrastAnimated` on first-stream) |
| key-value | `kvWatchAnimated` |

Embed `<div class="nats-flow" data-scenario="<name>" data-width="600" data-height="350"></div>`.
Only one per tutorial, and only where the flow genuinely helps a beginner.

## 6. Per-tutorial outline

| # | Slug | You build | Steps (happy path) | Hands off to |
|---|---|---|---|---|
| 0 | `index` | — (the path) | — | all |
| 1 | `hello-nats` | a server + your first pub/sub | install nats-server + `nats` CLI; start the server; `nats sub greet`; `nats pub greet "Hello NATS!"`; see it arrive; then the same in a client (tabs) | `/learn/core-nats`, `/concepts/pub-sub-basics` |
| 2 | `request-reply` | a responder you call | start a responder (`nats reply time "…"` or a client service); call it (`nats req time ""`); see the reply; note the no-responders case in ONE line (not a pitfall) | `/learn/core-nats/request-reply`, `/learn/services` |
| 3 | `work-queue` | work split across 2 workers | start two queue subscribers (`nats sub jobs --queue workers`) in two terminals; publish several `jobs`; watch each message go to exactly one worker | `/learn/core-nats/queue-groups` |
| 4 | `first-stream` | a stream that keeps messages | `nats-server -js`; `nats stream add`; publish a few; `nats stream view` / replay with a consumer; show messages survive | `/learn/jetstream`, `/learn/jetstream/your-first-stream` |
| 5 | `stream-consumer` | a durable reader that acks | `nats consumer add` durable; `nats consumer next` to pull + ack; stop and restart, resume where you left off | `/learn/jetstream/your-first-consumer` |
| 6 | `key-value` | a tiny state store | `nats kv add`; `put`/`get`; `nats kv watch` in a second terminal; update and see the watcher fire | `/learn/key-value` |
| 7 | `build-an-app` | a small app combining pub/sub + request/reply + a stream | a short, runnable client program (one language, with tabs) that connects, publishes events to a stream, and answers a request; run it and see the result | `/learn/*` (the relevant chapters) |

Each content tutorial: 3–6 steps, every step self-verifiable.

## 7. Research sources (Phase 1)

For each tutorial, ground commands + client code in real, current sources:

- **NATS by Example** — `https://natsbyexample.com` (the matching messaging /
  jetstream / kv example; mirror its happy path and idioms). Cite the example.
- **Client repos** (nats.go, nats.js, nats.py, nats.net, nats.rs, nats.java) —
  the example dirs / READMEs for the connect + pub/sub/request/consumer idiom in
  each language (cross-check ≥2 languages per code snippet).
- **nats-server / natscli** — exact `nats` CLI subcommands + flags, and
  `nats-server` / `nats-server -js` startup.
- **NATS blog** (`https://nats.io/blog` / `https://blog.nats.io`) — intro /
  getting-started posts for tone and any canonical first-app walkthrough.
- The existing `docs/concepts/getting-started` page (install instructions).

Verify every command runs and every "you should see" output is accurate.

## 8. Acceptance criteria

- [ ] All 8 `/tutorials/*` URLs render; navbar "Tutorials" + footer link resolve.
- [ ] `npm run build` passes; no broken internal links; `npm run typecheck` clean.
- [ ] Every `nats-example` div has a committed CLI `.sh`; `data-type` dash-equals
      the path (`tutorials-<slug>-<snippet>`); CLI is the default tab.
- [ ] Every `data-scenario` is an existing wired scenario (§5) — no new components.
- [ ] Each content tutorial: numbered steps, each step self-verifiable
      ("you should see …"), a "What you built" recap, and a "Next" with a deep-dive
      handoff. NO pitfalls / trade-offs / production advice (that is the deep dives).
- [ ] Links only from the §4.3 allow-list. No leaked tool-call tags.

## 9. Out of scope

- Re-explaining mechanisms (interest graph, ack, retention, RAFT) — link the deep dive.
- Production hardening, security, clustering setup — deep dives / their own sections.
- New NatsFlow components. Versioned content. Per-language full quickstart pages
  (covered by tabs + NATS by Example).
