# Deployment & Upgrades Deep Dive — Design Spec

**Date:** 2026-06-05
**Status:** Draft for implementation
**Audience for this spec:** the writer (Claude or human) of each page

> ## ⚠️ CONTINUITY OVERRIDE — authoritative, supersedes any naming below
>
> This chapter deploys the **same physical cluster** as the done Topologies
> chapter. Use Topologies' exact names. Wherever this spec writes `n1`/`n2`/`n3`,
> the page MUST use **`n1-east`/`n2-east`/`n3-east`**; wherever it writes
> `orders-cluster`, the page MUST use the cluster name **`east`**. Kubernetes
> StatefulSet pods **`nats-0`/`nats-1`/`nats-2`** map to
> **`n1-east`/`n2-east`/`n3-east`** (state this mapping once on the kubernetes
> page). This override wins over any conflicting names below.

---

## 1. Goal

Land the **Deployment & Upgrades** deep dive in the "Learn" section — the
Operate-half chapter that teaches how to take the Acme ORDERS cluster the
Topologies chapter designed and actually **run it in production**: size it,
deploy it on Kubernetes, manage its config without downtime, upgrade it
safely, and harden it.

It is the operational counterpart to Topologies. Topologies teaches the
*shapes* (single server → cluster → supercluster → leaf nodes). This chapter
teaches the *operations*: the resources a shape needs, the manifests that
stand it up, the SIGHUP that reloads it, the lame-duck dance that upgrades it,
and the systemd flags that lock it down.

### 1.1 The hard problem for this chapter: overlap with siblings

Deployment touches four sibling chapters and must not re-teach any of them. It
sits at the seam between *what the cluster is* (Topologies, Clustering) and
*what to watch once it runs* (Monitoring), and it shares the auth story with
Security. The deep dive earns its place by being the **runbook**, not the
theory:

- **Topologies** = what shape to deploy.
- **Clustering** = how Raft and replication work underneath.
- **Security** = the auth/account model.
- **Monitoring** = what to watch after it is live.
- **Deployment (this chapter)** = getting that shape **running, configured,
  and upgraded safely** — sizing, Helm, includes/SIGHUP, lame-duck upgrades,
  systemd/TLS hardening.

If a paragraph would be at home verbatim in Topologies, Clustering, Security,
or Monitoring, it is in the wrong chapter. Name the mechanism the operator
runs, give the command, and link the theory out.

### 1.2 Non-goals (the boundary — link, do not teach)

- **Cluster formation, Raft consensus, leader election, replication
  mechanics** → `/learn/clustering` (and its `raft-and-leaders`,
  `replication-and-r3` pages). This chapter *triggers* leadership transfer in
  an upgrade; it does not explain how Raft elects.
- **The auth model — operators, accounts, users, JWTs, permissions** →
  `/learn/security`. This chapter *mounts the creds and turns on TLS*; the
  model is taught there.
- **What metrics, advisories, and health endpoints to watch after deploy** →
  `/learn/monitoring`. This chapter *sets up* the cluster; monitoring watches
  it.
- **Which topology shape to choose** → `/learn/topologies`. This chapter
  assumes the 3-node ORDERS cluster shape is already decided.
- **Backup, snapshot, restore** → `/learn/backup-recovery`.
- Not version-conditional; unversioned, concepts only.

---

## 2. Decisions (resolved with the requester)

| Topic | Decision |
|---|---|
| Visuals | **Maximize animation.** Three NEW NatsFlow scenarios — one per page that carries a genuine control flow (kubernetes, config-management, rolling-upgrades). Pages that are pure config/sizing/systemd stay text + code. |
| Depth angle | **Runbook, not theory.** Real commands, real manifests, real systemd flags. Mechanism + the exact thing the operator runs. Link Topologies/Clustering/Security/Monitoring for the why. |
| Running scenario | **The Acme ORDERS cluster in production** — the 3-node cluster (n1/n2/n3) from Topologies, carrying the `ORDERS` stream from JetStream, secured by operator `ACME` from Security. |
| Reader assumption | Has read Topologies (knows the shapes) and skimmed JetStream + Security. Is an operator standing the cluster up for real. |
| Versioning | Unversioned, concepts only. The exact knob list lives in versioned Reference. |

---

## 3. Files & sidebar plumbing

Pages live under `learn/deployment/` (served at `/learn/deployment`). The
sidebar (`sidebars-learn.ts`) already lists all 7 pages in order, under the
**Operate** half, category label **"Deployment & Upgrades"** — **no sidebar
edit**:

```
learn/deployment/
  index.md                 # 1 — chapter intro (sidebar_position: 1)
  sizing-and-resources.md  # 2
  kubernetes.md            # 3
  config-management.md     # 4
  rolling-upgrades.md      # 5
  hardening.md             # 6
  where-next.md            # 7
```

The stub pages exist with title-only frontmatter (e.g. `title: "Sizing &
Resources"`); the writer replaces each stub wholesale with the full page,
adding `id`, `sidebar_position`, and `description` per the skeleton in §5.

