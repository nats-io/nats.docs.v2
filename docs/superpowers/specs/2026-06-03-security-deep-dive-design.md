# Security Deep Dive — Design Spec

**Date:** 2026-06-03
**Status:** Draft for implementation
**Audience for this spec:** the writer (Claude or human) of each page

---

## 1. Goal

Land the **Security** deep dive in the NATS "Learn" section — the Operate-half
sibling of the JetStream chapter. It is the long-form, Rust-book-style chapter
that teaches NATS security end to end: multitenancy, authentication
(centralized *and* decentralized), authorization, cross-account sharing,
encryption, and auth callouts.

It sits between the short **Core Concepts → Security** primer
(`docs/concepts/security.md`) and the **Reference**. Concepts is the
five-minute overview; this chapter is the runnable walkthrough.

### 1.1 Problems we are fixing

The legacy `nats.docs` security content — especially the **"JWT Deep Dive"** —
has recurring problems we must not reproduce:

1. **The JWT page is a wall.** It crams the trust-chain *concept* and the `nsc`
   *tooling* into one dense page. We split them: one page for the mental model
   (`decentralized-auth`), one for the hands-on tool (`operator-mode`).
2. **Outdated/confusing details** stated as current. Treat legacy prose as a
   *hint*, never a source of truth. Verify every flag/field against
   `nats-server`, `nsc`, `natscli`, the `jwt` library, and the ADRs.
3. **Inconsistent naming** — account vs namespace, nkey vs key pair, creds vs
   cert. Fixed by the wording lockfile (§5.2).
4. **Premature depth** — full TLS cipher matrices and every JWT claim on first
   encounter. Push exhaustive tables to Reference / link out.

### 1.2 Non-goals

- Not teaching JetStream, KV, Object Store (siblings, already/soon written).
- Not cluster/leaf/gateway *operations* beyond "how TLS + auth apply to each
  connection type" — operations live in the Clustering / Deployment chapters.
- Not version-conditional content. The deep dive is **unversioned**. Version-
  bound behavior (e.g. message-TTL-style "2.11+") is stated inline as a one-
  liner and otherwise linked out.
- Not exhaustive reference. No full option tables; link or defer.

---

## 2. Decisions (resolved with the requester)

| Topic | Decision |
|---|---|
| Decentralized depth | **Split into two pages**: `decentralized-auth` (trust-chain concept) + `operator-mode` (nsc hands-on). Requires one new sidebar entry. |
| Visuals | **Three new animated NatsFlow scenarios**: `centralizedAuthAnimated`, `decentralizedAuthAnimated`, `authCalloutAnimated`. |
| Running scenario | **Reuse the JetStream `ORDERS` / acme-co world.** Secure the same order platform. |
| Reader assumption | Has read Core Concepts (incl. Security primer) and ideally the JetStream deep dive. No re-teaching pub/sub, subjects, streams. |
| Versioning | Unversioned, concepts only. |

---

## 3. Files & sidebar plumbing

Pages live under `learn/security/` (served at `/learn/security`). The sidebar
is `sidebars-learn.ts` (hand-authored). One **new** page — `decentralized-auth`
— is inserted between `authentication-basics` and `operator-mode`.

```
learn/security/
  index.md                       # 0 — chapter intro
  accounts-and-multitenancy.md   # 1
  authentication-basics.md       # 2 — CENTRALIZED (config) auth
  decentralized-auth.md          # 3 — NEW: trust-chain concept
  operator-mode.md               # 4 — nsc hands-on
  authorization.md               # 5
  cross-account.md               # 6
  encryption.md                  # 7 — TLS (+ at-rest)
  auth-callout.md                # 8
  where-next.md                  # 9
```

### 3.1 Cross-link from Core Concepts

`docs/concepts/security.md` gains a `:::tip` admonition near the top pointing to
`/learn/security`. No content is moved; duplication of the high-level framing is
intentional.

### 3.2 URL stability

`/learn/security/<page>` URLs are part of the spec. Renaming after ship is a
breaking link change.

---

## 4. Master scenario (pinned — identical across every page and language)

**Acme** runs NATS for the order platform from the JetStream chapter. The
canonical message shape is unchanged from JetStream:

