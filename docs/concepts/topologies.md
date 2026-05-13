---
id: topologies
title: Topologies
description: How NATS servers can be arranged — from a single process to globally distributed deployments
---

# Topologies

NATS scales by composing servers. The same client API works across every shape — you change the deployment topology, not your application. Start with one server. Add more when you need to. Stretch across regions. Push to the edge. Mix it all.

This page is a tour of the four building blocks: **single server**, **cluster**, **super-cluster**, and **leaf nodes**. Each has a simple picture and a few words about when to reach for it.

## Single Server

The simplest possible NATS deployment: one server process. All clients connect to it directly. Publishers send, subscribers listen, requests get replies — everything works.

<div class="nats-flow" data-scenario="singleServerTopology" data-width="700" data-height="350"></div>

Use a single server for:

- Local development and demos
- Embedded use inside another application
- Small services where one node is enough
- Quick experiments and learning

## Cluster

A **cluster** is a group of NATS servers connected by routes, forming a full mesh. Clients connect to any server in the cluster — messages flow across routes to reach subscribers anywhere in the mesh. If one server goes down, clients reconnect to another and keep working.

<div class="nats-flow" data-scenario="clusterTopology" data-width="700" data-height="450"></div>

Reach for a cluster when you need:

- High availability — a server can fail without dropping the system
- More throughput than one server can handle
- Production deployments in a single region
- Rolling upgrades without downtime

## Super-Cluster

A **super-cluster** connects multiple clusters together with **gateways**. Each cluster operates independently — usually in its own region or cloud — and gateways carry only the traffic that has interest on the other side. Queue groups even prefer local workers automatically (geo-affinity), so most messages stay close to home.

<div class="nats-flow" data-scenario="superclusterTopology" data-width="800" data-height="400"></div>

Super-clusters fit when you need:

- Multi-region or multi-cloud deployments
- Global services with regional locality
- Disaster recovery across data centers
- Independent failure domains that still share subjects

## Leaf Nodes

A **leaf node** is a lightweight NATS server that connects outward to a hub cluster, extending the namespace to places that can't (or shouldn't) be part of the main cluster. The leaf initiates the connection — it works behind NAT, on a developer laptop, or on a tiny edge device. To clients connected to the leaf, it looks just like a regular NATS server.

<div class="nats-flow" data-scenario="leafnodeTopology" data-width="700" data-height="450"></div>

Leaf nodes are great for:

- Edge and IoT deployments
- On-prem services bridging to a cloud cluster
- Developer laptops with a local NATS that joins the team's hub
- Multi-tenant isolation, where each tenant runs its own leaf

## Mix and Match

Real deployments combine these. A central cluster runs in the cloud. Leaf nodes sit at edge sites, factories, or branch offices and connect home. Super-clusters span continents. Same client code everywhere — picking a topology is an operational decision, not an application one.

<div class="nats-flow" data-scenario="mixedTopology" data-width="750" data-height="450"></div>

The picture above shows a small cluster with a leaf node hanging off it. Edge applications talk to the leaf as if it were the whole NATS system; the leaf forwards what's needed to the cluster, and the cluster routes it onward. You can grow this in any direction: add cluster servers, add more leaves, or span clusters across regions with gateways.

## What's Next

This page is intentionally light on detail. For the protocol-level deep dives:

- [Route protocol](/reference/protocols/route) — how cluster servers talk to each other
- [Gateway protocol](/reference/protocols/gateway) — how clusters talk across a super-cluster
- [Leafnode protocol](/reference/protocols/leafnode) — how leaf nodes connect to a hub
