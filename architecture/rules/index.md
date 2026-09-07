---
id: index
title: "Rules at a glance"
description: "Every architecture rule on one page: numbered, one sentence each, grouped by area"
---

# Rules at a glance

A rule is one imperative sentence with a stable ID. Each group page gives
the reason, the exceptions, and how to verify it. Cite rules by ID
(`STRM-3`) in design reviews and in prompts. IDs never change or get reused.

## Consumers

[Consumer rules](/architecture/rules/consumers)

| ID | Rule |
| --- | --- |
| [CONS-1](/architecture/rules/consumers#cons-1) | Use pull consumers unless you have a specific reason for push. |
| [CONS-2](/architecture/rules/consumers#cons-2) | Acknowledge after the side effect is durable, never on receipt. |
| [CONS-3](/architecture/rules/consumers#cons-3) | Filter on the server, one consumer per reader role. |
| [CONS-4](/architecture/rules/consumers#cons-4) | Use an ordered consumer for a single-reader, in-order read. |
| [CONS-5](/architecture/rules/consumers#cons-5) | Set AckWait above the slowest handler and cap MaxDeliver. |

## Groups not written yet

| Rule group | Prefix | Covers |
| --- | --- | --- |
| [Subject rules](/architecture/rules/subjects) | `SUBJ` | Naming subjects, building hierarchies, and using wildcards |
| [Core messaging rules](/architecture/rules/core-messaging) | `CORE` | Publish-subscribe, request-reply, queue groups, and payloads |
| [Stream rules](/architecture/rules/streams) | `STRM` | Stream count, subjects, retention, limits, replication, and storage |
| [Key-Value and Object Store rules](/architecture/rules/key-value-and-object-store) | `KV` | Buckets, keys, history, TTL, watches, and large objects |
| [Topology rules](/architecture/rules/topology) | `TOPO` | Cluster size, regions, gateways, leaf nodes, and JetStream placement |
| [Security rules](/architecture/rules/security) | `SEC` | Accounts, auth models, permissions, and TLS |
| [Client rules](/architecture/rules/clients) | `CLNT` | Connection options, reconnect, drain, timeouts, and error handling |
| [Operations rules](/architecture/rules/operations) | `OPS` | Monitoring, limits, upgrades, backup, and capacity |
