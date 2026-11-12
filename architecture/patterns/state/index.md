---
id: index
title: "State patterns"
description: "Patterns built on Key-Value: configuration, coordination, and workflow state"
---
# State patterns

Key-Value is a stream underneath, which gives it history, watches, and compare-and-set. These patterns use those three.

## Pages

| Pattern | Use it to |
| --- | --- |
| [Configuration and feature flags](/architecture/patterns/state/configuration-distribution) | Push configuration to every instance with a watch instead of polling |
| [Locks and leader election](/architecture/patterns/state/leader-election) | Elect a leader or hold a lock with create, compare-and-set, and TTL |
| [Workflow state](/architecture/patterns/state/workflow-state) | Track a multi-step process in Key-Value while the steps run over streams |
| [Materialized views](/architecture/patterns/state/materialized-views) | Keep a query-ready projection of a stream in Key-Value |