```json
{
  "order_id": "ord_8w2k",
  "customer": "acme-co",
  "total_cents": 4200,
  "ts": "2026-05-22T10:14:22Z"
}
```

Pinned entities (same names, every page):

| Entity | Name | Role |
|---|---|---|
| Account (tenant) | `ORDERS` | The order service's tenant; publishes `orders.created`, `orders.shipped`, `orders.cancelled`. |
| Account (tenant) | `ANALYTICS` | Read-only tenant; consumes `orders.shipped` only. |
| User | `order-svc` | In `ORDERS`; publishes to `orders.>`. |
| User | `analytics-reader` | In `ANALYTICS`; subscribes to the imported `orders.shipped`. |
| Cross-account | `ORDERS` **exports** stream `orders.shipped` → `ANALYTICS` **imports** it. |
| Operator (decentralized) | `ACME` | Root of trust when the chapter rebuilds the same two accounts under operator mode. |
| Auth service (callout) | `auth-svc` | External service in its own account that maps a token → a user in `ORDERS`. |

Rules: no page invents a different payload, account, or user name. Carry CLI
session state forward (do not silently reset the server config between pages —
state each transition explicitly, the way the JetStream chapter does).

---

## 5. Voice & wording rules

### 5.1 Voice (same hard rules as the JetStream chapter)

- **One teaching thought per paragraph.** Two ideas joined by "and" → split.
- **Define-then-use.** Never use a term before its own paragraph in this or a
  prior page.
- **≤2 new concepts per page.** A third goes to a later page or to Reference.
- **Active voice, present tense. No filler** ("it is important to note",
  "basically", "essentially", "simply").
- **Length 150–400 source lines.** Hard cap 400; `index` and `where-next` may be
  80+.

### 5.2 Wording lockfile (same word for same thing; NEVER the banned terms)

| Term | Use | Don't use |
|---|---|---|
| account | "account" (the tenant) | "namespace", "org", "realm", "tenant-space" |
| user | "user" (the auth identity) | "principal", "login" |
| client | the connecting application | conflating it with "user" |
| operator | "operator" (root of trust) | "issuer" (reserve "issuer" for the JWT field) |
| nkey | "nkey" (lowercase) | "key pair", "NATS key", "Nkey", "NKEY" |
| JWT | "JWT" (after first "JSON Web Token (JWT)") | "token" for a JWT (reserve "token" for the password-style token credential) |
| credentials | "credentials" / "creds file" / `.creds` | "cert" / "key file" for creds |
| permissions | "permissions" | "ACL", "rules", "policy" |
| TLS | "TLS" | "SSL" |
| mTLS | "mutual TLS (mTLS)" then "mTLS" | "client TLS", "two-way TLS" |
| centralized auth | "centralized authentication" / "config-based" | "static auth", "basic auth" |
| decentralized auth | "decentralized authentication" | "JWT auth", "operator auth" (loosely) |
| export / import | cross-account sharing verbs | "share", "link", "connect" |
| auth callout | "auth callout" (two lowercase words) | "auth callback", "AuthCallout", "callout auth" |
| subject | "subject" (carry from JetStream) | "topic", "channel" |
| publish / subscribe | "publish" / "subscribe" | "send" / "listen" |

### 5.3 Reference handoff phrase (greppable, verbatim where applicable)

> The full set of `<X>` options is documented in
> [Reference → `<Path>`](/reference/...). We use only `<Y>` here.

Each page ends with a **"## See also"** section: 1–3 links, hard max 3.

### 5.4 VALID internal link targets (link allow-list)

The reference docs are auto-generated wire/API references and **have no security
section**. Do **not** invent `/reference/security/...`, `/reference/auth/...`,
or `/reference/tls/...` paths — they 404 and fail the build. Link only to:

- `/concepts/security`, `/concepts/jetstream`, `/concepts/subjects`,
  `/concepts/pub-sub-basics`, `/concepts/request-reply`,
  `/concepts/queue-groups`, `/concepts/topologies`, `/concepts/what-is-nats`
