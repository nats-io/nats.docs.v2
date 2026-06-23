# NATS Documentation Style Guide

> AI-focused guide for maintaining NATS documentation consistency.

## 🔴 MUST Rules (Non-Negotiable)

### Code Example Tabs

**Required structure:**
```mdx
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```bash
nats pub hello "Hello NATS!"
```

</TabItem>
<TabItem value="js" label="JavaScript/TypeScript">

```javascript
await nc.publish("hello", "Hello NATS!");
```

</TabItem>
</Tabs>
```

**Rules:**
1. CLI tab MUST be first with `default` attribute
2. MUST use `groupId="lang"` for synchronized tabs
3. MUST use `bash` language for CLI code blocks (not sh/shell/zsh)
4. MUST import Tabs components at top of MDX files
5. MUST follow language order: CLI, JavaScript/TypeScript, Go, Python, Java, Rust, C#/.NET

### Code Example Workflow

**MUST use `nats-example` tags for almost every code snippet:**
```mdx
<div class="nats-example" data-type="basics-publish" data-languages="cli,js,go,python,java,rust,csharp"></div>
```

**Only use inline `<Tabs groupId="lang">` when:**
- The snippet is purely language-specific (e.g., a nats.js-only API)
- The snippet is purely bash-specific (e.g., server configuration commands)
- The example is trivial and doesn't warrant entries in client repos

In all other cases, use `nats-example` tags and add examples to the multi-repo system.

**Adding new examples:**

1. **CLI**: Write in `static/examples/snippets/cli/[page]/[snippet].sh` (this repo)
   - Example name auto-generated from path: `cli/basics/publish.sh` → `basics-publish`
   - **IMPORTANT**: CLI examples must be committed to git
   - Use: `git add static/examples/snippets/cli/[page]/[snippet].sh`
   - See `static/examples/snippets/cli/README.md` for details

2. **Go**: Write in `~/coding/nats.go-docs` at `examples/docs/[page]-[snippet]/main.go` (doc-examples branch)
   - Commit and push to nats-io/nats.go doc-examples branch
   - **IMPORTANT**: Add entry to `EXAMPLES_CONFIG` in `scripts/fetch-examples.js`:
     ```javascript
     "queue-groups-basic": "examples/docs/queue-groups-basic/main.go"
     ```
   - Fetched during build via `npm run fetch-examples`

3. **Rust**: Write in `~/coding/nats.rs-docs` at `async-nats/examples/docs_[page]_[snippet].rs` (doc-examples branch)
   - Commit and push to nats-io/nats.rs doc-examples branch
   - **IMPORTANT**: Add entry to `EXAMPLES_CONFIG` in `scripts/fetch-examples.js`:
     ```javascript
     "queue-groups-basic": "async-nats/examples/docs_queue_groups_basic.rs"
     ```
   - Fetched during build via `npm run fetch-examples`

4. **Fetch & metadata**: Run `npm run fetch-examples` to:
   - Pull Go/Rust examples from GitHub (based on EXAMPLES_CONFIG entries)
   - Auto-scan CLI examples from directory structure
   - Auto-generate `metadata.json` with all example information

**Optional markers** (to exclude setup code):
```go
// NATS-DOC-START
nc.Publish("subject", []byte("hello"))
// NATS-DOC-END
```

## 🟡 SHOULD Rules (Best Practices)

### Code Examples
- Include 3+ languages when possible (minimum: CLI, JS, Go)
- Keep examples focused (under 20 lines)
- Show complete, runnable code
- Add comments for complex operations
- Show expected output when helpful
- Use realistic names (not foo/bar)
- Include errors ONLY if they teach the concept

**Decision tree:**
```
Basic operation (pub/sub/request)? → CLI, JS, Go minimum
Language-specific feature? → Only relevant languages
General feature? → All available languages
```

### Writing Style

