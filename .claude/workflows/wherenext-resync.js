export const meta = {
  name: 'wherenext-resync',
  description: 'Re-sync each affected chapter where-next Production checklist with its pages current Pitfalls',
  phases: [{ title: 'Resync', detail: 'one agent per chapter' }],
}

// Chapters whose content-page Pitfalls changed in the review pass.
const CHAPTERS = [
  'services','resilient-clients','key-value','object-store','jetstream',
  'clustering','monitoring','backup-recovery','deployment','security','topologies',
]

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['file', 'changed'],
  properties: { file: { type: 'string' }, changed: { type: 'boolean' }, note: { type: 'string' } },
}

phase('Resync')

const results = await parallel(CHAPTERS.map((ch) => () => agent(
  `Re-sync the Production checklist in learn/${ch}/where-next.md so it matches the CURRENT "## Pitfalls" sections of this chapter's content pages (some pitfalls were just edited).

STEPS:
1. List every content page in learn/${ch}/ (all *.md EXCEPT index.md and where-next.md).
2. For each, read its "## Pitfalls" section and extract the do/don't ACTION items (the actionable takeaways).
3. Open learn/${ch}/where-next.md and compare its "## Production checklist" to those items.
4. Update ONLY where it drifted: each page gets a group headed by a link to that page's "#pitfalls", followed by checkbox bullets ("- [ ] ...") that match the page's current pitfalls' action items (one short imperative line each). Mirror the exact format of learn/jetstream/where-next.md's Production checklist. Keep every content page represented; do not invent items not in the pages.

Be conservative: if a group already matches its page, leave it. Preserve the rest of where-next.md verbatim. No leaked tool-call tags. Use Edit/Write.

Return {file, changed, note}.`,
  { label: `resync:${ch}`, phase: 'Resync', schema: SCHEMA }
)))

const ok = results.filter(Boolean)
log(`Where-next resynced: ${ok.filter(r => r.changed).length}/${ok.length} changed`)
return { changed: ok.filter(r => r.changed).map(r => r.file) }