- sibling `/learn/security/<slug>` pages (see §3 list)
- `/learn/clustering`, `/learn/deployment/hardening`,
  `/learn/topologies/leaf-nodes`, `/learn/jetstream/surviving-node-loss`
- `/reference/` (root only) — safe as a generic pointer

When the natural handoff is "the exhaustive option table", point to
`/reference/` root or to the upstream concept page, not a fabricated path.

---

## 6. Example pattern (matches `CLAUDE.md`)

### 6.1 Default: `nats-example` tags + a committed CLI source file

For every non-trivial snippet:

```mdx
<div class="nats-example"
     data-type="learn-security-<page-slug>-<snippet>"
     data-languages="cli,js,go,python,java,rust,csharp"></div>
```

For each div, also author the CLI source so CLI renders today:

```
static/examples/snippets/cli/learn/security/<slug>/<snippet>.sh
```

The path dirs join with dashes to form the `data-type`:
`cli/learn/security/<slug>/<snippet>.sh` → `learn-security-<slug>-<snippet>`.
Verify this matches the div exactly. Each `.sh` starts with `#!/bin/bash`, uses
real `nats` / `nsc` / `nats-server` commands, and is committable.

### 6.2 When a plain fenced block is correct (not a div, not Tabs)

Security is **config-heavy**. Server config (`nats.conf`), `nsc` command
sequences, `nats-server` startup, and `nats <x> info` output are **CLI/config-
only** — use a plain fenced block with the right language tag (`conf` for config
files, `bash` for shell). These are not multi-language and get no `nats-example`
div. Reserve divs for snippets that genuinely have a client-library form
(connecting with creds, publishing under a user, request/reply across accounts).

### 6.3 Data shape is pinned

The ORDERS JSON shape from §4 is identical across every language. The account
and user names are identical across every page.

---

## 7. Reference handoff — what stays vs. what goes

| Belongs in Learn | Belongs in Reference / linked out |
|---|---|
| The *why* and *when* of each mechanism | Every config field's full type/range/default |
| One runnable happy path per concept | Exhaustive flag/claim/cipher tables |
| One annotated config or `nsc describe` output | Every JWT claim field, every error code |
| The one failure mode that teaches the concept | Every TLS cipher suite / curve |
| The pinned ORDERS/ACME scenario | Version-specific behavior |

Rule of thumb: if removing a detail would not change the reader's mental model,
it does not belong in Learn.

---

## 8. Visual aids (NatsFlow) — three NEW animated scenarios

All three are authored as animated React components (model them on
`src/components/NatsFlow/scenarios/jetStreamContrastAnimated.tsx` and
`jetStreamConsumersAnimated.tsx`). Available node `type`s: `publisher`,
`subscriber`, `service`, `server`. Edges use `type: "animated"` with
`data: { color, animated, label, delay, interval }`. Wrap in
`ReactFlowProvider`. Export `const <Name>Animated`.

Wiring a new scenario touches FIVE files (all must agree on the camelCase name):

1. `src/components/NatsFlow/scenarios/<name>Animated.tsx` — the component
2. `src/components/NatsFlow/scenarios/index.ts` — `export { <Name>Animated } ...`
3. `src/plugins/nats-flow/client-module.tsx` — add to `window.NatsFlow`
4. `src/types/global.d.ts` — add the component type
5. `static/js/nats-flow-loader.js` — add a `data-scenario === '<name>Animated'`
   special-case branch that renders the component

| Scenario | Page | What it shows |
|---|---|---|
| `centralizedAuthAnimated` | `authentication-basics` | Client connects with credentials → server checks them against its **config user list** → accept / reject. Toggle valid vs invalid creds. |
| `decentralizedAuthAnimated` | `decentralized-auth` | The trust chain: operator → signs account → signs user. Client presents a user JWT; the server verifies the signature chain up to the **one operator key it trusts** — no user list involved. |
| `authCalloutAnimated` | `auth-callout` | Client connects → server signs a request → publishes to `$SYS.REQ.USER.AUTH` → `auth-svc` validates and returns a **signed user JWT** → server admits the client. A true message flow. |

The embed in each page is:

```mdx
<div class="nats-flow" data-scenario="<name>Animated" data-width="600" data-height="380"></div>
```

