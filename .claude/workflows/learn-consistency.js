export const meta = {
  name: 'learn-consistency',
  description: 'Cross-chapter semantic consistency audit of the Learn deep dives, then apply fixes',
  phases: [
    { title: 'Audit', detail: 'per-chapter boundary/lockfile/depth + cross-chapter narrative & cross-links' },
    { title: 'Fix', detail: 'apply the audit findings per chapter' },
  ],
}

const NEW = ['services','resilient-clients','key-value','object-store','clustering','monitoring','backup-recovery','deployment']
const ALL = ['core-nats','services','resilient-clients','key-value','object-store','jetstream','clustering','monitoring','backup-recovery','deployment','security','topologies']
const SPEC = (ch) => `specs/2026-06-05-${ch}-deep-dive-design.md`

const WORLD = `
PINNED WORLD (must be byte-identical everywhere): Acme order platform. Payload:
{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}
Subjects orders.created/shipped/cancelled. Cluster "east" with servers n1-east/n2-east/n3-east (client 4222, route 6222, monitor 8222). KV bucket INVENTORY (SKU->count). Object bucket INVOICES. Stream ORDERS (R3). Operator ACME; accounts ORDERS (user order-svc) + ANALYTICS (user analytics-reader). Services: OrderInventory (orders.inventory.check), shipping (shipping.quote). DR mirror ORDERS_DR on site2. K8s pods nats-0/1/2 == n1-east/n2-east/n3-east.`

const ISSUE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['issues'],
  properties: {
    issues: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['file', 'severity', 'detail'],
        properties: {
          file: { type: 'string', description: 'learn/<chapter>/<slug>.md (or docs/concepts/...) to change' },
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          detail: { type: 'string', description: 'what is inconsistent + the precise fix' },
        },
      },
    },
  },
}

phase('Audit')

// Per-chapter audits (the 8 new chapters): boundary, wording lockfile, depth, in-chapter continuity.
const chapterAudits = NEW.map((ch) => () => agent(
  `Read-only consistency audit of the "${ch}" Learn chapter against its spec ${SPEC(ch)} and the pinned world. Do NOT edit.

${WORLD}

Read every page under learn/${ch}/ and the spec. Flag ONLY real problems (be precise, cite the file):
1. BOUNDARY: any page that TEACHES material the spec's boundary lockfile says belongs to another chapter (should be a link, not a lesson). e.g. ${ch} must not re-teach deferred topics.
2. WORDING LOCKFILE: banned terms from the spec's wording lockfile; a concept used before it is defined; >2 new concepts on a content page.
3. CONTINUITY: payload/entity/cluster names that deviate from the pinned world above or drift between pages of this chapter.
4. DEPTH: any content page that reads like the Core Concepts primer (shallow) instead of going deeper/runnable — flag the section.
5. DUPLICATION: two pages in this chapter teaching the same mechanism twice instead of building on each other.

Return {issues[]} (file, severity, detail-with-fix). Empty if the chapter is consistent.`,
  { label: `audit:${ch}`, phase: 'Audit', agentType: 'Explore', schema: ISSUE_SCHEMA }
).then(r => r ? r.issues : []))

// Cross-chapter narrative + naming continuity across ALL 12 chapters.
const narrativeAudit = () => agent(
  `Read-only audit of NARRATIVE CONTINUITY across the whole Learn section. Do NOT edit.

${WORLD}

The 12 chapters are: ${ALL.join(', ')}. Read every chapter's index.md and where-next.md, plus any content page where the running scenario is introduced or evolved. Verify the Acme ORDERS story is ONE coherent world across all chapters:
- payload bytes, subjects, stream name (ORDERS), accounts (ORDERS/ANALYTICS), operator (ACME), services (OrderInventory/shipping), buckets (INVENTORY/INVOICES), cluster "east" + n*-east, DR mirror ORDERS_DR — all consistent, no contradictions.
- The story PROGRESSES sensibly (core -> services -> resilience -> jetstream -> kv/object -> topologies -> clustering -> monitoring -> backup -> deployment) without a chapter contradicting an earlier one.
Flag any place a name, number, role, or fact contradicts the pinned world or another chapter. Return {issues[]} (file, severity, detail-with-fix).`,
  { label: 'audit:narrative', phase: 'Audit', agentType: 'Explore', schema: ISSUE_SCHEMA }
).then(r => r ? r.issues : [])

