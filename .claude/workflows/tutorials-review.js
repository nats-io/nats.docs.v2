export const meta = {
  name: 'tutorials-review',
  description: 'Full reviewer battery on the 8 tutorials: source-verified accuracy + sentence-by-sentence proofread + tutorial-voice, then fix',
  phases: [
    { title: 'Review', detail: 'verify every command/output vs source; proofread; enforce tutorial discipline' },
    { title: 'Fix', detail: 'apply findings' },
  ],
}

const SPEC = 'specs/2026-06-09-tutorials-design.md'
const PAGES = ['index','hello-nats','request-reply','work-queue','first-stream','stream-consumer','key-value','build-an-app']

const REVIEW_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['clean', 'issues'],
  properties: {
    clean: { type: 'boolean' },
    issues: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['kind', 'severity', 'detail'],
        properties: {
          kind: { type: 'string', enum: ['accuracy', 'voice', 'grammar', 'stale', 'link', 'snippet'] },
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          detail: { type: 'string', description: 'the problem + the exact fix; for accuracy, cite the source' },
        },
      },
    },
  },
}
const FIX_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['page', 'applied'],
  properties: { page: { type: 'string' }, applied: { type: 'number' }, note: { type: 'string' } },
}

phase('Review')

const results = await pipeline(
  PAGES,
  // Stage 1 — full review (source-verified accuracy + proofread + tutorial discipline)
  (slug) => agent(
    `Full review of tutorials/${slug}.md. Read-only — report findings, do NOT edit. Spec: ${SPEC}.

Read the page AND every CLI snippet it embeds (static/examples/snippets/cli/tutorials/${slug}/*.sh).

Apply THREE lenses:

1. ACCURACY (source-verified). Verify EVERY \`nats\`/\`nats-server\` command, flag, subcommand, and every "you should see ..." expected-output block is real and current. Load nats-mcp ("select:mcp__nats-mcp__find_equivalent,mcp__nats-mcp__read_file,mcp__nats-mcp__search_code,mcp__nats-mcp__list_files") to check natscli + nats-server + the client libs (nats.go + one more) for the exact commands/idioms; WebFetch https://natsbyexample.com for the matching example to confirm the happy path. For the build-an-app capstone, sanity-check the client code compiles/runs as written. Flag anything wrong, outdated, or whose claimed output would not actually appear. Cite the source.

2. PROOFREAD (sentence by sentence). Grammar, spelling, punctuation, subject-verb, garbled/run-on sentences, doubled words, broken Markdown/MDX. Plus STALE-STATE language: any "coming soon / to be written / not yet / TODO / stub" (there should be none).

3. TUTORIAL DISCIPLINE. It must read like a hand-held tutorial, NOT a deep dive: imperative numbered steps; every step self-verifiable ("you should see ..."); a "What you built" recap; a "Next" that links the next tutorial AND a /learn deep dive. Flag any LECTURING — pitfalls, trade-offs, "in production you'd…", edge-case digressions, mechanism explanations — that belongs in /learn, not here. Also flag links not on the spec allow-list and any nats-example data-type whose committed .sh is missing (tutorials-${slug}-<snippet> must match its path).

Return {clean, issues[]}. Be precise and conservative — only REAL issues.`,
    { label: `review:${slug}`, phase: 'Review', agentType: 'Explore', schema: REVIEW_SCHEMA }
  ).then(r => ({ review: r, slug })),
  // Stage 2 — fix
  (rp, slug) => {
    const r = rp && rp.review
    if (!r || r.clean || !(r.issues || []).length) return { page: `tutorials/${slug}.md`, applied: 0, note: 'clean' }
    const list = r.issues.map((i, n) => `${n + 1}. [${i.kind}/${i.severity}] ${i.detail}`).join('\n')
    return agent(
      `Apply these review fixes to tutorials/${slug}.md (and its CLI .sh files). Spec: ${SPEC}.

${list}

Fix every accuracy blocker/major (correct the command/flag/output to match source) and every grammar/stale/link/snippet issue. For VOICE issues, remove lecturing and keep it a hand-held tutorial. Be conservative on already-correct prose. Stay on the spec link allow-list; any nats-example div needs its committed .sh (data-type tutorials-${slug}-<snippet> equals its path). No leaked tags. Use Edit/Write. Return {page, applied, note}.`,
      { label: `fix:${slug}`, phase: 'Fix', schema: FIX_SCHEMA }
    )
  }
)

const ok = results.filter(Boolean)
const changed = ok.filter(r => r.applied > 0)
log(`Reviewed ${ok.length} tutorials; fixed ${changed.length}`)
return { reviewed: ok.length, fixed: changed.map(r => r.page) }
