export const meta = {
  name: 'concept-signposts',
  description: 'Replace top :::tip boxes on concept pages with an inline pointer + end-of-page Next steps (Diataxis/NN-g/Google-backed)',
  phases: [{ title: 'Signpost', detail: 'one agent per concept page' }],
}

// type: 'deepdive' = 1:1 with a Learn chapter (inline pointer + Next steps);
//       'meta' = overview page (Next steps only, no forced inline pointer);
//       'getting-started' = already has a Next steps; fold the deep-dive links in.
const PAGES = [
  { file: 'docs/concepts/jetstream.md', type: 'deepdive',
    primary: ['JetStream deep dive', '/learn/jetstream'],
    related: [['Key-Value deep dive', '/learn/key-value'], ['Object Store deep dive', '/learn/object-store']] },
  { file: 'docs/concepts/pub-sub-basics.md', type: 'deepdive',
    primary: ['Core NATS deep dive', '/learn/core-nats'],
    related: [['Publish-subscribe, step by step', '/learn/core-nats/publish-subscribe']] },
  { file: 'docs/concepts/queue-groups.md', type: 'deepdive',
    primary: ['Queue groups in the Core NATS deep dive', '/learn/core-nats/queue-groups'],
    related: [['Services (queue-group load balancing)', '/learn/services'], ['JetStream worker pools', '/learn/jetstream/worker-pool']] },
  { file: 'docs/concepts/request-reply.md', type: 'deepdive',
    primary: ['Request-reply in the Core NATS deep dive', '/learn/core-nats/request-reply'],
    related: [['The Services framework', '/learn/services']] },
  { file: 'docs/concepts/security.md', type: 'deepdive',
    primary: ['Security deep dive', '/learn/security'],
    related: [['Encryption & TLS', '/learn/security/encryption'], ['Operator mode', '/learn/security/operator-mode']] },
  { file: 'docs/concepts/subjects.md', type: 'deepdive',
    primary: ['Subjects and wildcards in the Core NATS deep dive', '/learn/core-nats/subjects-and-wildcards'],
    related: [['Subject-based authorization', '/learn/security/authorization']] },
  { file: 'docs/concepts/topologies.md', type: 'deepdive',
    primary: ['Topologies deep dive', '/learn/topologies'],
    related: [['Clustering & replication (the mechanism)', '/learn/clustering']] },
  { file: 'docs/concepts/what-is-nats.md', type: 'meta',
    primary: ['Core NATS deep dive', '/learn/core-nats'],
    related: [['The full Learn section', '/learn']] },
  { file: 'docs/concepts/intro.md', type: 'meta',
    primary: ['Start with the Core NATS deep dive', '/learn/core-nats'],
    related: [['Browse the Learn section', '/learn']] },
  { file: 'docs/concepts/ecosystem.md', type: 'meta',
    primary: ['The Learn deep dives', '/learn'],
    related: [['Resilient clients', '/learn/resilient-clients'], ['Services', '/learn/services']] },
  { file: 'docs/concepts/getting-started/index.md', type: 'getting-started',
    primary: ['Core NATS deep dive', '/learn/core-nats'],
    related: [['The full Learn section', '/learn'], ['JetStream deep dive', '/learn/jetstream']] },
]

const GUIDANCE = `
GOAL: replace the top-of-page :::tip "Want the full chapter?" signpost (a boxed
admonition right under the title) with the evidence-backed pattern. This is NOT a
content rewrite — touch only the signpost.

WHY (research-backed, do not restate in the page): top boxed admonitions suffer
banner-blindness (NN/g) and the Splunk style guide forbids an admonition
immediately after a title; Diataxis says explanation pages should "make
connections" and link out; Google supplies the inline phrasing; Kubernetes/
Microsoft codify an end-of-page "Next steps" list (max ~5). So: a deliberate
inline pointer for deep-link arrivals + a named end-of-page section, NOT a box.

DO:
1. REMOVE the entire top ":::tip ... :::" block (and any now-orphaned blank line).
   If the page has no such block, skip this step.
2. For a 'deepdive' page: add ONE inline prose pointer at the END of the intro
   (after the first paragraph or two that deliver the page's first value — never
   before the explanation starts). Use deliberate, recognized phrasing, e.g.:
   "To build this in practice, see the [<primary label>](<primary url>)." or
   "For a runnable, step-by-step treatment, see the [<primary label>](<primary url>)."
   Keep it to ONE sentence, plain prose, no box, no heading.
3. Add a named end-of-page section "## Next steps" as the LAST section, a short
   bulleted list (MAX 5) leading with the primary deep dive, then the related
   links. One line each, e.g. "- [<label>](<url>) — <4-8 word why>".
   For a 'meta' page: do step 1 and step 3 only (NO inline pointer — these
   overview pages have no single 1:1 chapter).
   For a 'getting-started' page: it ALREADY has a "## Next steps". Do NOT add a
   second one — fold the provided links into the existing section (lead with the
   deep dives), keeping it <=5 bullets total and de-duped. Still remove any
   top :::tip if present.

CONSTRAINTS:
- Use ONLY the exact link URLs provided for this page. Do not invent or alter paths.
- Exactly ONE end-of-page link section (no duplicate "See also" + "Next steps").
- Preserve the page's voice, headings, and all other content verbatim.
- No leaked tool-call tags. Keep Docusaurus admonition/markdown valid.
`

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['file', 'removedTip', 'addedInline', 'addedNextSteps'],
  properties: {
    file: { type: 'string' },
    removedTip: { type: 'boolean' },
    addedInline: { type: 'boolean' },
    addedNextSteps: { type: 'boolean' },
    note: { type: 'string' },
  },
}

phase('Signpost')

const results = await parallel(PAGES.map((p) => () => {
  const rel = p.related.map(([l, u]) => `  - ${l} -> ${u}`).join('\n')
  return agent(
    `Apply the concept-page signpost pattern to ${p.file} (type: ${p.type}).

${GUIDANCE}

THIS PAGE:
- Primary deep-dive link: [${p.primary[0]}](${p.primary[1]})
- Related links (for Next steps, optional, keep total <=5):
${rel || '  (none)'}

Read ${p.file}, make the edits with Edit/Write, and return the result object.`,
    { label: `signpost:${p.file.split('/').slice(-1)[0]}`, phase: 'Signpost', schema: SCHEMA }
  )
}))

const ok = results.filter(Boolean)
log(`Concept pages updated: ${ok.length}/${PAGES.length}`)
return {
  updated: ok.length,
  removedTip: ok.filter(r => r.removedTip).length,
  addedNextSteps: ok.filter(r => r.addedNextSteps).length,
  files: ok.map(r => r.file),
}