### 3.1 No cross-link edits required

Topologies `where-next` already links `/learn/deployment`. No concept-page
edits are needed for this chapter. (Do **not** add new cross-links to concepts
— there is no `/concepts/deployment`.)

### 3.2 URL stability

`/learn/deployment/<page>` URLs are part of the spec.

---

## 4. Master scenario (pinned — the Acme ORDERS cluster, in production)

This is the SAME Acme order platform from every other Learn chapter, now run
for real. Topologies grew it from a single server to a 3-node cluster
(n1/n2/n3) to a supercluster to leaf nodes; JetStream gave it the `ORDERS`
stream; Security gave it operator `ACME` and accounts `ORDERS`/`ANALYTICS`.
This chapter **operates that cluster**. Same payload shape, byte-identical:

```json
{
  "order_id": "ord_8w2k",
  "customer": "acme-co",
  "total_cents": 4200,
  "ts": "2026-05-22T10:14:22Z"
}
```

Pinned entities (same names, every page — reuse, do not rename):

| Role | Name(s) | Used on page |
|---|---|---|
| Order subjects | `orders.created`, `orders.shipped`, `orders.cancelled` | all |
| Regional subjects | `orders.us.created`, `orders.eu.created` | sizing (subject volume), config (per-region includes) |
| Publisher | `order-svc` | all (the workload being sized/upgraded) |
| Subscriber services | `warehouse`, `notifications`, `analytics` | sizing, rolling-upgrades (reconnect) |
| Stream | `ORDERS` capturing `orders.>`, **R3**, file storage | all |
| Consumers | `shipping` pull consumer; `analytics` consumer filtering `orders.shipped` | kubernetes (CRDs), rolling-upgrades |
| Cluster nodes | `nats-0` / `nats-1` / `nats-2` (StatefulSet) ≡ n1/n2/n3 | kubernetes, config, rolling-upgrades, hardening |
| Operator / accounts | operator `ACME`; account `ORDERS` with user `order-svc`; account `ANALYTICS` with user `analytics-reader` | hardening (creds, TLS), config (per-account includes) |