---

## 9. Page-by-page outline

`stateIn`/`stateOut` track scenario/config state carried forward. ≤2 new
concepts each.

| # | Slug | Teaches (≤2 concepts) | Leaves reader with | Defers / links |
|---|---|---|---|---|
| 0 | `index` | The three pillars (authentication, authorization, encryption) + multitenancy as the frame. The chapter map. | A mental model: who you are (authn) · what you may do (authz) · is the wire safe (encryption), all scoped per account. | — |
| 1 | `accounts-and-multitenancy` | (1) an **account** is an isolated tenant with its own subject space; (2) the `$G` default account and the `$SYS` system account. Create `ORDERS` + `ANALYTICS`. | Why two accounts never see each other's traffic; where users live. | Account limits, system events → `/learn/monitoring`; system account detail → Reference root. |
| 2 | `authentication-basics` | (1) **centralized (config-based) authentication** — the server's config user list; (2) the credential types: user/password, token, nkey (bcrypt note). `order-svc` logs in. NatsFlow `centralizedAuthAnimated`. | When config auth is the right tool; the three credential styles. | TLS-cert auth → `encryption` page; decentralized → next page; full flag table → Reference root. |
| 3 | `decentralized-auth` | (1) the **trust chain** operator → account → user; (2) **nkeys** (Ed25519, prefixes O/A/U) sign **JWTs**, so the server trusts only the operator's public key — no user list. Concept only; nsc is next page. NatsFlow `decentralizedAuthAnimated`. **Cite ADR-14.** | Why decentralized auth scales to many tenants; what a JWT actually proves. | nsc commands → next page; every JWT claim → Reference root. |
| 4 | `operator-mode` | (1) the **nsc** workflow — create operator `ACME`, accounts `ORDERS`/`ANALYTICS`, user `order-svc`, generate a `.creds` file; (2) the **account resolver** that tells the server where to fetch account JWTs. Connect with creds. | A working operator-mode setup mirroring the config-mode one. | Resolver types (mem/url/full), scoped signing keys, JWT push/pull detail → Reference root / `/concepts/security`. |
| 5 | `authorization` | (1) **subject permissions** — publish/subscribe allow & deny lists with wildcards; (2) allow-list closes the rest; deny beats allow. Restrict `order-svc` to `orders.>`. Same model in config and JWT. | How to scope a user to exactly the subjects it needs. | Response permissions, import/export permissions → Reference root; subjects recap → `/concepts/subjects`. |
| 6 | `cross-account` | (1) **exports/imports** share subjects across account boundaries; (2) **stream export** (pub/sub) vs **service export** (request/reply). `ORDERS` exports `orders.shipped`; `ANALYTICS` imports it. | How two isolated tenants share exactly one subject, deliberately. | Activation tokens, private exports, subject transforms → Reference root. |
| 7 | `encryption` | (1) **TLS** secures each connection type independently (client, cluster, leafnode, gateway); (2) **mutual TLS (mTLS)** + cert→user mapping (`verify_and_map`) ties the cert identity to the user. One-line on **encryption at rest**. | Where TLS applies and how a client cert can *be* the identity. | Cipher suites, curve prefs, cert pinning → Reference root; at-rest detail → `/learn/jetstream/surviving-node-loss`; per-link TLS in topologies → `/learn/clustering`, `/learn/topologies/leaf-nodes`. |
| 8 | `auth-callout` | (1) **auth callout** delegates the authentication decision to an external NATS service via `$SYS.REQ.USER.AUTH`; (2) the signed request / signed user-JWT response, and running `auth-svc` in its own account. NatsFlow `authCalloutAnimated`. **Cite ADR-26.** | When to reach for callout (OIDC/LDAP/custom) and how the signing protects it. | xkey encryption, operator-mode callout binding, full request claim → Reference root; ADR-26. |
| 9 | `where-next` | Navigation. Recap: account (tenant) + user (identity) + permissions (authz) + TLS (wire) = the whole game. Pointers to siblings + Reference. May be 80+ lines. | A map of what's beyond this chapter. | — |

---

