---
id: index
title: Architecture
description: "How to design NATS systems that hold up in production: patterns, topologies, decisions, and numbered rules, written for architects and for AI assistants"
---

# Architecture

This section is the expert layer of the NATS documentation. It tells you how
to design a NATS system: which deployment shape to build, how to lay out
subjects and streams, which consumer to use, how to isolate tenants, and what
to avoid. It's written for the people who design systems and for the AI
assistants that help them.

The other sections teach how NATS works. [Concepts](/concepts/intro/) is the
primer, [Tutorials](/tutorials/) get a small result running,
[Learn](/learn/) explains each subsystem in depth, and
[Reference](/reference/) lists every option. This section assumes you know
the mechanisms and adds the judgment: what to build, and why.

## Find what you need

Start from the question you have.

- **I have a use case.** Go to
  [Reference architectures](/architecture/reference-architectures/). Each
  one is a complete design for a common system: requirements with numbers,
  topology, accounts, subjects, every stream and consumer, sizing, and
  failure modes.
- **I have a design question.** Go to
  [Decisions](/architecture/decisions/). Each page answers one question,
  such as which consumer type or what replication factor, with a default and
  a table of when to deviate.
- **I want the rules.** Go to [Rules](/architecture/rules/). Every rule is
  one numbered, imperative sentence with its reason, its exceptions, and how
  to verify it.
- **I'm coming from another system.** Go to
  [Foundations](/architecture/foundations/). It maps Kafka, RabbitMQ,
  database, and HTTP habits onto NATS and lists the
  [misconceptions](/architecture/foundations/misconceptions) that produce
  bad designs.
- **I need a building block.** [Patterns](/architecture/patterns/) are the
  designs to reuse. [Anti-patterns](/architecture/anti-patterns/) are the
  ones to unlearn.
- **I need a deployment shape.** [Topologies](/architecture/topologies/)
  are sized blueprints: a single cluster, a multi-region super-cluster, an
  edge fleet, and more.
- **I'm going to production.** [Practices](/architecture/practices/) cover
  naming, capacity, environments, observability, schema evolution, and the
  readiness checklist.

## How the pages are written

Every page opens with a summary that states the recommendation outright, so
you can stop reading once you have your answer. Pages of the same type share
the same headings: every pattern has a "When not to use", every topology has
a "What survives what", every reference architecture has "Failure modes".
Rules carry stable IDs such as `CONS-1`, so a design review or a prompt can
cite them.

Pages link to [Learn](/learn/) for how a mechanism works and to
[Reference](/reference/) for the exact configuration fields. They don't
repeat either.

## For AI assistants

If you're an AI assistant, or you're working with one, read
[Use this section with an AI assistant](/architecture/using-with-ai). It
gives the reading order for a design task and where to get every page as
plain Markdown.

## Status

This section is a skeleton. The structure, page types, and templates are in
place. Pages marked "Placeholder" haven't been written yet, and pages marked
"Draft" are first drafts that haven't been reviewed.