Naming bridge: the Topologies chapter used `n1`/`n2`/`n3` for cluster nodes.
Kubernetes StatefulSet pods are `nats-0`/`nats-1`/`nats-2`. State this bridge
once on the `kubernetes` page ("the three pods `nats-0..2` are the same
`n1..n3` cluster you built in Topologies") and use the pod names consistently
thereafter, because lame-duck, PDB, and rolling-update language is
ordinal-based.

Rules: the cluster is the **3-node ORDERS cluster** throughout (R3 `ORDERS`
stream). No page redesigns the topology, re-creates accounts, or teaches
metrics. Carry the session forward: the reader sizes it (page 2), deploys it on
Kubernetes (page 3), edits its config live (page 4), upgrades it (page 5), and
hardens it (page 6). Never invent a different payload, node name, or service.

---

## 5. Voice & wording rules

### 5.1 Voice (same hard rules as the four done chapters)

- One teaching thought per paragraph. Two ideas joined by "and" → split.
- Define-then-use. Never use a term before its own paragraph.
- ≤2 new concepts per content page. A third goes to a later page or is linked
  out.
- Active voice, present tense. No filler, no hedging.
- Teach what matters; hand the exhaustive knob list to Reference with the
  greppable phrase (§5.3).
- Length 150–400 source lines per content page; `index`/`where-next` may run
  longer.

### 5.2 Content-page skeleton (every page 2–6)

Numbered title frontmatter (`id`, `title`, `sidebar_position`, `description`)
→ intro → concept `H2`s with embedded examples → **`## Pitfalls`** (2–4
concept-scoped gotchas, do/don't, one runnable handling example; insert
**before** `## Where you are`) → **`## Where you are`** → **`## What is
next`** → **`## See also`** (≤3 links).

`index` skeleton: frontmatter (`id: index`, `sidebar_position: 1`) → intro →
"By the end you will have" → "Who this is for" → "How to read it" → `## Map`
table linking every page → `## Prerequisites`.

`where-next` skeleton: recap "the whole game" → "Where the details live now" →
`## Sibling deep dives` → `## Where you are` → **`## Production checklist`**
(collects every page's Pitfalls action items, grouped per page with a link to
that page's `#pitfalls`) → `## See also`.

### 5.3 Wording lockfile (same word for same thing; NEVER the banned terms)

| Term | Use | Don't use |
|---|---|---|
| node / pod | "node" for a cluster member generally; "pod" only in Kubernetes context (`nats-0`) | "instance", "box", "machine" interchangeably |
| reload | "reload" (config applied via SIGHUP) | "refresh", "hot-swap", "restart" (restart means process restart) |
| restart | "restart" = stop and start the process | conflating with "reload" |
| lame-duck mode | "lame-duck mode"; the trigger is "enter lame-duck mode" | "drain mode" (drain is a client term), "graceful drain" |
| rolling upgrade | "rolling upgrade" | "rolling update" except for the literal K8s `kubectl rollout restart` |
| meta-leader | "meta-leader" = the metadata Raft leader; followers are "non-leaders" | "master", "primary", "main node" |
| Helm chart | "the NATS Helm chart" | "the chart" alone on first use |
| StatefulSet | "StatefulSet" (the K8s workload) | "deployment" (it is not a Deployment) |
| CRD | "CRD" (Custom Resource Definition); the controller is "the NACK controller" | "operator" (operator means the security operator `ACME` here) |
| controller | "the NACK controller" for the K8s controller | "operator" (reserved for `ACME`) |
| reloader | "the config reloader sidecar" | "watcher", "agent" |
| config include | "an include" / "include directive" | "import", "module" |
| file descriptor | "file descriptor (FD)" after first use | "handle", "fd" lowercased in prose |
| max payload | `max_payload` (the config key) | "message size limit" loosely |
| account limit | "account limit" (`MaxMemory`/`MaxStore` etc.) | "quota" loosely |
| TLS | "TLS"; client/cluster/gateway "TLS"; client-cert checking is "mTLS" | "SSL", "encryption" loosely for the transport |
| secret | "secret" (Kubernetes Secret or creds file) | "key" when you mean a credentials file |
| sizing | "sizing" the cluster | "capacity planning" as a synonym mid-page |
| replica | "replica" = a copy of a stream (R3 = 3 replicas); also a StatefulSet "replica" pod — disambiguate by context | "copy", "shard" |

**Boundary lockfile (critical) — banned cross-chapter vocabulary used as if
taught here:**

- Do NOT explain **Raft, quorum mechanics, leader election internals,
  log replication, peers, placement strategy** as concepts. You may *name*
  "the meta-leader" and "Raft leadership transfer" as the thing an upgrade
  triggers, then link `/learn/clustering`. Banned-as-taught: "how a leader is
  elected", "how R3 stays consistent", "what a peer is".
- Do NOT teach the **auth model**: creating operators, signing account JWTs,
  designing permissions, exports/imports. You *mount* creds and *turn on* TLS;
  link `/learn/security` for the model. Banned-as-taught: "how to create an
  account", "how operator mode works".
- Do NOT teach **what to monitor** — advisories, Prometheus, dashboards,
  health-metric interpretation. You may *reference* the `/healthz` probe and
  `nats server report` as operational checks, but the monitoring discipline is
  `/learn/monitoring`. Banned-as-taught: "set up alerts", "scrape with
  Prometheus", "watch consumer lag".
- Do NOT teach **JetStream consumer/ack semantics** or **topology shape
  choice** — both are prior chapters; link them.

### 5.4 Reference handoff phrase (greppable)

> The full set of server configuration options is documented in
> [Reference → Configuration](/reference/config). We only cover the keys this
> deployment needs here.

Variants per page (sizing → JetStream limits; config → reloadable keys;
hardening → TLS keys; rolling → lame-duck keys). Each page ends with a
**`## See also`** section: 1–3 links, hard max 3.

### 5.5 VALID internal link targets (allow-list)

Only paths in this list may be used. Do NOT invent paths outside it.

**Reference** (verified to resolve):
- `/reference/` (root)
- `/reference/config`
- `/reference/config/jetstream`
- `/reference/config/jetstream/max_file_store`
- `/reference/config/jetstream/max_memory_store`
- `/reference/config/jetstream/limits`
- `/reference/config/max_payload`
- `/reference/config/max_pending`
- `/reference/config/max_connections`
- `/reference/config/max_subscriptions`
- `/reference/config/max_control_line`
- `/reference/config/lame_duck_duration`
- `/reference/config/lame_duck_grace_period`
- `/reference/config/tls`
- `/reference/config/tls/verify`
- `/reference/config/tls/verify_and_map`
- `/reference/config/tls/pinned_certs`
- `/reference/config/tls/ca_file`
- `/reference/config/cluster`
- `/reference/config/accounts`
- `/reference/config/authorization`
- `/reference/config/no_auth_user`
- `/reference/config/operator`
- `/reference/config/pidfile`
- `/reference/config/http_port`

**Concepts** (existing only):
- `/concepts/topologies`, `/concepts/jetstream`, `/concepts/security`,
  `/concepts/what-is-nats`

**Learn — this chapter** (`/learn/deployment/<slug>`): `index`,
`sizing-and-resources`, `kubernetes`, `config-management`, `rolling-upgrades`,
`hardening`, `where-next` (plus `#pitfalls` anchors).

**Learn — siblings** (real slugs only):
- `/learn/topologies` (+ `/learn/topologies/your-first-cluster`,
  `/learn/topologies/jetstream-in-a-cluster`)
- `/learn/clustering` (+ `/learn/clustering/raft-and-leaders`,
  `/learn/clustering/replication-and-r3`)
- `/learn/security` (+ `/learn/security/encryption`,
  `/learn/security/operator-mode`)
- `/learn/monitoring` (+ `/learn/monitoring/monitoring-endpoints`,
  `/learn/monitoring/jetstream-health`)
- `/learn/jetstream` (+ `/learn/jetstream/surviving-node-loss`)
- `/learn/backup-recovery`

---

## 6. Example pattern (matches `CLAUDE.md`)

Deployment is config- and ops-heavy, so the snippet mix differs from Core
NATS:

- **`nats-example` div** for snippets that have a genuine multi-language form —
  the JetStream account/limit inspection, stream creation, request to a
  responder during an upgrade. Use:

  ```mdx
  <div class="nats-example"
       data-type="learn-deployment-<slug>-<snippet>"
       data-languages="cli,js,go,python,java,rust,csharp"></div>
  ```

  and author the matching CLI source
  `static/examples/snippets/cli/learn/deployment/<slug>/<snippet>.sh`
  (`#!/bin/bash`, real `nats` commands). The path dirs join with dashes to form
  the `data-type`; verify they match exactly.

- **Plain fenced blocks (no div)** — and these dominate this chapter — for:
  - Server config (`nats.conf`, include files) → fenced `conf`.
  - Helm `values.yaml` and NACK CRD manifests → fenced `yaml`.
  - systemd unit files → fenced `ini`.
  - CLI-only ops commands (`systemctl reload`, `kubectl rollout`,
    `nats-server -c x.conf -C`, `kill -SIGUSR2`) and "run it in two terminals"
    demos → fenced `bash`.

  These are server/operator commands and config, which `CLAUDE.md` exempts from
  the multi-language div.

- The pinned ORDERS payload, node names (`nats-0..2`), stream name (`ORDERS`),
  and account names are identical across every page and language.

### 6.1 Per-page snippet plan (data-type → CLI source path)

Each `data-type` below MUST have a committed CLI source at the mirrored path.

| Page | `data-type` | CLI source | Shows |
|---|---|---|---|
| sizing | `learn-deployment-sizing-and-resources-accountInfo` | `cli/learn/deployment/sizing-and-resources/accountInfo.sh` | `nats account info` — tier, `MaxMemory`/`MaxStore`/`MaxStreams` for account ORDERS |
| sizing | `learn-deployment-sizing-and-resources-serverInfo` | `cli/learn/deployment/sizing-and-resources/serverInfo.sh` | `nats server info` — `max_payload`, `max_connections`, JetStream limits |
| kubernetes | `learn-deployment-kubernetes-streamLs` | `cli/learn/deployment/kubernetes/streamLs.sh` | `nats stream ls` / `nats stream info ORDERS` from nats-box against the StatefulSet |
| config-management | `learn-deployment-config-management-validate` | `cli/learn/deployment/config-management/validate.sh` | `nats-server -c nats.conf -t` dry-run validate before reload (CLI-only; fenced bash is fine too, but a div lets it show the JS/Go "read varz" equivalent) — KEEP AS PLAIN BASH unless a multi-lang form is genuinely useful; default to plain bash here |
| rolling-upgrades | `learn-deployment-rolling-upgrades-streamReplicas` | `cli/learn/deployment/rolling-upgrades/streamReplicas.sh` | `nats stream info ORDERS` showing 3 replicas + leader before/after upgrade |
| rolling-upgrades | `learn-deployment-rolling-upgrades-requestDuringUpgrade` | `cli/learn/deployment/rolling-upgrades/requestDuringUpgrade.sh` | a request/response (e.g. publish `orders.created`, `nats sub`) that keeps working through an upgrade — demonstrates client reconnect transparency |
| hardening | `learn-deployment-hardening-credsConnect` | `cli/learn/deployment/hardening/credsConnect.sh` | connect with `--creds` + `--tlsca` and publish one order — proves auth + TLS are live |

Writer note: keep the div count modest. Most of this chapter is config and
ops, which are plain fenced blocks. Add a div only where a multi-language API
form genuinely teaches (account/server inspection, stream replica check,
authenticated publish). If a row above reads better as plain bash, drop the div
and the CLI source — but then it must not appear as a `nats-example`.

### 6.2 NatsFlow scenarios

**NEW scenarios to author (3)** — embed with
`<div class="nats-flow" data-scenario="<name>" data-width="600" data-height="350"></div>`:

1. **`crdReconcileAnimated`** — page `kubernetes`. Nodes: admin/kubectl, NACK
   controller, Kubernetes API (etcd), `nats-0..2` cluster. Animated edges:
   admin applies a `Stream` CRD (ORDERS, R3) → controller watches the CRD →
   controller calls the JetStream API on the cluster → cluster creates the R3
   stream across `nats-0..2` → controller writes `.status` back to the CRD. A
   second beat: someone deletes the stream by hand → controller detects drift →
   recreates it. Shows declarative, self-healing stream lifecycle.

2. **`configReloadAnimated`** — page `config-management`. Nodes: ConfigMap/
   config file, the config reloader sidecar, the `nats-server` process, cluster
   peers, a connected client (`order-svc`). Animated edges: config file changes
   → reloader detects change (inotify) → reloader sends SIGHUP to nats-server →
   nats-server reloads in place → client connection stays open (no reconnect) →
   peers see updated server info. Shows zero-downtime config reload.

3. **`lameDuckUpgradeAnimated`** — page `rolling-upgrades`. Nodes: Kubernetes/
   operator, `nats-0` (entering lame-duck), `nats-1`/`nats-2`, client
   (`warehouse`). Animated edges: operator signals SIGUSR2 to `nats-0` → `nats-0`
   broadcasts `INFO ldm:true` to its clients → `nats-0` transfers Raft
   leadership to `nats-1` → JetStream rebalances ORDERS replicas off `nats-0`
   → client reconnects to `nats-1` → `nats-0` restarts on the new version and
   rejoins as a non-leader. Shows graceful, in-order rolling upgrade. The
   "upgrade non-leaders first, meta-leader last" ordering is the visual payoff.

**Existing scenarios reused:** none. The remaining pages (`index`,
`sizing-and-resources`, `hardening`, `where-next`) carry no message/control
flow worth animating — sizing and hardening are config/limits, index and
where-next are navigation. Per `CLAUDE.md`, do not animate pure config,
API-syntax, or static architecture. (The `index` page may optionally re-embed
`lameDuckUpgradeAnimated` as a teaser, but no NEW scenario is needed for it.)

NEVER reference a `data-scenario` name not authored or in the reuse list — it
renders an error box.

---

## 7. Page-by-page outline

`stateIn`/`stateOut` track the running session. ≤2 new concepts each.

| # | Slug | Teaches (≤2 concepts) | stateIn → stateOut | Defers / links |
|---|---|---|---|---|
| 1 | `index` | What this chapter operates: the Acme ORDERS 3-node cluster (R3 `ORDERS` stream, operator `ACME`) taken to production. The five operational steps — size, deploy, configure, upgrade, harden — and the map. Frames the boundary: shapes are Topologies, Raft is Clustering, auth model is Security, watching is Monitoring. | stateIn: the ORDERS cluster designed in Topologies, secured in Security. stateOut: reader knows the runbook order and where each step lives. | Shapes → `/learn/topologies`; Raft → `/learn/clustering`; auth model → `/learn/security`; what to watch → `/learn/monitoring`. |
| 2 | `sizing-and-resources` | (1) the four resources a NATS node spends — **CPU, memory, disk, file descriptors** — and the JetStream defaults (mem 256 MB, store 1 TB) plus the FD math (2 FDs per stream; hardened systemd sets `LimitNOFILE=800000`); (2) **account limits and how replication counts against them** — `nats account info` shows `MaxMemory`/`MaxStore`; un-tiered R3 counts as `replicas × bytes`, tiered bakes it in. Connection/subscription/payload limits (`max_connections`, `max_subscriptions`, `max_payload ≤ max_pending`) as a one-paragraph survey linking Reference. | stateIn: cluster shape decided. stateOut: a sizing baseline for the ORDERS workload (R3 file stream fits the default 10 Gi PVC; `order-svc` ~128 Mi). | Full knob list → `/reference/config/jetstream`, `/reference/config/max_payload`. Storage durability of R3 → `/learn/jetstream/surviving-node-loss`. |
| 3 | `kubernetes` | (1) the **NATS Helm chart + StatefulSet** — `podManagementPolicy: Parallel`, headless service for stable DNS (`nats-0.nats…`), config via ConfigMap, and the three `/healthz` probes (startup/readiness/liveness); bridge `nats-0..2 ≡ n1..n3`; (2) the **NACK controller and Stream/Consumer CRDs** — declarative `Stream`/`Consumer` resources that the controller reconciles against the cluster (control-loop mode). NatsFlow `crdReconcileAnimated`. | stateIn: sizing baseline. stateOut: ORDERS cluster running as a 3-replica StatefulSet; `ORDERS` stream + `shipping`/`analytics` consumers declared as CRDs. | Helm value reference → `/reference/config`; cluster formation → `/learn/clustering/forming-a-cluster` (NOTE: not in allow-list → link `/learn/clustering` instead). Auth secrets covered on hardening. |
| 4 | `config-management` | (1) **config includes + live reload** — `include "file.conf"` (path relative to the main config's directory), the reloadable vs non-reloadable key split (reloadable: limits, TLS paths, accounts/perms, routes; NOT: `port`, `jetstream` enable, cluster name), and the SIGHUP / `systemctl reload` trigger validated before apply; (2) **secrets and validation** — credentials/TLS mounted as files (Kubernetes Secrets), `nats-server -c nats.conf -t` dry-run, and the reloader sidecar that turns a ConfigMap change into a SIGHUP. NatsFlow `configReloadAnimated`. | stateIn: cluster deployed. stateOut: ORDERS config split into per-account/per-region includes; reader can change limits/TLS with zero downtime. | Reloadable-key full list → `/reference/config`; the auth model behind the creds → `/learn/security`. |
| 5 | `rolling-upgrades` | (1) **lame-duck mode** — `SIGUSR2` (or the K8s preStop `-sl=ldm`) makes a node broadcast `INFO ldm:true`, stop accepting connections, transfer Raft leadership, flush JetStream, and kick clients in waves; `lame_duck_duration` (default 2 min) and `lame_duck_grace_period`; (2) **upgrade order** — upgrade non-leaders first, step the **meta-leader last**, and protect quorum with a PodDisruptionBudget (`minAvailable: 2`). NatsFlow `lameDuckUpgradeAnimated`. | stateIn: configurable cluster. stateOut: reader can roll a new server version through `nats-0..2` keeping the R3 ORDERS stream available and clients connected. | Why leadership transfer matters / how Raft re-elects → `/learn/clustering/raft-and-leaders`; R3 durability → `/learn/jetstream/surviving-node-loss`. |
| 6 | `hardening` | (1) **TLS everywhere** — client `tls { cert_file, key_file, ca_file }`, separate cluster TLS, mTLS via `verify`/`verify_and_map`, cert reload on SIGHUP, ties `/learn/security/encryption`; (2) **systemd + limits hardening** — the `nats-server-hardened.service` flags (`ProtectSystem=strict`, `LimitNOFILE=800000`, `MemoryDenyWriteExecute`, syscall filter) and locking down ports (4222/6222/7222 firewalled, monitor 8222 localhost-only). | stateIn: upgradable cluster. stateOut: ORDERS cluster runs with TLS on every link, `ACME` creds mounted, hardened service unit, monitor port closed. | The auth model (operator/accounts/JWTs) → `/learn/security/operator-mode`; cert lifecycle theory → `/learn/security/encryption`; what to scrape on 8222 → `/learn/monitoring/monitoring-endpoints`. |
| 7 | `where-next` | Navigation. Recap the runbook: size → deploy → configure → upgrade → harden, all on the one ORDERS cluster. Where details live (Reference). Sibling pointers (Topologies for shape, Clustering for Raft, Security for the auth model, Monitoring for what to watch, Backup for DR). **Production checklist** collecting every page's Pitfalls. May run 80+ lines. | stateIn: a sized, deployed, configured, upgradable, hardened ORDERS cluster. stateOut: a map of what is beyond running it. | — |

---

## 8. Research domains (Phase 1 — VERIFIED fact pack folded in)

Source of truth: `nats-server` (limits defaults, lame-duck/ADR-5, reload
mechanics, hardened systemd unit), the `nack` repo (controller modes, CRD
types, config reloader flags), the `k8s` Helm chart (StatefulSet, probes,
preStop, PDB, values), `natscli` (`nats account info`, `nats server
info/report`, `nats stream info`), and `/reference/config`. The facts below are
verified — fold them straight into the pages.

| Key | Verified facts to fold in |
|---|---|
| `D_SIZING` | JetStream defaults: memory **256 MB** (`JetStreamMaxMemDefault`, `server/jetstream.go:2680`), store **1 TB** (`JetStreamMaxStoreDefault`, `:2679`). **2 FDs per stream**; hardened unit `LimitNOFILE=800000` (`util/nats-server-hardened.service:31`). `max_payload` default **1 MB**, must be `≤ max_pending` (`server/server.go:1142-1144`). `max_connections` reloadable, default unlimited, immediate disconnect on overflow (`server/reload.go:556-592`). `max_subscriptions` per-connection default unlimited (`server/opts.go:418`). `max_control_line` default **1024 bytes**. Account limits via `nats account info` → `MaxMemory`/`MaxStore`/`MaxStreams`/`MaxConsumers`; **un-tiered R>1 counts as `Replicas × bytes`; tiered bakes replication into the limit** (`server/jetstream.go:2458-2476`). Client API: `js.AccountInfo()` → `JetStreamAccountLimits`. CPU has no hard limit — overprovision 20–30% for rebalance headroom. |
| `D_K8S` | Helm StatefulSet `podManagementPolicy: Parallel` (`files/stateful-set/stateful-set.yaml:18`), headless service → `nats-0.nats.default.svc.cluster.local`. Probes on monitor port 8222 (`files/stateful-set/nats-container.yaml:50-61`): startup 10s delay/10s period/90 failures (~900s boot window); readiness `/healthz?js-server-only=true`; liveness `/healthz?js-enabled-only=true`. **NACK**: API `v1beta2` (Stream/Consumer/Account/KeyValue/ObjectStore) vs legacy `v1beta1` (Stream/Consumer only); legacy mode default, `--control-loop` flag enables Account/KV/Object CRDs. `StreamSpec` fields: `name`, `subjects[]`, `storage`, `replicas`, `maxBytes`, `maxMsgs`, `maxAge`, `placement`, `mirror`, `sources[]` (`nack .../v1beta2/streamtypes.go:24-64`). Controller reverts manual mutations (~30s) — do not mix CLI + CRD management. Getting started + multi-account CRD examples: `nack/README.md:45-58, 89-144`. |
| `D_CONFIG` | Reload trigger **SIGHUP** (`util/nats-server.service:9` ExecReload → `systemctl reload`). `include "path.conf"` at any nesting, **relative to the config file's directory** (`conf/parse_test.go:382-590`). Reloadable: `max_connections`, `max_subscriptions`, `max_payload`, `max_control_line`, TLS cert/key paths, accounts/users/permissions, cluster/gateway routes, most JetStream limits, logging. NOT reloadable: `port`/`listen`, `jetstream` enable flag, cluster name. Reload validates new config first; on parse/`validateOptions()` failure the **old config stays active** (`server/server.go:1137-1150`). TLS certs re-read via `GetConfigForClient` on next handshake (`server/server.go:3050`). Dry-run validate: `nats-server -c config.conf -t`. K8s reloader sidecar (`nack/cmd/nats-server-config-reloader/main.go:61-70`): inotify or `--force-poll`, sends SIGHUP to PID from `/var/run/nats/nats.pid`, `--max-retries 30`, `--retry-wait-secs 4`. Helm includes the reloader by default (`values.yaml:371-392`). |
| `D_ROLLING` | Lame-duck = **ADR-5** (`nats-server/ADR-5.md`). Trigger `SIGUSR2` or `LameDuckShutdown()` (`server/server.go:4402-4450`). Flow: set `ldm=true` + broadcast `INFO ldm:true` → close client listener → `transferRaftLeaders()` (waits 1s) → shutdown JetStream → kick clients after `grace_period` then periodically until `duration`. `lame_duck_duration` default **2 min**, min **30s**; `lame_duck_grace_period` default **100 ms**, must be `< duration` (`server/server.go:1138-1140`). systemd: ExecStop sends SIGUSR2, `TimeoutStopSec = duration + buffer` (`util/nats-server.service`). K8s preStop: `nats-server -sl=ldm=/var/run/nats/nats.pid` (`files/stateful-set/nats-container.yaml:29-34`). **Upgrade order: non-leaders first, meta-leader last** (transferring leadership before killing avoids a leaderless window of 30–60s). PDB `minAvailable: 2` (`files/pod-disruption-budget.yaml`). Monitor with `nats server report` and `nats stream info ORDERS`. Cluster node rotation walkthrough: `nats-by-example/examples/operations/replace-cluster-nodes/shell/`. Go client auto-reconnects on the LDM advisory. |
| `D_HARDEN` | Hardened unit `util/nats-server-hardened.service`: `CapabilityBoundingSet=` (empty), `ProtectSystem=strict` + `ReadWritePaths=/var/lib/nats` (`:52,72`), `MemoryDenyWriteExecute=true`, `ProtectKernelTunables=true`, `PrivateUsers/PrivateIPC/RestrictNamespaces=true`, `SystemCallFilter=@system-service ~@privileged ~@resources`, `ProtectProc=invisible`, `PrivateDevices/ProtectClock/ProtectHostname=true`, `LimitNOFILE=800000` (`:31`), optional `MemoryMax=`/`GOMEMLIMIT`. TLS: client `tls { cert_file, key_file, [verify, verify_and_map, ca_file] }`; separate `cluster { tls {…} }`; `pinned_certs [sha256…]` (`server/opts.go:492`); mTLS `verify: true`, `verify_and_map: true`. Certs reload on SIGHUP. Ports: 4222 client, 6222 cluster, 7222 gateway, **8222 monitor (localhost-only in prod)**. Client API: `nats.RootCAs(pem)`, `nats.ClientCert(cert,key)`. Helm TLS template: `files/config/tls.yaml`. |
| `D_PITFALLS` | Folded into each page's `## Pitfalls` (§9). Pull the exact items from the fact pack's per-section pitfall lists. |
| `D_RESOURCES` | Canonical examples to cite (real paths): hardened systemd `util/nats-server-hardened.service`; NACK `README.md` install + CRD examples; Helm `values.yaml`, `files/stateful-set/nats-container.yaml`, `files/pod-disruption-budget.yaml`; ADR-5; nats-by-example `replace-cluster-nodes/shell/`. Do NOT invent URLs; these are repo paths the writer reproduces as config snippets, not external links. |

### 8.1 Pitfalls per page (fold these exact gotchas, do/don't + one runnable handling example)

- **sizing-and-resources** — (a) `max_store` set beyond real disk → JetStream
  errors on publish; test small (`maxSize: 10Gi`) and watch `df -h`. (b)
  `max_payload > max_pending` → server refuses to start; keep `max_pending ≥
  10× peak message size`. (c) FD exhaustion on big clusters (2 FDs/stream +
  gossip); set `ulimit -n 800000` before start. (d) JWT account limits not
  honored pre-v2.10 — upgrade operator-mode clusters atomically. Runnable
  handling: `nats account info` to read the live limits before sizing
  (`accountInfo` div).
- **kubernetes** — (a) PVC not bound before StatefulSet replica 0 → Pod
  Pending; use `volumeClaimTemplates` (Helm default). (b) ConfigMap edit does
  NOT reload without the reloader sidecar. (c) readiness probe flaps as
  not-ready during JetStream rebalance though the cluster is healthy — raise
  the readiness failure threshold. (d) control-loop CRDs revert manual `nats`
  CLI mutations in ~30s — never mix the two. Runnable handling: `nats stream
  info ORDERS` from nats-box to confirm the CRD-created stream is R3
  (`streamLs` div).
- **config-management** — (a) include path is relative to the **config file's**
  directory, not the cwd; use absolute paths. (b) SIGHUP during a rebalance can
  interrupt leadership transfer; fit it inside the graceful window. (c) TLS cert
  rotation without monitoring → old connections hang on an expired cert. (d)
  lowering `MaxStore` on reload does not evict oversized streams; new writes
  fail until an admin trims. Runnable handling: `nats-server -c nats.conf -t`
  dry-run before reload (plain bash).
- **rolling-upgrades** — (a) `lame_duck_duration` too short (30s) when
  rebalance needs 45s → clients drop before replicas sync; measure rebalance
  first. (b) upgrading the meta-leader without transferring leadership →
  30–60s of blocked stream ops; do non-leaders first. (c) Pod eviction without
  a PDB drains all 3 pods → quorum lost; set `minAvailable: 2`. (d) reconnect
  storm on LDM → traffic spike; stagger LDM start across ordinals. Runnable
  handling: `nats stream info ORDERS` to read replicas/leader before and after
  (`streamReplicas` div).
- **hardening** — (a) `ProtectSystem=strict` blocks TLS cert reload if certs
  live outside `ReadWritePaths`; put them under `/var/lib/nats` or mount
  `/etc/nats-certs` explicitly. (b) `MemoryMax`/`GOMEMLIMIT` below the
  JetStream max store → silent startup failure; set it `≥` the JS config. (c)
  firewall blocking cluster port 6222 → nodes can't form quorum, appear as
  orphans. (d) monitor port 8222 exposed to the internet leaks version/client
  count/memory; bind localhost-only. Runnable handling: connect with `--creds`
  + `--tlsca` and publish one order to prove auth+TLS are live (`credsConnect`
  div).

---

## 9. Acceptance criteria

Chapter-wide:

- [ ] All 7 `/learn/deployment/*` URLs return 200 and render.
- [ ] The 3 NEW NatsFlow scenarios (`crdReconcileAnimated`,
      `configReloadAnimated`, `lameDuckUpgradeAnimated`) are authored, wired,
      and embedded on their pages; every `data-scenario` resolves (no error
      box). No fabricated scenario names.
- [ ] `npm run typecheck` and `npm run build` pass; **no broken internal
      links** (every link is from the §5.5 allow-list).
- [ ] Wording lockfile (§5.3) holds — grep returns no banned terms; no Raft/
      auth-model/monitoring concept is **taught** (only named-and-linked).
- [ ] The pinned payload, node names (`nats-0..2`), stream (`ORDERS`), and
      account names (§4) appear unchanged everywhere.

Per page:

- [ ] ≤2 new concepts; a third deferred/linked.
- [ ] Content pages carry `## Pitfalls` **before** `## Where you are`, with
      2–4 gotchas and one runnable handling example.
- [ ] `where-next` carries `## Production checklist` collecting every page's
      Pitfalls action items, grouped per page with a `#pitfalls` link.
- [ ] One `## See also` block (≤3 links from §5.5).
- [ ] 150–400 source lines (`index`/`where-next` may run longer).
- [ ] Every `nats-example` div has a matching committed CLI `.sh`; `data-type`
      equals the dash-joined path; CLI is the default tab where Tabs are used.
- [ ] Config/manifest/systemd snippets are plain fenced blocks (`conf`/`yaml`/
      `ini`/`bash`), NOT `nats-example` divs.
- [ ] No leaked tool-call tags (`</content>`, `</invoke>`) in any file.

---

## 10. Out of scope

- Cluster/Raft mechanics, the auth model, monitoring discipline, topology
  shape choice, backup/restore — all linked, none taught here.
- Versioned Learn content; translation; search tuning.
- New sidebar pages or reordering (the 7 pages are fixed).
- Auto-generation — every page is hand-written prose; only embedded code comes
  from the `nats-example` pipeline, and config/manifests are inline fenced
  blocks.
- Cloud-provider-specific manifests (EKS/GKE/AKS), Terraform, operators beyond
  NACK — out of scope; the Helm chart + NACK is the canonical path.