## 10. Research domains (Phase 1 — verified fact packs)

Each domain is one parallel research agent. Source of truth: `nats-server`,
`nsc`, `natscli`, `jwt`, `nkeys` repos via **nats-mcp**, plus the ADRs. Also
sweep **nats-io, synadia-io, synadia-labs, ConnectEverything** GitHub orgs and
**nats-by-example** via WebSearch for hidden, runnable examples.

| Key | Focus |
|---|---|
| `S_ACCOUNTS` | `accounts {}` config block, `$G` default, `$SYS` system account, `system_account`, `no_auth_user`, per-account user lists, subject isolation. nats-server field names. |
| `S_CENTRALIZED` | Config-based authn: `authorization {}`, user/password, `token`, `nkey`/`authorized_keys`, bcrypt (`mkpasswd`), account-scoped users. natscli + nats context. |
| `S_NKEYS_JWT` | nkeys: Ed25519, key prefixes (O/A/U/X), seeds. JWT claims structure (`jwt` repo), scoped signing keys, ADR-14. What a user/account/operator JWT contains. |
| `S_NSC` | `nsc`: add operator/account/user, edit, `generate creds`, push/pull, `nsc env`, resolvers (mem/url/full, `nats-resolver`). Exact command spellings. Synadia nsc docs. |
| `S_AUTHZ` | Permissions: `permissions { publish/subscribe { allow/deny } }`, `allow_responses`, wildcards, defaults, deny-beats-allow precedence. nats-server. |
| `S_CROSSACCT` | `exports`/`imports`: stream vs service exports, `accounts { X { exports/imports } }`, activation tokens, public/private, subject mapping/transforms. nats-server. |
| `S_TLS` | `tls {}` per connection (client, `cluster`, `leafnodes`, `gateway`, `websocket`): `ca_file`/`cert_file`/`key_file`, `verify`, `verify_and_map`, `cipher_suites`, `curve_preferences`, `pinned_certs`, `insecure`. mTLS cert→user (RFC2253 DN) mapping. |
| `S_REST` | Encryption at rest: JetStream `--encryption` / config key, ciphers AES vs ChaCha20-Poly1305, where the key lives. |
| `S_CALLOUT` | ADR-26 in full: `authorization { auth_callout { issuer, auth_users, account, xkey } }`, `$SYS.REQ.USER.AUTH`, operator-mode callout, request/response JWT shape, xkey encryption. Synadia auth-callout examples, nats-by-example. |
| `S_RESOURCES` | Hidden-examples sweep across nats-io / synadia-io / synadia-labs / ConnectEverything + nats-by-example: auth-callout services, nsc tutorials, decentralized-auth blog posts, sample configs. WebSearch-heavy; return runnable links + what each shows. |

---

## 11. Acceptance criteria

Chapter-wide:

- [ ] All 10 `/learn/security/*` URLs return 200 and render.
- [ ] Sidebar shows the 10 pages in order, with `decentralized-auth` inserted.
- [ ] Three new NatsFlow scenarios render where embedded (5-file wiring correct).
- [ ] `npm run typecheck` and `npm run build` pass; **no broken internal links**
      (no fabricated `/reference/security/...`).
- [ ] `docs/concepts/security.md` carries the `/learn/security` cross-link.
- [ ] Wording lockfile (§5.2) holds — grep returns no banned terms.

Per page:

- [ ] ≤2 new concepts; one "See also" block (≤3 links from the §5.4 allow-list).
- [ ] Scenario names/payload match §4 exactly.
- [ ] 150–400 lines (`index`/`where-next` may be 80+).
- [ ] Every `nats-example` div has a matching committed CLI `.sh`; the
      `data-type` matches the file path; CLI default tab where Tabs are used.
- [ ] `decentralized-auth` cites ADR-14; `auth-callout` cites ADR-26.

---

## 12. Out of scope

- KV / Object Store / JetStream chapters (siblings).
- Cluster/leaf/gateway operations depth (Clustering / Deployment chapters).
- Versioned Learn content; translation; search tuning.
- Auto-generation — every page is hand-written prose; only embedded code comes
  from the `nats-example` pipeline.
</content>
</invoke>
