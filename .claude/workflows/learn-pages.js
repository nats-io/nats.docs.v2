export const meta = {
  name: 'learn-pages',
  description: 'Write Learn deep-dive pages (+CLI snippets) for the chapters passed in args: write -> review -> fix',
  phases: [
    { title: 'Write', detail: 'author each page + its CLI .sh snippets from the chapter spec' },
    { title: 'Review', detail: 'read-only audit against the spec (voice, lockfile, links, divs)' },
    { title: 'Fix', detail: 'apply the review findings' },
  ],
}

// Ordered pages per chapter (index first, where-next last) — fixed by the sidebar.
const CHAPTER_PAGES = {
  'services': ['index','your-first-service','endpoints-and-groups','discovery','observability','scaling','where-next'],
  'resilient-clients': ['index','connecting','reconnection','drain-and-shutdown','slow-consumers','request-reply-resilience','tls-and-auth','where-next'],
  'key-value': ['index','your-first-bucket','watching','history-and-revisions','ttl-and-limits','under-the-hood','where-next'],
  'object-store': ['index','your-first-object','chunking','metadata-and-links','watching-and-listing','under-the-hood','where-next'],
  'clustering': ['index','forming-a-cluster','raft-and-leaders','replication-and-r3','placement','scaling-and-peers','where-next'],
  'monitoring': ['index','monitoring-endpoints','jetstream-health','advisories-and-events','prometheus-and-dashboards','where-next'],
  'backup-recovery': ['index','stream-backup-restore','mirrors-and-sources','disaster-recovery','config-and-jwt-backup','where-next'],
  'deployment': ['index','sizing-and-resources','kubernetes','config-management','rolling-upgrades','hardening','where-next'],
}

const SPEC = (ch) => `specs/2026-06-05-${ch}-deep-dive-design.md`

// Build the flat work list for the chapters requested in args.
const chapters = Array.isArray(args) ? args : Object.keys(CHAPTER_PAGES)
const PAGES = []
for (const ch of chapters) {
  const slugs = CHAPTER_PAGES[ch]
  if (!slugs) { log(`WARN unknown chapter: ${ch}`); continue }
  slugs.forEach((slug, idx) => {
    const type = slug === 'index' ? 'index' : (idx === slugs.length - 1 ? 'where-next' : 'content')
    // index = position 1, no title number. content/where-next: title number = idx, position = idx+1.
    const num = type === 'index' ? null : idx
    const pos = idx + 1
    PAGES.push({ ch, slug, type, num, pos })
  })
}
log(`Pages to write: ${PAGES.length} across ${chapters.length} chapters (${chapters.join(', ')})`)

const CONVENTIONS = `
STANDING CONVENTIONS (every Learn deep-dive page):
- Frontmatter: id, title, sidebar_position, description. Content/where-next titles carry a leading number ("3. Filtering"); index has no number.
- Voice: flat and plain per style-guide.pdf + CLAUDE.md Writing Style (no AI-style tics: no "X is not Y" inversion as a device, no rule-of-three, no metaphor, no dramatic fragments, no evocative headings), active voice, present tense, one teaching thought per paragraph, define-then-use, <=2 NEW concepts per content page. Copy the gold pages' STRUCTURE only, not their voice.
- Teach what matters; hand the exhaustive knob list to Reference with the greppable phrase "the full set of ... is documented in [Reference](/reference/...)".
- Examples: almost every real multi-language snippet is a nats-example div:
    <div class="nats-example" data-type="learn-<chapter>-<slug>-<snippet>" data-languages="cli,js,go,python,java,rust,csharp"></div>
  Author the matching CLI source at static/examples/snippets/cli/learn/<chapter>/<slug>/<snippet>.sh (#!/bin/bash, REAL nats commands, the pinned payload). The dir path dash-joined MUST equal the data-type EXACTLY. Server config / CLI-only ops / "two terminals" demos are plain fenced bash/conf blocks (no div).
- NatsFlow: embed the scenario the spec assigns to this page with
    <div class="nats-flow" data-scenario="<name>Animated" data-width="600" data-height="350"></div>
  Use ONLY a data-scenario name that the spec lists for this chapter (new or reused). Never invent one.
- Links: use ONLY paths from the spec's §5.4 link allow-list. Cluster/server names follow the spec's CONTINUITY OVERRIDE banner if present (e.g. n1-east/n2-east/n3-east, cluster "east").
- Content page skeleton: intro -> concept H2s with embedded examples -> "## Pitfalls" (2-4 concept-scoped gotchas, do/don't, one runnable handling example; insert BEFORE "## Where you are") -> "## Where you are" -> "## What is next" -> "## See also" (<=3 links).
- where-next skeleton: recap "the whole game" -> "Where the details live now" -> "## Sibling deep dives" -> "## Where you are" -> "## Production checklist" (collect EVERY content page's Pitfalls action items, grouped per page, each group headed by a link to that page's #pitfalls) -> "## See also".
- index skeleton: intro -> "By the end you will have" -> "Who this is for" -> "How to read it" -> "## Map" table linking every page -> "## Prerequisites".
- Length 150-400 source lines for content pages; index/where-next may run longer.
- NO leaked tool-call XML tags (</content>, </invoke>, antml:) anywhere in the file.
`

const GOLD = {
  content: 'learn/jetstream/your-first-stream.md (structure) and learn/security/encryption.md (the ## Pitfalls section shape)',
  index: 'learn/jetstream/index.md',
  'where-next': 'learn/jetstream/where-next.md',
}

const WRITE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['page', 'snippets', 'natsflow', 'lines'],
  properties: {
    page: { type: 'string', description: 'path of the .md written' },
    snippets: { type: 'array', items: { type: 'string' }, description: 'paths of the .sh files written' },
    natsflow: { type: 'array', items: { type: 'string' }, description: 'data-scenario names embedded' },
    lines: { type: 'number' },
  },
}

