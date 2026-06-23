export const meta = {
  name: 'style-humanize',
  description: 'De-AI style pass on all Learn + Tutorials pages against Synadia style guide + Concepts voice, with per-page adversarial verification',
  phases: [
    { title: 'Restyle', detail: 'one agent per page: rewrite prose to Synadia voice, preserve all technical content' },
    { title: 'Verify', detail: 'adversarial diff check: facts/code/links intact, slop actually gone, fix residue' },
  ],
}

const CHAPTER_PAGES = {
  'core-nats': ['index','publish-subscribe','subjects-and-wildcards','request-reply','queue-groups','scatter-gather','where-next'],
  'services': ['index','your-first-service','endpoints-and-groups','discovery','observability','scaling','where-next'],
  'resilient-clients': ['index','connecting','reconnection','drain-and-shutdown','slow-consumers','request-reply-resilience','tls-and-auth','where-next'],
  'jetstream': ['index','why-a-stream','your-first-stream','publishing','reading-back','your-first-consumer','filtering','acknowledgment','pull-consumers','worker-pool','priority-groups','pausing','push-vs-pull','shaping-the-stream','delivery-semantics','message-ttl','surviving-node-loss','mirrors-and-sources','where-next'],
  'key-value': ['index','your-first-bucket','watching','history-and-revisions','ttl-and-limits','under-the-hood','where-next'],
  'object-store': ['index','your-first-object','chunking','metadata-and-links','watching-and-listing','under-the-hood','where-next'],
  'topologies': ['index','single-server','your-first-cluster','jetstream-in-a-cluster','super-clusters','leaf-nodes','putting-it-together','where-next'],
  'security': ['index','accounts-and-multitenancy','authentication-basics','decentralized-auth','operator-mode','authorization','cross-account','encryption','auth-callout','where-next'],
  'clustering': ['index','forming-a-cluster','raft-and-leaders','replication-and-r3','placement','scaling-and-peers','where-next'],
  'monitoring': ['index','monitoring-endpoints','jetstream-health','advisories-and-events','prometheus-and-dashboards','where-next'],
  'backup-recovery': ['index','stream-backup-restore','mirrors-and-sources','disaster-recovery','config-and-jwt-backup','where-next'],
  'deployment': ['index','sizing-and-resources','kubernetes','config-management','rolling-upgrades','hardening','where-next'],
}
const TUTORIALS = ['index','hello-nats','request-reply','work-queue','first-stream','stream-consumer','key-value','build-an-app']

const PAGES = [{ file: 'learn/index.md', kind: 'learn', label: 'learn/index' }]
for (const ch of Object.keys(CHAPTER_PAGES))
  for (const slug of CHAPTER_PAGES[ch])
    PAGES.push({ file: `learn/${ch}/${slug}.md`, kind: 'learn', label: `${ch}/${slug}` })
for (const slug of TUTORIALS)
  PAGES.push({ file: `tutorials/${slug}.md`, kind: 'tutorial', label: `tutorials/${slug}` })

log(`Style pass over ${PAGES.length} pages (${PAGES.length - TUTORIALS.length} learn + ${TUTORIALS.length} tutorials)`)

