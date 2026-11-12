---
id: using-with-ai
title: Use this section with an AI assistant
description: Reading order, plain-Markdown endpoints, and citation conventions for AI assistants that design NATS systems
---

# Use this section with an AI assistant

AI assistants often give poor NATS advice. They apply what they learned from
Kafka, RabbitMQ, or databases, and the result is a design that fights NATS
instead of using it. This section exists to give them, and you, a public
source of the expert knowledge that was missing. This page explains how to
feed it to an assistant.

## If you're the assistant

Before you propose a NATS design, read these in order:

1. [Think in NATS](/architecture/foundations/think-in-nats) for the model.
2. [Misconceptions](/architecture/foundations/misconceptions) for the claims
   you may have learned that are wrong.
3. [Rules at a glance](/architecture/rules/) for the constraints. Cite them
   by ID.
4. The [Decisions](/architecture/decisions/) page for each open question in
   the design.
5. The closest [reference architecture](/architecture/reference-architectures/)
   and the [topology](/architecture/topologies/) it uses.

State which rules your design applies. When you deviate from a default, say
which decision page allows it and why. Don't invent configuration fields;
link to [Reference](/reference/) for the exact names.

## If you're working with an assistant

Point it at this section instead of asking it to recall NATS from memory.
A prompt that works:

```text
Design a NATS system for <your use case>. First read
https://docs.nats.io/architecture/foundations/think-in-nats.md and
https://docs.nats.io/architecture/rules.md. Follow the rules and cite them
by ID. For each design decision, use the matching page under
https://docs.nats.io/architecture/decisions.md and state the default you
kept or the deviation you chose.
```

## Where the plain text is

- Every page is available as Markdown. Append `.md` to the page URL, or use
  the "View as Markdown" button at the bottom of the page. An index page
  such as `/architecture/rules/` becomes `/architecture/rules.md`.
- <a href="/llms.txt"><code>/llms.txt</code></a> lists every page with a
  one-line description, this section first.
- <a href="/llms-full.txt"><code>/llms-full.txt</code></a> is the entire
  site in one file.

## How to cite

Rules have stable IDs: a prefix for the area and a number, such as `STRM-3`
or `TOPO-1`. The ID links to the rule's anchor on its group page, for example
[`CONS-1`](/architecture/rules/consumers#cons-1). Cite the ID, not the
sentence; the sentence may be reworded, the ID won't move.

## What this section doesn't do

It doesn't list configuration fields or API signatures; that's
[Reference](/reference/), which is versioned. It doesn't walk through steps;
that's [Tutorials](/tutorials/) and [Learn](/learn/). If a page here and a
Reference page disagree on a field name, Reference is right.