const REVIEW_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['issues', 'clean'],
  properties: {
    clean: { type: 'boolean', description: 'true if no changes needed' },
    issues: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['severity', 'detail'],
        properties: {
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          detail: { type: 'string', description: 'precise, actionable: what is wrong + the fix' },
        },
      },
    },
  },
}

const FIX_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['page', 'applied'],
  properties: { page: { type: 'string' }, applied: { type: 'number' }, notes: { type: 'string' } },
}

phase('Write')

const results = await pipeline(
  PAGES,
  // Stage 1 — WRITE the page + its CLI snippets
  (p) => agent(
    `You are a NATS technical writer. Write the "${p.ch}" deep-dive page "${p.slug}" (type: ${p.type}).

SOURCE OF TRUTH — read it fully and follow its outline row for THIS slug, its wording + boundary lockfiles, its link allow-list (§5.4), its nats-example div plan, and the NatsFlow scenario assigned to this page:
  ${SPEC(p.ch)}

READ THESE GOLD PAGES to lock voice + structure (do not copy content, copy the shape):
  ${GOLD[p.type]}

Also read the current stub at learn/${p.ch}/${p.slug}.md (confirm slug/title) and, if useful for continuity, one adjacent already-written page in this chapter.

${CONVENTIONS}

THIS PAGE:
- Path: learn/${p.ch}/${p.slug}.md
- Frontmatter: id: ${p.slug}, sidebar_position: ${p.pos}, ${p.num === null ? 'title with NO leading number' : `title beginning "${p.num}. "`}, a one-line description.
- Type ${p.type}: follow the matching skeleton in the conventions above.
${p.type === 'where-next' ? '- The Production checklist MUST collect the Pitfalls action items from EVERY content page in this chapter (read the sibling pages you need, or take them from the spec\'s §8.1 if present), grouped per page with a #pitfalls link — mirror learn/jetstream/where-next.md exactly.' : ''}
${p.type === 'content' ? '- Include a "## Pitfalls" section (2-4 gotchas, do/don\'t, one runnable handling example) BEFORE "## Where you are". Embed the page\'s assigned NatsFlow scenario. Create every nats-example div\'s matching CLI .sh file.' : ''}

Use the Write tool for the .md AND for each CLI .sh. Keep the pinned Acme ORDERS payload + entity names byte-identical to the spec. Return {page, snippets, natsflow, lines}.`,
    { label: `write:${p.ch}/${p.slug}`, phase: 'Write', schema: WRITE_SCHEMA }
  ),
  // Stage 2 — REVIEW (read-only) against the spec
  (w, p) => agent(
    `Read-only review of learn/${p.ch}/${p.slug}.md against its spec ${SPEC(p.ch)}. Do NOT edit.

Check and report concrete, actionable issues:
1. Links: every internal link is in the spec's §5.4 allow-list and resolves (sibling slugs that exist; /reference and /concepts paths from the list). Flag any invented path.
2. nats-example divs: each has data-type "learn-${p.ch}-${p.slug}-<snippet>" AND a matching committed file static/examples/snippets/cli/learn/${p.ch}/${p.slug}/<snippet>.sh whose dash-joined path equals the data-type. Flag missing/mismatched .sh.
3. NatsFlow: every data-scenario is one the spec lists for this chapter. Flag invented names.
4. Voice/lockfile: banned terms from the spec's wording lockfile; boundary-lockfile vocabulary used as if owned here (should be linked out, not taught). <=2 new concepts (content pages).
5. Continuity: payload + entity names match the spec; cluster/server names follow the spec's CONTINUITY OVERRIDE banner (n*-east) if present.
6. Structure: ${p.type === 'content' ? '## Pitfalls present and BEFORE ## Where you are; ## See also <=3 links; numbered title; sidebar_position ' + p.pos : p.type === 'where-next' ? '## Production checklist present and collects every content page\'s pitfalls with #pitfalls links; sidebar_position ' + p.pos : 'index has a ## Map table linking every page; sidebar_position 1'}.
7. Hygiene: no leaked tool-call tags (</content>, </invoke>, antml:); reasonable length.

Return {clean, issues[]} with severity blocker|major|minor and a precise fix for each. If perfect, clean=true and empty issues.`,
    { label: `review:${p.ch}/${p.slug}`, phase: 'Review', agentType: 'Explore', schema: REVIEW_SCHEMA }
  ).then(r => ({ review: r, p })),
  // Stage 3 — FIX (apply the findings)
  (rp, p) => {
    const review = rp && rp.review
    if (!review || review.clean || !(review.issues || []).length) {
      return { page: `learn/${p.ch}/${p.slug}.md`, applied: 0, notes: 'clean' }
    }
    const list = review.issues.map((i, n) => `${n + 1}. [${i.severity}] ${i.detail}`).join('\n')
    return agent(
      `Apply these review findings to learn/${p.ch}/${p.slug}.md (and its CLI .sh files where relevant). Spec: ${SPEC(p.ch)}.

FINDINGS:
${list}

Fix every blocker and major; fix minors where quick. Use Edit/Write. Keep the page within its skeleton and the spec's lockfiles/allow-list. Create any missing CLI .sh file (data-type must equal its dash-joined path). Do NOT introduce leaked tags. Return {page, applied, notes}.`,
      { label: `fix:${p.ch}/${p.slug}`, phase: 'Fix', schema: FIX_SCHEMA }
    )
  }
)

const ok = results.filter(Boolean)
log(`Pages done: ${ok.length}/${PAGES.length}`)
return { pages: ok.length, chapters }
