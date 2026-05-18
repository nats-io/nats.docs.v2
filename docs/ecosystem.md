---
id: ecosystem
title: The NATS Ecosystem
sidebar_position: 2
---

# The NATS Ecosystem

NATS is more than the `nats-server` binary. Around it sits a set of officially maintained clients, extension libraries, command-line and Kubernetes tooling, identity tools, and integrations. This page is the map.

If you only want to pick a client and start building, jump to [Tier 1 clients](#tier-1-clients).

## Server

The single broker process. One binary; clustering, JetStream persistence, leaf nodes, MQTT, and WebSocket are all configuration on the same process.

- **[nats-server](https://github.com/nats-io/nats-server)** — Go. The NATS server itself.

## Clients

NATS clients come in three categories: Tier 1 (Synadia-maintained, track new server features at release), Tier 2 (Synadia-maintained but may lag behind server features), and community (third-party).

### Tier 1 clients — track server releases {#tier-1-clients}

These are the ones the NATS team ships first when a new server feature lands. If a tier 1 client is available for your language, prefer it.

| Language | Repo | Notes |
|---|---|---|
| Go | [nats-io/nats.go](https://github.com/nats-io/nats.go) | Reference implementation |
| JavaScript / TypeScript | [nats-io/nats.js](https://github.com/nats-io/nats.js) | Node, Deno, Bun, browser (WebSocket). Supersedes the now-archived `nats.node`, `nats.deno`, `nats.ws`, `nats.ts` |
| Python | [nats-io/nats.py](https://github.com/nats-io/nats.py) | asyncio-based, Python 3 only |
| Java | [nats-io/nats.java](https://github.com/nats-io/nats.java) | JVM; also usable from Kotlin / Scala |
| Rust | [nats-io/nats.rs](https://github.com/nats-io/nats.rs) | The `async-nats` crate |
| C# / .NET | [nats-io/nats.net](https://github.com/nats-io/nats.net) | .NET 6+. Modern async client. Legacy `nats.net.v1` still maintained for compatibility |
| C | [nats-io/nats.c](https://github.com/nats-io/nats.c) | Embedded systems and FFI consumers |

### Tier 2 clients — Synadia-maintained, feature-lag possible

Maintained by Synadia but not guaranteed to expose every new server feature on day one. Production-ready for the features they do cover; check the repo's README for current feature coverage.

| Language | Repo | Notes |
|---|---|---|
| Zig | [nats-io/nats.zig](https://github.com/nats-io/nats.zig) | Newer addition |
| Swift | [nats-io/nats.swift](https://github.com/nats-io/nats.swift) | iOS / macOS / server-side Swift |
| Ruby | [nats-io/nats-pure.rb](https://github.com/nats-io/nats-pure.rb) | Pure Ruby. Preferred Ruby client |
| Ruby (legacy) | [nats-io/nats.rb](https://github.com/nats-io/nats.rb) | EventMachine-based; legacy. Use `nats-pure.rb` for new code |
| Elixir | [nats-io/nats.ex](https://github.com/nats-io/nats.ex) | Replaces the archived `elixir-nats` |

### Community clients

Third-party implementations exist for languages including Crystal, Dart, Kotlin, PHP, and others. Feature coverage and maintenance status vary — evaluate per project. These docs do not cover community clients.

## Orbit — extensions and incubator per language

Orbit repositories live under the [synadia-io](https://github.com/synadia-io) org. They contain optional, higher-level utilities and experimental features built on top of the matching tier 1 client. Pull in only the modules you need.

Typical Orbit contents include extra JetStream helpers (request-many, batch publish, scheduled messages), partitioned consumer groups, encoded KV / KV codecs, distributed counters, and retry / chaos utilities. Successful patterns may eventually graduate into the core client.

| Language | Repo |
|---|---|
| Go | [synadia-io/orbit.go](https://github.com/synadia-io/orbit.go) |
| JavaScript / TypeScript | [synadia-io/orbit.js](https://github.com/synadia-io/orbit.js) |
| Python | [synadia-io/orbit.py](https://github.com/synadia-io/orbit.py) |
| Java | [synadia-io/orbit.java](https://github.com/synadia-io/orbit.java) |
| Rust | [synadia-io/orbit.rs](https://github.com/synadia-io/orbit.rs) |
| C# / .NET | [synadia-io/orbit.net](https://github.com/synadia-io/orbit.net) |
| C | [synadia-io/orbit.c](https://github.com/synadia-io/orbit.c) |

Exact module set differs per language — check each Orbit repo's README.

## Command-line tooling

- **[natscli](https://github.com/nats-io/natscli)** — Go. The everyday `nats` CLI. Publish, subscribe, manage streams and consumers, inspect a running server. Most examples in these docs use it.
- **[nats-top](https://github.com/nats-io/nats-top)** — Go. `top`-style live view of server activity.
- **[nats-box](https://github.com/nats-io/nats-box)** — Container image bundling the common NATS utilities (`nats`, `nsc`, `nk`) for ad-hoc shells in Kubernetes.

## Identity & authentication

- **[nsc](https://github.com/nats-io/nsc)** — Go. CLI for managing operators, accounts, and users via NKeys + JWTs.
- **[nkeys](https://github.com/nats-io/nkeys)** — Go reference NKey library. Per-language ports: `nkeys.js`, `nkeys.java`, `nkeys.net`, `nkeys.py`, `nkeys.rb`, `nkeys.swift`, `nkeys.ex`.
- **[jwt](https://github.com/nats-io/jwt)** — Go reference JWT library for NATS account / user claims. Ports: `jwt.js`, `jwt.java`, `jwt.net`.
- **[synadia-io/jwt-auth-builder.go](https://github.com/synadia-io/jwt-auth-builder.go)** — programmatic builder for accounts and users (alternative to driving `nsc` from code).
- **callout SDKs** under synadia-io — helpers for writing auth-callout services in Go and .NET.

## Kubernetes

- **[k8s](https://github.com/nats-io/k8s)** — Official Helm charts for deploying `nats-server` clusters, surveyor, and related components.
- **[nack](https://github.com/nats-io/nack)** — Kubernetes controllers and CRDs for managing JetStream streams, consumers, and KV/Object stores declaratively. Successor to the archived `nats-operator`.
- **[nats-docker](https://github.com/nats-io/nats-docker)** — Official Docker images for `nats-server`.

## Observability

- **[prometheus-nats-exporter](https://github.com/nats-io/prometheus-nats-exporter)** — Go. Prometheus exporter for `varz`, `connz`, `routez`, JetStream stats.
- **[nats-surveyor](https://github.com/nats-io/nats-surveyor)** — Go. Cluster-wide monitoring; aggregates stats across servers and exposes them as Prometheus metrics. Pairs with the exporter for full-cluster observability.

## Schemas & API definitions

- **[jsm.go](https://github.com/nats-io/jsm.go)** — Go library and the canonical source of JetStream API JSON schemas used by tooling and the reference docs in this site. Most users do not depend on this directly.

## Bridges & integrations

- **[nats-kafka](https://github.com/nats-io/nats-kafka)** — Go. Kafka ↔ NATS bridge.
- **[nats-jms-bridge](https://github.com/nats-io/nats-jms-bridge)** — Java. Request / reply bridge to JMS providers.
- **[nats-spark-connector](https://github.com/nats-io/nats-spark-connector)** — Scala. Apache Spark structured-streaming source.
- **[synadia-io/flink-connector-nats](https://github.com/synadia-io/flink-connector-nats)** — Java. Apache Flink connector.
- **[spring-nats](https://github.com/nats-io/spring-nats)** — Java. Spring Cloud Stream binder.
- **[nats-java-vertx-client](https://github.com/nats-io/nats-java-vertx-client)** — Java. Vert.x integration.
- **[nginx-nats](https://github.com/nats-io/nginx-nats)** — C. NGINX module.
- **[terraform-provider-jetstream](https://github.com/nats-io/terraform-provider-jetstream)** — Go. Manage JetStream resources as IaC.

## Notable successions

Old repo names still show up in search results and blog posts. Here is what they map to today.

| Archived / legacy | Replaced by |
|---|---|
| `nats-streaming-server`, `stan.*` clients | JetStream (built into `nats-server`) |
| `nats.node`, `nats.deno`, `nats.ws`, `nats.ts` | [nats.js](https://github.com/nats-io/nats.js) |
| `nats-account-server` | Built-in NATS 2.x resolver + [nsc](https://github.com/nats-io/nsc) |
| `nats-operator` | [nack](https://github.com/nats-io/nack) + [k8s](https://github.com/nats-io/k8s) Helm charts |
| `elixir-nats` | [nats.ex](https://github.com/nats-io/nats.ex) |
| `nats.py2` | [nats.py](https://github.com/nats-io/nats.py) (Python 3 only) |

If you are starting fresh, ignore the left column.
