---
id: index
title: "Topologies"
description: "Sized deployment blueprints: single cluster, multi-region, edge fleet, hub and spoke, hybrid cloud, multi-tenant, and ingress"
---
# Topologies

A topology blueprint is a deployment shape with its sizing, its config skeleton, and what survives which failure. The Learn Topologies chapter teaches how each shape works; these pages tell you which one to build and how big.

## Pages

| Topology | Use it for |
| --- | --- |
| [Single cluster](/architecture/topologies/single-cluster) | The default production shape: three servers in one zone, JetStream on all of them, R3 for what matters |
| [Multi-region super-cluster](/architecture/topologies/multi-region-supercluster) | One cluster per region joined by gateways, with traffic and storage kept local unless interest says otherwise |
| [Edge fleet with leaf nodes](/architecture/topologies/edge-fleet-with-leaf-nodes) | Thousands of sites each running a leaf node that works offline and syncs when connected |
| [Hub and spoke](/architecture/topologies/hub-and-spoke) | A central cluster with leaf nodes for teams, partners, or environments that need isolation and their own local traffic |
| [Hybrid cloud and on-premises](/architecture/topologies/hybrid-cloud) | Connect an on-premises deployment to a cloud cluster with outbound-only leaf connections |
| [Multi-tenant platform](/architecture/topologies/multi-tenant-platform) | Many tenants on shared servers, isolated by accounts, with operator-mode credentials and per-tenant limits |
| [Internet-facing ingress](/architecture/topologies/internet-facing-ingress) | Serve browsers and mobile apps over WebSocket through a boundary that keeps the core cluster private |
| [JetStream placement](/architecture/topologies/jetstream-placement) | Decide which servers store data: all of them, a dedicated set, tagged placement, or separate domains |

