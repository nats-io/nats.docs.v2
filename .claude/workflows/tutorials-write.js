export const meta = {
  name: 'tutorials-write',
  description: 'Research (NATS by Example + clients + server + blog) and write the 8 tutorials, then review + fix',
  phases: [
    { title: 'Write', detail: 'research the topic, then author the tutorial + CLI snippets' },
    { title: 'Review', detail: 'audit against the tutorial spec (no-lecture, self-verifiable steps)' },
    { title: 'Fix', detail: 'apply review findings' },
  ],
}

const SPEC = 'specs/2026-06-09-tutorials-design.md'

const TUTORIALS = [
  { slug: 'index', type: 'index', pos: 1, num: null,
    build: 'the landing / learning path', scenario: '', nbe: '', handoff: 'all tutorials + /learn/' },
  { slug: 'hello-nats', type: 'content', pos: 2, num: 1,
    build: 'install NATS, then publish and subscribe your first message (CLI in two terminals, then a client)',
    scenario: 'publishSubscribeAnimated', nbe: 'core/pub-sub (publish & subscribe)',
    handoff: '/learn/core-nats and /concepts/pub-sub-basics' },
  { slug: 'request-reply', type: 'content', pos: 3, num: 2,
    build: 'a tiny responder service and a request that calls it (e.g. a "time"/"greet" responder)',
    scenario: 'requestReply', nbe: 'core/request-reply',
    handoff: '/learn/core-nats/request-reply and /learn/services' },
  { slug: 'work-queue', type: 'content', pos: 4, num: 3,
    build: 'a queue group: run two workers and watch each message go to exactly one of them',
    scenario: 'queueGroupAnimated', nbe: 'core/queue (queue groups)',
    handoff: '/learn/core-nats/queue-groups' },
  { slug: 'first-stream', type: 'content', pos: 5, num: 4,
    build: 'your first JetStream stream: create it, publish a few messages, and replay the stored messages',
    scenario: 'jetStreamContrastAnimated', nbe: 'jetstream/manage-stream + publish',
    handoff: '/learn/jetstream and /learn/jetstream/your-first-stream' },
  { slug: 'stream-consumer', type: 'content', pos: 6, num: 5,
    build: 'a durable consumer that pulls messages, acknowledges them, and resumes where it left off after a restart',
    scenario: 'jetStreamConsumersAnimated', nbe: 'jetstream/consumer (pull consumer + ack)',
    handoff: '/learn/jetstream/your-first-consumer' },
  { slug: 'key-value', type: 'content', pos: 7, num: 6,
    build: 'a Key-Value bucket: put and get a value, then watch it change live from a second terminal',
    scenario: 'kvWatchAnimated', nbe: 'jetstream/kv (key-value store)',
    handoff: '/learn/key-value' },
  { slug: 'build-an-app', type: 'content', pos: 8, num: 7,
    build: 'a small runnable client app that connects, publishes events into a stream, and answers a request — combining pub/sub, request-reply, and JetStream',
    scenario: 'jetStreamConsumersAnimated', nbe: 'a combined messaging + jetstream example',
    handoff: 'the relevant /learn/ deep dives (core-nats, jetstream)' },
]

const RULES = `
TUTORIAL RULES (Diataxis tutorial — NOT a deep dive):
- Imperative, second person, present tense. Tell the reader what to DO, step by step.
- Every action step pairs a command with its EXPECTED result ("You should see ...").
- MINIMAL explanation: only what the step needs. NO pitfalls, NO trade-offs, NO "in
  production you'd...", NO edge cases — if tempted, replace with a one-line link to the
  deep dive. One clean happy path only.
- Reuse the project wording lockfile (subject, publish/subscribe, message, stream,
  consumer) so vocabulary matches the deep dives.
- Skeleton (content): intro (what you'll build + end result) -> "## What you'll need"
  (prereqs as bullets) -> numbered "## Step N: ..." (instruction + command + "you should
  see ...") -> "## What you built" (one-line recap) -> "## Next" (link the next tutorial
  AND the matching Learn deep dive for the why). 3-6 steps. 80-220 lines.
- Examples: nats-example div for app/CLI steps with a client form
  (<div class="nats-example" data-type="tutorials-<slug>-<snippet>" data-languages="cli,js,go,python,java,rust,csharp"></div>)
  + a committed CLI source at static/examples/snippets/cli/tutorials/<slug>/<snippet>.sh
  (#!/bin/bash, real commands; dir path dash-joins to the data-type). Plain fenced bash
  for install / nats-server start / "open two terminals" demos.
- NatsFlow: at most ONE existing scenario, only if it helps a beginner. Never a new one.
- Links ONLY from the spec's allow-list. No leaked tool-call tags.
`