// Cross-link reciprocity: where-next sibling sections + concept cross-links.
const linkAudit = () => agent(
  `Read-only audit of CROSS-LINK reciprocity across the Learn section. Do NOT edit.

Read all 12 chapters' where-next.md and index.md, and the four Core Concepts pages that have matching deep dives (docs/concepts/jetstream.md, docs/concepts/security.md, docs/concepts/topologies.md, docs/concepts/pub-sub-basics.md, docs/concepts/request-reply.md, docs/concepts/queue-groups.md, docs/concepts/subjects.md).

Check:
1. Every chapter's "Sibling deep dives" / where-next section points to RELATED chapters that exist, and the descriptions are accurate (e.g. KV/Object-Store say they are built on streams; Clustering says it is the mechanism under Topologies; Monitoring/Backup/Deployment are reachable).
2. Reciprocity: the JetStream where-next already forward-links KV, Object-Store, Clustering, Monitoring, Backup — confirm those chapters link back to JetStream where natural.
3. Concept primers: where a deep dive exists for a concept primer (jetstream, security, topologies, pub-sub/request-reply/queue-groups/subjects -> core-nats), the primer should carry a ":::tip" pointer to the deep dive. Flag any MISSING primer->deep-dive pointer (only for concepts that have a deep dive). Do not invent links to non-existent pages.

Return {issues[]} (file, severity, detail-with-fix). Only flag real gaps.`,
  { label: 'audit:crosslinks', phase: 'Audit', agentType: 'Explore', schema: ISSUE_SCHEMA }
).then(r => r ? r.issues : [])

const all = await parallel([...chapterAudits, narrativeAudit, linkAudit])
const issues = all.filter(Boolean).flat()
log(`Audit found ${issues.length} issues`)

// Group issues by chapter (derive from file path) for fixing.
const groups = {}
for (const it of issues) {
  const m = (it.file || '').match(/learn\/([^/]+)\//) || (it.file || '').match(/docs\/(concepts)\//)
  const key = m ? m[1] : 'other'
  ;(groups[key] || (groups[key] = [])).push(it)
}
const keys = Object.keys(groups)
log(`Issues span ${keys.length} groups: ${keys.join(', ')}`)

phase('Fix')

const fixed = await parallel(keys.map((key) => () => {
  const list = groups[key]
  const actionable = list.filter(i => i.severity !== 'minor' || true) // apply all; fixer judges
  const text = actionable.map((i, n) => `${n + 1}. [${i.severity}] ${i.file}: ${i.detail}`).join('\n')
  return agent(
    `Apply these consistency fixes to the "${key}" area. Each names a file and the change. Use Edit/Write. Stay within each chapter's spec lockfiles and link allow-list (specs under specs/). Keep the pinned world consistent:
${WORLD}

FINDINGS:
${text}

Fix every blocker and major; apply minors when quick and safe. For a CONCEPT primer cross-link, add a ":::tip" admonition near the top pointing to the deep dive (match the style already used in docs/concepts/security.md / topologies.md / pub-sub-basics.md). Do NOT introduce broken links or leaked tool tags. Return {issues[]} as an empty array if nothing needed changing, else summarize — actually return {file:"summary", severity:"minor", detail:"<what you changed>"} entries.`,
    { label: `fix:${key}`, phase: 'Fix', schema: ISSUE_SCHEMA }
  ).then(r => ({ key, applied: r ? r.issues.length : 0 }))
}))

log(`Fix groups processed: ${fixed.filter(Boolean).length}`)
return { issues: issues.length, groups: keys, fixedGroups: fixed.filter(Boolean) }