Flat and plain. Explain the complex thing in everyday words and stop. The
authority is `style-guide.pdf` (Synadia Content Style Guide); its "Sage" voice
means making complex things simple (Orwell's rules, p19), not performing wit.

- Active voice, present tense, second person, contractions.
- State each fact once, directly. No setup, no payoff, no persona.
- Everyday word over jargon; one technical idea per sentence; define a term
  before using it.
- Headings are plain and descriptive; doc page-title H1s use an action verb (p20).
- Progressive complexity (simple → advanced); link to Reference for exhaustive details.

**Hard bans (the AI-style tics):**
- "X is not Y. It's Z." / "It does not mean…" as a device — allowed only when the
  contrast is the genuine technical point, then one plain sentence.
- Metaphor, simile, or personification you'd commonly see ("surgery", "shouting
  into the void").
- Rule-of-three / triads for rhythm; dramatic one-line fragments for effect;
  evocative or cute headings.
- Filler ("it's important to note", "simply", "powerful", "leverage", "seamless").
- Over-bolding — bold a term once, at its definition.

### Interactive Animations

**Use NatsFlow for:**
- Message flow patterns (pub/sub, request/reply)
- Timing/sequencing
- Fan-out, load balancing
- JetStream operations

**Don't use NatsFlow for:**
- API syntax (use code examples)
- Configuration (use code blocks)
- Static architecture (use diagrams)

**Usage:**
```mdx
import { NatsFlow, publishSubscribeScenario } from '@site/src/components/NatsFlow';

<NatsFlow scenario={publishSubscribeScenario} />
```

Available scenarios: `publishSubscribeScenario`, `requestReplyScenario`, `fanOutScenario`, `queueGroupScenario`

## 🟢 MAY Rules (Optional)

- Additional language examples beyond core set
- Debug mode: `<NatsFlow scenario={x} debug={true} />`
- "Under the Hood" sections revealing mechanisms
- Language-specific notes in expandable sections
- Error cases when they teach concepts
- Links to related concepts
- Troubleshooting sections

## ⛔ NEVER Rules

- Create documentation without testing examples
- Use images for code (must be copy-pasteable)
- Skip language label in TabItem
- Use relative imports (use `@site/` alias)
- Introduce advanced concepts before foundations
- Document every parameter (link to reference instead)

---

## Technical Reference

### Code Examples System

**How it works:**
1. `scripts/fetch-examples.js` fetches from GitHub repos (nats.go, nats.rs)
2. Extracts snippets using `NATS-DOC-START/END` markers
3. Organizes by page/snippet
4. Generates metadata.json

**Output:** `static/examples/snippets/` (gitignored, regenerated on build)

### NatsFlow Props
```typescript
interface NatsFlowProps {
  scenario: Scenario;              // Required
  customButtons?: ControlButton[]; // Optional
  width?: number;                  // Default: 800
  height?: number;                 // Default: 400
  showDefaultControls?: boolean;   // Default: true
  debug?: boolean;                 // Default: false
}
```

See `src/components/NatsFlow/README.md` for custom scenarios.

### Common Commands
```bash
npm start              # Dev server (localhost:3000)
npm run build          # Build site
npm run typecheck      # Type checking
npm run fetch-examples # Fetch code examples
```

### Architecture
- **docs/**: Documentation pages (Markdown/MDX) - served at root "/"
- **src/components/**: React components (use `@site/` imports)
- **static/**: Static assets
- **docusaurus.config.ts**: Site configuration

### Brand Colors
- Primary Blue: `#27AAE1`
- Navy: `#375C93`
- Green: `#34A574`
- Lime: `#8DC63F`

---

## Pre-Commit Validation

**Technical:**
- [ ] CLI is default tab with `groupId="lang"`
- [ ] Tabs imported at top of MDX
- [ ] Code blocks specify language
- [ ] Examples tested and working
- [ ] Links are valid
- [ ] `npm run typecheck` passes

**Content:**
- [ ] Flat, plain tone — no AI-style tics (antithesis-as-device, triads, metaphor, dramatic fragments, evocative headings)
- [ ] Realistic names in examples
- [ ] Expected output shown when helpful
- [ ] Progressive complexity
- [ ] Errors only if they teach

---

## Formatting Standards

**Go:** `go fmt`
**Rust:** `cargo +nightly fmt`
**GitHub CLI:** `gh pr view <number>` / `gh issue view <number>`

---

## Subagent Usage

A specialized subagent (`nats-docs-writer`) auto-triggers on:
- `docs/**/*.md`
- `docs/**/*.mdx`
- `src/components/NatsFlow/**`

Manual invocation:
```
/task Create documentation for [topic] following NATS standards
```

The subagent enforces MUST rules, applies SHOULD guidelines, and validates against the checklist.