const STYLE = `
SYNADIA STYLE GUIDE (style-guide.pdf — the authority) + this site's voice. Apply ALL of these:

1. CONTRACTIONS — REQUIRED. The guide says "use contractions": can't, don't, doesn't, isn't, won't, you'll, it's, that's, you're. The current text almost never uses them (18 in 145k words) and reads stiff and machine-written. Convert "does not"->"doesn't", "cannot"->"can't", "is not"->"isn't", "it is"->"it's" (when unstressed), etc. EXCEPTION: keep the uncontracted form when the negation itself is the point and carries stress ("The message is NOT redelivered"), in formal warnings, and always inside code/output blocks.
2. EM DASHES — SPARINGLY. The corpus averages ~17 em dashes per page; that's the loudest AI tell. Keep at most a few per page, only for a genuinely abrupt break. Convert the rest: parenthetical asides -> commas or parentheses; "X — Y explains X" -> colon or new sentence; appended afterthoughts -> their own sentence. Surviving em dashes keep spaces on both sides. Never touch dashes inside code, output, or frontmatter.
3. Voice: second person, active voice, present tense. FLAT and PLAIN — explain the complex thing in everyday words and stop. The style-guide.pdf "Sage" (p2/p5) means making complex things simple, NOT performing wit; "witty yet subtle" and "funny without trying to be funny" mean restraint. No persona, no jokes, no charm. Warmth, if any, is invisible. Don't add personality the source doesn't need.
4. Orwell rules (hard, p19): cut a word if you can; short word over long (use -> not utilize/leverage; big -> not extensive); NO metaphor, simile, or personification you'd commonly see ("surgery", "shouting into the void", "take it in stride"); everyday word over jargon; ONE technical idea per sentence — don't stack jargon; define a term before using it.
5. No "i.e." / "e.g." — write "that is" / "for example" (or restructure).
6. Numbers one through ten spelled out in prose; numerals after ten. Never change numbers in code, commands, output, ports, versions, or config.
7. Headings: sentence case, no trailing periods, action verbs over gerunds where natural. Do NOT renumber or retitle pages (keep "1. Why a stream" style titles and ids).
8. Lists: prefer six items or fewer, parallel phrasing; bulleted fragments lowercase without trailing period; numbered steps capitalized with period. If a bullet list is really flowing prose chopped up, consider merging it back into a paragraph.
9. At most one exclamation mark per page. Oxford comma. US English.
10. KILL AI-SLOP TICS — HARD BANS, not "when overused": the "X is not Y. It's Z." / "It does not mean…" / "not A but B" rhetorical inversion (allowed ONLY when the contrast is the genuine technical point, then ONE plain sentence); rule-of-three / parallel triads for rhythm; dramatic one-line sentence fragments for effect; evocative or cute headings (headings are plain and descriptive, doc H1s use an action verb, p20); filler ("It's important to note", "Note that", "In this section we will", "Let's dive in / delve", "seamless(ly)", "robust", "powerful", "leverage", "simply", "essentially", "Whether you're X or Y"); over-bolding (bold a term ONCE, at its definition). Don't vary rhythm for its own sake — state each fact once, plainly.
11. Do NOT convert straight quotes/apostrophes to curly typography (deliberate deviation: too risky in MDX).

VOICE CALIBRATION: target is FLAT and readable. Two passes — (1) flatten: remove every banned tic above; (2) de-jargon: lower IT-lingo density, one idea per sentence, everyday words, so flat doesn't become a jargon wall. Keep contractions and the dash-diet throughout.`

const PRESERVE = `
PRESERVE EXACTLY — these are hard invariants, byte-identical unless a finding forces otherwise:
- Frontmatter (id, title, sidebar_position, description). You MAY restyle the description string's wording only if it violates a rule above.
- ALL code blocks, command lines, expected-output blocks, config snippets — every byte.
- ALL <div class="nats-example" ...> and <div class="nats-flow" ...> lines, import lines, Tabs/TabItem markup, admonitions (:::tip etc.) structure.
- ALL links: every target stays identical; link text may be lightly restyled only if it violates a rule.
- Section skeleton: heading hierarchy and order, "## Pitfalls", "Production checklist", "## Next steps", where-next checklists. Restyle sentences INSIDE them; never add/remove/reorder items or sections.
- Every technical fact, number, default, flag, subject name, and the pinned Acme world: ORDERS stream, orders.created/shipped/cancelled, payload {"order_id":"ord_8w2k",...}, cluster "east", n1-east/n2-east/n3-east, accounts ORDERS/ANALYTICS, operator ACME, buckets INVENTORY/INVOICES, services OrderInventory/shipping, mirror ORDERS_DR.
- Meaning. This is a STYLE pass: zero new claims, zero dropped claims. Total length stays within roughly ±10%.`

const REWRITE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['file', 'edited', 'summary'],
  properties: {
    file: { type: 'string' },
    edited: { type: 'boolean' },
    emDashesBefore: { type: 'number' },
    emDashesAfter: { type: 'number' },
    summary: { type: 'string', description: 'one short line: what kinds of changes were applied' },
  },
}