const WRITE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['page', 'snippets', 'lines'],
  properties: {
    page: { type: 'string' },
    snippets: { type: 'array', items: { type: 'string' } },
    scenario: { type: 'string' },
    lines: { type: 'number' },
    sources: { type: 'array', items: { type: 'string' }, description: 'real URLs/repos consulted' },
  },
}
const REVIEW_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['clean', 'issues'],
  properties: {
    clean: { type: 'boolean' },
    issues: { type: 'array', items: { type: 'object', additionalProperties: false,
      required: ['severity', 'detail'],
      properties: { severity: { type: 'string', enum: ['blocker', 'major', 'minor'] }, detail: { type: 'string' } } } },
  },
}
const FIX_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['page', 'applied'],
  properties: { page: { type: 'string' }, applied: { type: 'number' }, note: { type: 'string' } },
}

phase('Write')

const results = await pipeline(
  TUTORIALS,
  // Stage 1 — research + write
  (t) => agent(
    t.type === 'index'
      ? `Write the Tutorials landing page tutorials/index.md. Read the spec ${SPEC} (§4.2 index skeleton). It introduces what tutorials are and how they differ from Concepts/Learn, then gives an ordered "Start here" path listing the 7 tutorials with a one-line outcome each (hello-nats, request-reply, work-queue, first-stream, stream-consumer, key-value, build-an-app), and a pointer to /learn/ for readers who want depth. Use only allow-listed links. Use the Write tool. Return {page, snippets:[], lines}.`
      : `Research, then WRITE the tutorial tutorials/${t.slug}.md (type content).

FIRST read the spec ${SPEC} (esp. §4 voice/skeleton, §4.3 link allow-list, §6 outline, §7 sources). The reader will BUILD: ${t.build}.

RESEARCH the exact commands + client code against real, current sources (load tools via ToolSearch as needed):
- WebFetch NATS by Example for the matching example (${t.nbe}); base the happy path + idioms on it. Try https://natsbyexample.com and the relevant category page. Cite the URL.
- nats-mcp ("select:mcp__nats-mcp__find_equivalent,mcp__nats-mcp__read_file,mcp__nats-mcp__search_code,mcp__nats-mcp__list_files") for the connect + pub/sub/request/consumer/kv idiom in nats.go and at least one other client (nats.js/nats.py).
- Verify every \`nats\` CLI subcommand/flag and \`nats-server\` startup is real and current.
- Optionally WebFetch https://nats.io/blog for tone.

${RULES}

THIS PAGE: id ${t.slug}, sidebar_position ${t.pos}, title begins "${t.num}. ". Reuse NatsFlow scenario: ${t.scenario || '(none)'}. Hands off to: ${t.handoff}.

Write tutorials/${t.slug}.md AND every CLI .sh it references (static/examples/snippets/cli/tutorials/${t.slug}/<snippet>.sh). Every step must be self-verifiable ("you should see ..."). Return {page, snippets, scenario, lines, sources}.`,
    { label: `write:${t.slug}`, phase: 'Write', schema: WRITE_SCHEMA }
  ),
  // Stage 2 — review
  (w, t) => agent(
    `Read-only review of tutorials/${t.slug}.md against the spec ${SPEC}. Do NOT edit.

Check:
1. It reads like a TUTORIAL, not a deep dive: imperative steps, every step has an expected result ("you should see ..."), and there are NO pitfalls / trade-offs / "in production" / edge-case digressions (those belong in /learn/). Flag any lecturing.
2. Skeleton present (content): intro with what-you'll-build, "What you'll need", numbered Steps, "What you built", "Next" with BOTH next-tutorial and a Learn deep-dive handoff.
3. nats-example divs: each has data-type "tutorials-${t.slug}-<snippet>" with a matching committed static/examples/snippets/cli/tutorials/${t.slug}/<snippet>.sh (dash-joined path equals data-type). data-scenario (if any) is an existing wired scenario.
4. Links only from the spec allow-list; commands look real/current; no leaked tags; length 80-220.

Return {clean, issues[]}.`,
    { label: `review:${t.slug}`, phase: 'Review', agentType: 'Explore', schema: REVIEW_SCHEMA }
  ).then(r => ({ review: r, t })),
  // Stage 3 — fix
  (rp, t) => {
    const r = rp && rp.review
    if (!r || r.clean || !(r.issues || []).length) return { page: `tutorials/${t.slug}.md`, applied: 0, note: 'clean' }
    const list = r.issues.map((i, n) => `${n + 1}. [${i.severity}] ${i.detail}`).join('\n')
    return agent(
      `Apply these review fixes to tutorials/${t.slug}.md (and its CLI .sh). Spec: ${SPEC}.
${list}
Fix blockers + majors; keep it a hand-held tutorial (no lecturing), stay on the allow-list, create any missing CLI .sh (data-type tutorials-${t.slug}-<snippet> must equal its path). Use Edit/Write. Return {page, applied, note}.`,
      { label: `fix:${t.slug}`, phase: 'Fix', schema: FIX_SCHEMA }
    )
  }
)

const ok = results.filter(Boolean)
log(`Tutorials done: ${ok.length}/${TUTORIALS.length}`)
return { pages: ok.length }
