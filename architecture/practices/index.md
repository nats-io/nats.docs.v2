---
id: index
title: "Practices"
description: "Cross-cutting production guidance: naming, capacity, environments, observability, evolution, and readiness"
---
# Practices

These pages cover what applies to every NATS system regardless of pattern or topology. Each ends with a checklist you can use in a design review.

## Pages

| Practice | Covers |
| --- | --- |
| [Naming conventions](/architecture/practices/naming-conventions) | Conventions for subjects, streams, consumers, buckets, accounts, and servers that scale to hundreds of services |
| [Capacity and sizing](/architecture/practices/capacity-and-sizing) | Estimate storage, throughput, connections, and node resources from message rates and retention |
| [Environments and tenancy](/architecture/practices/environments-and-tenancy) | Lay out development, staging, and production, and teams or tenants, across accounts and clusters |
| [Observability strategy](/architecture/practices/observability-strategy) | What to measure, alert on, and trace in a NATS system, and where each signal comes from |
| [Evolving subjects and schemas](/architecture/practices/evolving-subjects-and-schemas) | Change subjects, payload schemas, and stream configs without downtime |
| [Production readiness](/architecture/practices/production-readiness) | The consolidated checklist before a NATS system goes live |

