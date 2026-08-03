---
id: ecosystem
title: The NATS Ecosystem
---

# The NATS Ecosystem

NATS is more than the `nats-server` binary. Around it sits a set of officially maintained clients, extension libraries, command-line and Kubernetes tooling, identity tools, and integrations.

This page is the map of those pieces — what each repository is, who maintains it, and where to look first.

If you only want to pick a client and start building, jump to [Tier 1 clients](#tier-1-clients).

## Server

The single binary that does all message routing. Clustering, JetStream persistence, leaf nodes, [MQTT](/learn/mqtt/), and [WebSocket](/learn/websocket/) are all enabled through configuration on the same `nats-server` — there are no separate components to install.

| Name | Description |
|---|---|
| [nats-server](https://github.com/nats-io/nats-server) | The NATS server itself |

## Clients

NATS clients come in three categories: **Tier 1** (Synadia-maintained, track new server features at release), **Tier 2** (Synadia-maintained, may lag behind on new server features), and **community** (third-party).

### Tier 1 clients — track server releases {#tier-1-clients}

These are the ones the NATS team ships first when a new server feature lands. If a tier 1 client is available for your language, prefer it.

| Language | Repo | Description |
|---|---|---|
| Go | [nats-io/nats.go](https://github.com/nats-io/nats.go) | Reference implementation |
| JavaScript / TypeScript | [nats-io/nats.js](https://github.com/nats-io/nats.js) | Node, Deno, Bun, browser ([WebSocket](/learn/websocket/)). Supersedes the archived `nats.node`, `nats.deno`, `nats.ws`, `nats.ts` |
| Python | [nats-io/nats.py](https://github.com/nats-io/nats.py) | asyncio-based, Python 3 only |
| Java | [nats-io/nats.java](https://github.com/nats-io/nats.java) | JVM; usable from Kotlin and Scala |
| Rust | [nats-io/nats.rs](https://github.com/nats-io/nats.rs) | The `async-nats` crate |
| C# / .NET | [nats-io/nats.net](https://github.com/nats-io/nats.net) | .NET 6+. Modern async client |
| C | [nats-io/nats.c](https://github.com/nats-io/nats.c) | Embedded systems and FFI consumers |

### Tier 2 clients — Synadia-maintained, feature-lag possible

Maintained by Synadia but not guaranteed to expose every new server feature on day one. Production-ready for the features they do cover; check each repo's README for current feature coverage.

| Language | Repo | Description |
|---|---|---|
| Zig | [nats-io/nats.zig](https://github.com/nats-io/nats.zig) | Newer addition |
| Swift | [nats-io/nats.swift](https://github.com/nats-io/nats.swift) | iOS, macOS, and server-side Swift |
| Ruby | [nats-io/nats-pure.rb](https://github.com/nats-io/nats-pure.rb) | Pure Ruby — preferred Ruby client |
| Ruby (legacy) | [nats-io/nats.rb](https://github.com/nats-io/nats.rb) | EventMachine-based; use `nats-pure.rb` for new code |
| Elixir | [nats-io/nats.ex](https://github.com/nats-io/nats.ex) | Replaces the archived `elixir-nats` |

### Community clients

Third-party implementations exist for languages including Crystal, Dart, Kotlin, and PHP. Feature coverage and maintenance status vary — evaluate per project. These docs do not cover community clients.

## Orbit — extensions and incubator per language

Orbit repositories live under the [synadia-io](https://github.com/synadia-io) org. They contain optional higher-level utilities and experimental features built on top of the matching tier 1 client. Pull in only the modules you need.

Typical Orbit contents include extra JetStream helpers (request-many, batch publish, scheduled messages), partitioned consumer groups, encoded KV / KV codecs, distributed counters, and retry / chaos utilities. Successful patterns may eventually graduate into the core client. Exact module set differs per language — check each Orbit repo's README.

| Language | Repo | Description |
|---|---|---|
| Go | [synadia-io/orbit.go](https://github.com/synadia-io/orbit.go) | Extensions for `nats.go` |
| JavaScript / TypeScript | [synadia-io/orbit.js](https://github.com/synadia-io/orbit.js) | Extensions for `nats.js` |
| Python | [synadia-io/orbit.py](https://github.com/synadia-io/orbit.py) | Extensions for `nats.py` |
| Java | [synadia-io/orbit.java](https://github.com/synadia-io/orbit.java) | Extensions for `nats.java` |
| Rust | [synadia-io/orbit.rs](https://github.com/synadia-io/orbit.rs) | Extensions for `async-nats` |
| C# / .NET | [synadia-io/orbit.net](https://github.com/synadia-io/orbit.net) | Extensions for `nats.net` |
| C | [synadia-io/orbit.c](https://github.com/synadia-io/orbit.c) | Extensions for `nats.c` |

## Command-line tooling

| Name | Description |
|---|---|
| [natscli](https://github.com/nats-io/natscli) | The everyday `nats` CLI. Publish, subscribe, manage streams and consumers, inspect a running server, manage operators, accounts, and users with `nats auth`. Most examples in these docs use it |
| [nats-top](https://github.com/nats-io/nats-top) | `top`-style live view of server activity |
| [nats-box](https://github.com/nats-io/nats-box) | Container image bundling the common NATS utilities (`nats`, `nsc`, `nk`) for ad-hoc shells in Kubernetes |

## Identity & authentication

Tools and libraries for managing operators, accounts, users, and signing keys with NKeys + JWTs.

| Name | Description |
|---|---|
| [nsc](https://github.com/nats-io/nsc) | Standalone CLI for managing operators, accounts, and users. An alternative to the `nats auth` commands built into the `nats` CLI; reads the same on-disk store and covers operations `nats auth` doesn't yet |
| [synadia-io/jwt-auth-builder.go](https://github.com/synadia-io/jwt-auth-builder.go) | Programmatic builder for accounts and users (alternative to driving `nsc` from code) |
| [synadia-io/callout.go](https://github.com/synadia-io/callout.go) | Go SDK for writing auth-callout services |
| [synadia-io/callout.net](https://github.com/synadia-io/callout.net) | .NET SDK for writing auth-callout services |

### NKey libraries

Per-language implementations of the NKey signing and key-handling primitives.

| Language | Repo |
|---|---|
| Go | [nats-io/nkeys](https://github.com/nats-io/nkeys) |
| JavaScript / TypeScript | [nats-io/nkeys.js](https://github.com/nats-io/nkeys.js) |
| Java | [nats-io/nkeys.java](https://github.com/nats-io/nkeys.java) |
| C# / .NET | [nats-io/nkeys.net](https://github.com/nats-io/nkeys.net) |
| Python | [nats-io/nkeys.py](https://github.com/nats-io/nkeys.py) |
| Ruby | [nats-io/nkeys.rb](https://github.com/nats-io/nkeys.rb) |
| Swift | [nats-io/nkeys.swift](https://github.com/nats-io/nkeys.swift) |
| Elixir | [nats-io/nkeys.ex](https://github.com/nats-io/nkeys.ex) |

### JWT libraries

Per-language implementations for issuing and verifying NATS account / user JWT claims.

| Language | Repo |
|---|---|
| Go | [nats-io/jwt](https://github.com/nats-io/jwt) |
| JavaScript / TypeScript | [nats-io/jwt.js](https://github.com/nats-io/jwt.js) |
| Java | [nats-io/jwt.java](https://github.com/nats-io/jwt.java) |
| C# / .NET | [nats-io/jwt.net](https://github.com/nats-io/jwt.net) |

## Kubernetes

| Name | Description |
|---|---|
| [k8s](https://github.com/nats-io/k8s) | Official Helm charts for deploying `nats-server` clusters, surveyor, and related components |
| [nack](https://github.com/nats-io/nack) | Kubernetes controllers and CRDs for managing JetStream streams, consumers, and KV / Object stores declaratively |

## Observability

| Name | Description |
|---|---|
| [prometheus-nats-exporter](https://github.com/nats-io/prometheus-nats-exporter) | Prometheus exporter for `varz`, `connz`, `routez`, and JetStream stats |
| [nats-surveyor](https://github.com/nats-io/nats-surveyor) | Cluster-wide monitoring; aggregates stats across servers and exposes them as Prometheus metrics. Pairs with the exporter for full-cluster observability |

## Schemas & API definitions

| Name | Description |
|---|---|
| [jsm.go](https://github.com/nats-io/jsm.go) | Canonical source of JetStream API JSON schemas used by tooling and the reference docs in this site. Also contains a Go JetStream management library (alternative to `nats.go` with a different API surface) |

## Bridges & integrations

| Name | Description |
|---|---|
| [nats-kafka](https://github.com/nats-io/nats-kafka) | Kafka ↔ NATS bridge |
| [nats-spark-connector](https://github.com/nats-io/nats-spark-connector) | Apache Spark structured-streaming source |
| [synadia-io/flink-connector-nats](https://github.com/synadia-io/flink-connector-nats) | Apache Flink connector |
| [nats-java-vertx-client](https://github.com/nats-io/nats-java-vertx-client) | Vert.x integration |
| [terraform-provider-jetstream](https://github.com/nats-io/terraform-provider-jetstream) | Manage JetStream resources as IaC |

## Next steps

- [The Learn deep dives](/learn) — guided, hands-on path through NATS
- [Resilient clients](/learn/resilient-clients) — handle reconnects and failures
- [Services](/learn/services) — build request/reply microservices