const VERIFY_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['file', 'ok', 'fixed'],
  properties: {
    file: { type: 'string' },
    ok: { type: 'boolean', description: 'true once the file is verified clean (after your own fixes)' },
    fixed: { type: 'array', items: { type: 'string' }, description: 'problems you found in the rewrite and fixed yourself' },
    unresolved: { type: 'array', items: { type: 'string' }, description: 'anything needing human eyes' },
  },
}

phase('Restyle')

const results = await pipeline(
  PAGES,
  // Stage 1 — rewrite in place
  (p) => agent(
    `Style-humanize ${p.file} in place with Edit. The page is technically reviewed and accurate, but it reads AI-generated: stiff (no contractions), em-dash-saturated, formulaic. Your job is prose voice ONLY.
${p.kind === 'tutorial'
  ? 'This is a hand-held TUTORIAL: keep imperative numbered steps, every "you should see ..." check, the "What you built" recap and "Next" links. Restyle sentences, never the step mechanics.'
  : 'This is a Learn deep-dive page: it should DO and EXPLAIN in the Rust-book register, one teaching thought per paragraph.'}
${STYLE}
${PRESERVE}

PROCESS: read the two calibration pages, then read ${p.file} top to bottom and rewrite sentence by sentence where a rule applies. Don't rewrite sentences that already read human and break no rule. Count em dashes in prose before and after (grep -o '—' ${p.file} | wc -l is fine). Return {file, edited, emDashesBefore, emDashesAfter, summary}.`,
    { label: `restyle:${p.label}`, phase: 'Restyle', schema: REWRITE_SCHEMA }
  ).then(r => ({ rewrite: r, p })),
  // Stage 2 — adversarial verify + fix residue
  (rp, p) => agent(
    `Adversarially verify the style rewrite of ${p.file} and FIX any problem you find directly with Edit.

Run: git diff -- ${p.file}   (and read the full current file).

CHECK, in order of importance:
1. NOTHING TECHNICAL CHANGED: every code block, command, expected output, config value, port, version, subject, name from the Acme world (ORDERS, orders.*, ord_8w2k, east, n1-east/n2-east/n3-east, ORDERS/ANALYTICS accounts, ACME, INVENTORY, INVOICES, OrderInventory, shipping, ORDERS_DR), every link target, every nats-example/nats-flow div, import, Tabs markup, frontmatter id/sidebar_position — byte-identical to the pre-rewrite side of the diff. Heading set and order unchanged; Pitfalls/checklist/Next-steps items same count and meaning. If the rewrite altered or dropped ANY of these, restore it from the diff.
2. NO MEANING DRIFT: read each changed hunk; the new sentence must claim exactly what the old one claimed. Fix drift.
3. MDX VALID: no leaked tool-call tags (</content>, <result>, antml), no broken fences/links/JSX, file still starts with frontmatter.
4. STYLE ACTUALLY APPLIED: contractions present where natural; prose em dashes down to a few at most (run grep -o '—' ${p.file} | wc -l; code blocks may contain some); no "i.e./e.g."; slop tics gone. If the rewriter was timid and stiff machine-prose remains, apply the missing fixes yourself:
${STYLE}
5. It still sounds like the same author as docs/concepts/jetstream.md, just warmer and looser — not flattened, not over-casual.

Return {file, ok, fixed, unresolved}.`,
    { label: `verify:${p.label}`, phase: 'Verify', schema: VERIFY_SCHEMA }
  )
)

const ok = results.filter(Boolean)
const verified = ok.filter(r => r.ok)
const unresolved = ok.flatMap(r => (r.unresolved || []).map(u => `${r.file}: ${u}`))
log(`Verified ${verified.length}/${ok.length} pages; ${unresolved.length} unresolved notes`)
return {
  pages: ok.length,
  verified: verified.length,
  fixedByVerifier: ok.reduce((n, r) => n + (r.fixed || []).length, 0),
  unresolved,
}
