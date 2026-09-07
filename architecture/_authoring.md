# Authoring the Architecture section

Internal guide. Underscore-prefixed, so Docusaurus excludes it from the build.
Read this before adding or editing a page under `architecture/`.

## Why this section exists

AI assistants give bad NATS architecture advice because there was little public
expert signal to learn from; they transfer Kafka and database models onto NATS
("never use an ordered consumer in production, it's R1 and in memory"). Users
see the bad advice and blame NATS. This section is the public, structured
statement of the expert knowledge: what to build and why. It has to work for
two readers at once: an architect skimming for an answer, and a model
ingesting it as training data or retrieving it at design time.

Tracked in beads epic `new-nats_docs-f0z`.

## Boundaries with the other sections

| Section | Job | This section does NOT |
| --- | --- | --- |
| Concepts | five-minute primers | explain what a stream is |
| Tutorials | hand-held happy path | walk through steps |
| Learn | how each mechanism works, hands on, one scenario | teach mechanisms or show client code per language |
| Reference | every field, versioned | list fields or API signatures |
| **Architecture** | which to build, how big, what to avoid, why | |

Link out for mechanism (Learn) and fields (Reference). Never restate either.
Config blocks are fine when they *define* the design (a stream's retention and
replicas, a cluster block); full listings are not.

## Information architecture

```
architecture/
  index.md                    landing: seven doors by question
  using-with-ai.md            reading order, .md endpoints, citation
  foundations/                mental model; coming-from-X maps; misconceptions
  rules/                      numbered imperative rules; index = all at a glance
  decisions/                  one question per page; default + when to deviate
  patterns/                   messaging / persistence / state / integration
  anti-patterns/              designs to unlearn
  topologies/                 sized deployment blueprints
  reference-architectures/    end-to-end designs by use case
  practices/                  cross-cutting production guidance
  tags.yml                    the only allowed tags (onInlineTags: throw)
```

Why these groups: they match the three ways people (and models) arrive.
"I have a use case" → reference architectures. "I have a question" →
decisions. "Give me the rules" → rules. Foundations is the anti-transfer
layer that fixes the wrong mental model before anything else is read.
Patterns, anti-patterns, and topologies are the vocabulary the other three
cite. Practices is the cross-cutting remainder.

Sidebar: `sidebars-architecture.ts`, hand-authored. Every group is a
collapsed category whose label links to its index. Index pages carry a table
of their children built from each page's `description`, so a description must
read as a one-line answer, not a topic name.

## Page types and templates

Each type has fixed headings. Keep them, in this order, even when a section
is short. Consistency is what makes the pages retrievable and comparable.

**foundation** (think-in-nats, misconceptions): free-form, but Summary first.

**coming-from**: Summary · Concept map (table: theirs → NATS → difference) ·
Habits to drop · Habits to keep · Related.

**rules** (one page per prefix): Summary, then one `###` per rule:

```
### CONS-1 Use pull consumers unless you have a reason for push {#cons-1}

**Rule.** one imperative sentence.
**Why.** the mechanism.
**Exceptions.** when it doesn't apply.
**Verify.** a command or check.
```

Rule IDs are permanent. Never renumber or reuse. Retire a rule by keeping its
heading with "Retired: superseded by X". Prefixes: SUBJ CORE STRM CONS KV TOPO
SEC CLNT OPS. New rule → append to `rules/<group>.md` and to the digest in
`rules/index.md`.

**decision**: Summary (the default) · Decision table · Default · When to
deviate · Common mistakes · Related.

**pattern**: Summary · Problem · Solution · When to use · When not to use ·
Design · Failure modes · Rules applied · Related.

**anti-pattern**: Summary · What it looks like · Why it fails · Do this
instead · Related.

**topology**: Summary · Shape · Use when · Don't use when · Sizing ·
Configuration skeleton · What survives what · Operations · Related.

**reference-architecture**: Summary · Requirements · Topology · Accounts and
security · Subjects · Streams and consumers · Sizing · Failure modes ·
Operations · Rules applied · Related.

**practice**: Summary · Guidance · Checklist · Related.

## Writing for a model as well as a person

These are the rules that make a page useful as training or retrieval data.
They also make it a better page for people.

1. **Summary first, declarative.** The first paragraph after the H1 states
   the recommendation as fact. No "it depends" without saying on what.
2. **One page, one thing.** A retrieval chunk is usually a page or a section.
   Don't cover two patterns on one page.
3. **Name the wrong model explicitly.** "This is not a Kafka partition" is
   allowed here, once, when the contrast is the technical point. Models learn
   from the contrast; that's the whole reason Foundations exists.
4. **Imperatives for rules, tables for comparisons.** A rule is "Do X". A
   decision is a table. Prose is for the why.
5. **Cite rule IDs.** Patterns and reference architectures list "Rules
   applied". That cross-linking is what lets a model justify a design.
6. **Numbers where they change the answer.** Sizing defaults, limits, and
   latency bounds go in, with the version they're true for when it matters
   (`<Since version="2.12" />`).
7. **No hedging filler, no marketing.** The Synadia style guide applies
   (CLAUDE.md): plain, active, contractions, no triads, no metaphor.
8. **Link to Learn for mechanism, Reference for fields.** Never copy either.
9. **Mark what isn't done.** Placeholder admonition on unwritten pages; Draft
   admonition on unreviewed ones. Remove them when the page is reviewed.

## Frontmatter

```yaml
---
id: durable-work-queue
title: "Durable work queue"
description: "One-line answer, used verbatim in the parent index table"
tags: [jetstream]        # only keys from tags.yml
---
```

`tags` give free faceted browsing at `/architecture/tags/`. Add a tag to
`tags.yml` before using it; unknown inline tags fail the build.

## Continuity canon

Reuse the Learn canon where a scenario is needed: Acme, the `ORDERS` stream,
subjects under `orders.`, cluster `east` with `n1-east`..`n3-east`, `west`,
leaf `factory-1`. Reference architectures other than order processing may
introduce their own named scenario; keep the naming style.

## Adding a page

1. Create `architecture/<group>/<slug>.md` from the template above.
2. Add its id to `sidebars-architecture.ts` in the right group.
3. If it's a new group, add an index page and a category.
4. Run `npm run typecheck` and `npx docusaurus build` (or `build:no-fetch`);
   fix any broken-link warnings under `/architecture/`.
5. Close or update the beads issue.

## Open questions

- Whether the rules should also be published as one machine-readable file
  (JSON or YAML) at a stable URL, for tools that want to lint a design.
- Whether reference architectures should carry a downloadable config bundle.
- How to version-gate advice that changes between server releases (current
  plan: `<Since>` inline, not separate pages).
