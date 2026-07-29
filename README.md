# NATS Documentation (rebuild)

A ground-up rebuild of the [NATS](https://nats.io) documentation, built with
[Docusaurus](https://docusaurus.io/). It reorganizes the docs around
[Diátaxis](https://diataxis.fr/): Core Concepts, hands-on Tutorials, long-form
Learn deep dives, and per-version generated Reference (from `nats-server` and
`jsm.go` source), plus interactive message-flow animations and multi-language
code examples pulled from the client repositories.

> **Status:** work in progress. This is an experimental rebuild by
> [Synadia](https://synadia.com), not (yet) the official NATS documentation —
> the official docs live at [docs.nats.io](https://docs.nats.io) and
> [nats-io/nats.docs](https://github.com/nats-io/nats.docs).

## Overview

**What is this repository?**
- A rebuilt NATS documentation site
- Written in Markdown/MDX with React components
- Reference docs generated per NATS version from upstream source
- Builds to a static site (`npm run build`) servable by any static host

**For new contributors:**
- 📝 **Editing docs?** See [Common Tasks](#common-tasks)
- 💻 **Adding code examples?** See [Contributing](#contributing)
- 🔧 **Technical deep dive?** See [Development](#development)
- ❓ **Having issues?** See [Troubleshooting](#troubleshooting)

## Table of Contents

- [Quick Start](#quick-start)
- [Common Tasks](#common-tasks)
- [Development](#development)
- [Contributing](#contributing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Requirements
- **Node.js** 18 or higher
- **npm** 8 or higher (comes with Node.js)

### Installation

1. Clone this repository:
```bash
git clone https://github.com/nats-io/nats.docs.v2.git
cd nats.docs.v2
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open your browser to [http://localhost:3000](http://localhost:3000)

The dev server supports hot reloading - most changes are reflected immediately without restarting.

### Build

To create a production build:

```bash
npm run build
```

This generates static content in the `build/` directory that can be served by any static hosting service.

## Common Tasks

### Editing Documentation Pages

Documentation pages are located in the `docs/` directory and written in Markdown (`.md`) or MDX (`.mdx`).

**To edit an existing page:**
1. Find the file in `docs/` (e.g., `docs/concepts/getting-started/index.md`)
2. Make your changes
3. Save the file - changes appear immediately in your browser (hot reload)
4. Commit and push your changes

**Example file locations:**
- Getting Started: `docs/concepts/getting-started/index.md`
- Concepts: `docs/concepts/*.md`
- Learn deep dives: `learn/<chapter>/*.md` (own docs instance, served at `/learn`)
- Tutorials: `tutorials/*.md` (own docs instance, served at `/tutorials`)
- Reference: `reference_versioned_docs/version-<ver>/**` (generated — do not hand-edit; fix the generators under `tools/config-generator` and `scripts/` instead)

**Note:** The `docs/` directory maps to the root URL path `/`. For example:
- `docs/concepts/getting-started/index.md` → `http://localhost:3000/concepts/getting-started`
- `docs/concepts/publish-subscribe.md` → `http://localhost:3000/concepts/publish-subscribe`

### Adding Code Examples

**Where do code examples live?**

- **Programming language examples** (Go, Rust, JavaScript, Python, Java, C#): Always in their respective client repositories
  - Go → `nats.go` repository
  - Rust → `nats.rs` repository
  - JavaScript/TypeScript → `nats.js` repository
  - Java → `nats.java` repository

- **CLI-only examples**: In this documentation repository
  - Location: `static/examples/snippets/cli/[page]/[snippet].sh`
  - Only use this for examples that have no programming language equivalents

**Two ways to add examples:**

**Option 1: Inline examples** (for unique, one-off snippets)

Use Docusaurus tabs directly in your MDX file:

```mdx
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

\`\`\`bash
nats pub hello "Hello NATS!"
\`\`\`

</TabItem>
<TabItem value="go" label="Go">

\`\`\`go
nc.Publish("hello", []byte("Hello NATS!"))
\`\`\`

</TabItem>
</Tabs>
```

**Option 2: Multi-repository examples** (for reusable, tested code - PREFERRED)

See the [Adding Code Examples](#adding-code-examples-1) section in Contributing below.

### Checking for Type Errors

Before committing, run TypeScript type checking:

```bash
npm run typecheck
```

### Available npm Commands

```bash
npm start              # Start dev server (http://localhost:3000)
npm run build          # Build production site
npm run typecheck      # Run TypeScript type checking
npm run fetch-examples # Fetch code examples from GitHub repos
npm run generate-docs:all-versions  # Generate per-version reference docs (nats-server + jsm.go)
npm run serve          # Serve production build locally
npm run clear          # Clear Docusaurus cache
```

## Deployment

`npm run build` produces a fully static site in `build/` that any static host
can serve. No CI deployment pipeline is wired up in this repository yet.

For GitHub Pages, Docusaurus's built-in deploy command works:

```bash
USE_SSH=true npm run deploy
# or
GIT_USER=<Your GitHub username> npm run deploy
```

### Generating Reference Documentation

Reference documentation is generated per NATS version from upstream source code. Each version checks out matching tags of both `nats-server` and `jsm.go` submodules (tag mapping in `scripts/doc-versions.json`), parses errors/headers/monitor schemas, vendors JSON schemas, and writes a version-scoped doc tree.

**What gets generated (per version):**
- `reference_versioned_docs/version-<ver>/jetstream/errors.md`
- `reference_versioned_docs/version-<ver>/system/errors.md`
- `reference_versioned_docs/version-<ver>/jetstream/api/headers.md`
- `reference_versioned_docs/version-<ver>/config/**` (from `tools/config-generator`)
- `reference_versioned_docs/version-<ver>/**/*` (schema-refs pages from `scripts/schema-refs.json`)
- `reference_versioned_sidebars/version-<ver>-sidebars.json`
- `src/schemas/vendor/v<ver>/**` (vendored JSON schemas)

**Prerequisites:**
- Go + Node (to run the generators)
- `nats-server` and `jsm.go` submodules initialized

```bash
git submodule update --init
```

**Generate documentation:**

```bash
# Generate all versions listed in scripts/doc-versions.json
npm run generate-docs:all-versions

# Or a single version
npm run generate-docs:v2.11
npm run generate-docs:v2.12

# Dry-run the parser (stdout only; no docs-out required)
npm run generate-docs:dry-run
```

**When to regenerate:**
- After bumping a version's tag in `scripts/doc-versions.json`
- When adding or changing entries in `scripts/schema-refs.json`
- When modifying generation templates in `scripts/templates/`
- Before committing reference doc changes

## Development

### Technology Stack

This site is built with:
- **[Docusaurus](https://docusaurus.io/)** - Static site generator optimized for documentation
- **React** - UI components and interactive elements
- **MDX** - Markdown with JSX for rich documentation pages
- **TypeScript** - Type-safe configuration and components

### Project Structure

```
nats.docs.v2/
├── docs/                      # Core Concepts pages (served at "/")
│   └── concepts/
├── learn/                     # Learn deep dives (own docs instance, "/learn")
├── tutorials/                 # Hands-on tutorials (own docs instance, "/tutorials")
├── reference_versioned_docs/  # Generated per-version Reference ("/reference")
├── src/
│   ├── components/            # React components
│   │   └── NatsFlow/          # Interactive flow diagrams
│   ├── plugins/               # Docusaurus plugins (NatsFlow client module)
│   └── css/                   # Global styles
├── static/
│   ├── examples/snippets/
│   │   └── cli/               # Committed CLI examples (other languages fetched)
│   ├── js/
│   │   └── nats-flow-loader.js  # Mounts NatsFlow animations client-side
│   └── img/                   # Images and assets
├── scripts/                   # fetch-examples, generate-version, rehype plugins
├── tools/config-generator/    # Go generator for the config reference tree
├── docusaurus.config.ts       # Site configuration
├── sidebars.ts                # + sidebars-learn/tutorials/reference.ts
└── package.json               # Dependencies and scripts
```

**Important notes:**
- `docs/` content is served at the root URL path (`/`)
- `static/examples/snippets/cli/` is committed; the Go/Rust/JS/Python/Java/C# subtrees and `metadata.json` are fetched by `npm run fetch-examples` and gitignored
- `scripts/rehype-nats-example.mjs` renders `nats-example` divs into language tabs at build time (restart the dev server after fetching new examples — the plugin caches `metadata.json`)

### How Code Examples Work

The documentation uses a **multi-repository example system**:

**For programming language examples (Go, Rust, JavaScript, Python, Java, C#):**
1. Code examples live in the actual NATS client repositories (nats.go, nats.rs, nats.js, nats.py, nats.java, nats.net)
2. All examples are on the `doc-examples` branch in each repository
3. `scripts/fetch-examples.js` fetches examples from GitHub
4. Examples are saved to `static/examples/snippets/[language]/` and indexed in `metadata.json`
5. `scripts/rehype-nats-example.mjs` renders the language tabs at build time from `metadata.json`
6. Documentation pages use `<div class="nats-example" data-type="..." data-languages="..."></div>` tags

**For CLI examples:**
1. CLI snippets always live in this repo at `static/examples/snippets/cli/[page]/[snippet].sh` and are committed to git
2. `npm run fetch-examples` auto-scans that directory into `metadata.json` alongside the fetched languages

**Why this approach?**
- **Programming language examples** are tested, working code from actual client libraries
- Examples can be run and validated in their native repositories
- Single source of truth - if the client library changes, examples stay in sync
- **CLI-only examples** live in docs repo because they're just shell commands, not library code

### Key Configuration Files

**docusaurus.config.ts**
- Main site configuration
- Navbar and footer settings
- Plugin configuration
- Theme settings
- Deployment configuration

**sidebars.ts**
- Documentation sidebar navigation structure
- Controls the order and grouping of doc pages
- Uses file paths relative to `docs/` directory

**package.json**
- Dependencies and versions
- npm scripts (start, build, fetch-examples, etc.)
- Project metadata

**scripts/fetch-examples.js**
- Configuration for code examples from GitHub
- Maps example names to file paths in client repos
- Defines which examples to fetch and where to find them

**scripts/rehype-nats-example.mjs**
- Build-time rehype plugin that replaces `nats-example` divs with language tabs
- Reads `static/examples/snippets/metadata.json` (caches it — restart the dev
  server after `npm run fetch-examples`)

### Branch Strategy and PRs

**Main branches:**
- `main` - Production branch, auto-deploys to GitHub Pages
- Feature branches - Create from `main` for your work

**Workflow:**
1. Create a feature branch: `git checkout -b your-feature-name`
2. Make your changes and commit regularly
3. Push to GitHub: `git push origin your-feature-name`
4. Open a Pull Request targeting `main`
5. PR gets a Netlify preview URL automatically
6. After review and approval, merge to `main`
7. Changes auto-deploy to production

**For code examples in client repos:**
All examples must be on the `doc-examples` branch in the respective repository (nats.go, nats.rs, nats.js).

### What NOT to Commit

**Generated files (excluded by .gitignore):**
- `static/examples/snippets/go/` - Fetched from nats.go repository
- `static/examples/snippets/rust/` - Fetched from nats.rs repository
- `static/examples/snippets/javascript/` - Fetched from nats.js repository
- `static/examples/snippets/metadata.json` - Generated by fetch script
- `build/` - Production build output
- `.docusaurus/` - Docusaurus cache
- `node_modules/` - npm dependencies

**Files you SHOULD commit:**
- Documentation pages in `docs/`
- React components in `src/`
- CLI examples in `static/examples/snippets/cli/` (source of truth for CLI examples)
- Configuration files (`docusaurus.config.ts`, `sidebars.ts`, etc.)
- Static assets in `static/` (images, fonts, etc.)

**Important:** The `static/examples/snippets/` directory structure:
```
static/examples/snippets/
├── cli/              # ✅ COMMIT - CLI examples (source of truth)
│   └── [page]/
│       └── [snippet].sh
├── go/               # ❌ DON'T COMMIT - Fetched from nats.go repo
├── rust/             # ❌ DON'T COMMIT - Fetched from nats.rs repo
├── javascript/       # ❌ DON'T COMMIT - Fetched from nats.js repo
├── python/ java/ csharp/  # ❌ DON'T COMMIT - Fetched from nats.py / nats.java / nats.net
└── metadata.json     # ❌ DON'T COMMIT - Generated by fetch script
```

**Where programming language examples live:**
- Go: `nats.go` · Rust: `nats.rs` · JavaScript/TypeScript: `nats.js` ·
  Python: `nats.py` · Java: `nats.java` · C#: `nats.net` — each on its
  `doc-examples` branch

### Writing Documentation

**File format:**
- Use `.md` for simple pages with plain Markdown
- Use `.mdx` for pages that need React components (tabs, NatsFlow animations, etc.)

**Front matter:**
Every documentation page should have front matter at the top:
```yaml
---
title: Page Title
sidebar_label: Short Label  # Optional, for sidebar
---
```

**Best practices:**
- **Start simple:** Begin with core concepts before diving into details
- **Show, don't just tell:** Use code examples and animations to illustrate concepts
- **Be consistent:** Follow the style guide in [CLAUDE.md](./CLAUDE.md)
- **Link liberally:** Connect related concepts with internal links
- **Test examples:** All code should be runnable and tested
- **Use active voice:** "NATS delivers messages" not "Messages are delivered by NATS"
- **Keep it current:** Use realistic examples with `demo.nats.io`

**Language order for code examples:**
Always show examples in this order: CLI, JavaScript/TypeScript, Go, Python, Java, Rust, C#/.NET

**When to use NatsFlow animations:**
- Message flow patterns (pub/sub, request/reply)
- Timing and sequencing diagrams
- Fan-out and load balancing visualization

**When to use code examples:**
- API syntax and usage
- Configuration examples
- Step-by-step tutorials

## Contributing

### Adding Code Examples

This documentation site uses a **multi-repository example system** that pulls code examples from the actual NATS client repositories. This ensures examples are tested, working code.

**Important principle:**
- **Programming language examples** (Go, Rust, JavaScript, Python, Java, C#) → Always add to respective client repositories
- **CLI-only examples** (no programming language versions) → Add to this documentation repository

If you're creating a multi-language example that includes CLI + Go + Rust + JavaScript, the CLI portion goes in this repo (`static/examples/snippets/cli/`), while Go/Rust/JS go in their respective client repos.

#### Repository Setup

For the best experience, clone the client repositories alongside this docs repository:

```bash
~/coding/
├── nats.docs.v2/            # This repository
├── nats.go-docs/            # Go examples
├── nats.rs-docs/            # Rust examples
└── nats.js-docs/            # JavaScript/TypeScript examples
```

Clone the repositories:

```bash
cd ~/coding
git clone https://github.com/nats-io/nats.go nats.go-docs
git clone https://github.com/nats-io/nats.rs nats.rs-docs
git clone https://github.com/nats-io/nats.js nats.js-docs
```

Switch to the `doc-examples` branch in each:

```bash
cd nats.go-docs && git checkout -b doc-examples origin/doc-examples
cd ../nats.rs-docs && git checkout -b doc-examples origin/doc-examples
cd ../nats.js-docs && git checkout -b doc-examples origin/doc-examples
```

#### Example Naming Convention

Examples follow the pattern `[page]-[snippet]`:
- `getting-started-publish` - Publish example on the getting-started page
- `basics-subscribe` - Subscribe example on the basics page

#### Adding Examples for Each Language

##### CLI Examples (Local)

CLI examples are stored locally in this repository. This includes:
- CLI portions of multi-language examples
- CLI-only examples (examples with no programming language equivalents)

**Location:**
```bash
static/examples/snippets/cli/[page]/[snippet].sh
```

**Example:**
```bash
# static/examples/snippets/cli/getting-started/publish.sh
#!/bin/bash

# Publish a message to demo.nats.io
nats pub --server=demo.nats.io hello "Hello NATS!"
```

**After creating CLI examples:**
- CLI examples are committed directly to this repository (not fetched from GitHub)
- They do not need to be pushed to a separate branch
- Just commit and push to your feature branch in this repo

##### Go Examples

**Repository:** `nats.go` (cloned as `~/coding/nats.go-docs`)
**Branch:** `doc-examples`
**Location:** `~/coding/nats.go-docs/examples/docs/[page]-[snippet]/main.go`

```go
// examples/docs/getting-started-publish/main.go
package main

import (
	"log"
	"github.com/nats-io/nats.go"
)

func main() {
	// Connect to NATS demo server
	nc, err := nats.Connect("demo.nats.io")
	if err != nil {
		log.Fatal(err)
	}
	defer nc.Close()

	// Publish a message
	err = nc.Publish("hello", []byte("Hello NATS!"))
	if err != nil {
		log.Fatal(err)
	}

	log.Println("Message published to hello")
}
```

After creating examples:
```bash
cd ~/coding/nats.go-docs
go fmt ./examples/docs/getting-started-publish/main.go
git add examples/docs/getting-started-publish/
git commit -m "Add getting-started-publish example"
git push origin doc-examples
```

##### Rust Examples

**Repository:** `nats.rs` (cloned as `~/coding/nats.rs-docs`)
**Branch:** `doc-examples`
**Location:** `~/coding/nats.rs-docs/async-nats/examples/docs_[page]_[snippet].rs`

**Note:** Use underscores instead of hyphens in filenames.

```rust
// async-nats/examples/docs_getting_started_publish.rs
use async_nats;

#[tokio::main]
async fn main() -> Result<(), async_nats::Error> {
    // Connect to NATS demo server
    let client = async_nats::connect("demo.nats.io").await?;

    // Publish a message
    client.publish("hello", "Hello NATS!".into()).await?;
    client.flush().await?;

    println!("Message published to hello");

    Ok(())
}
```

After creating examples:
```bash
cd ~/coding/nats.rs-docs/async-nats
cargo +nightly fmt
cd ..
git add async-nats/examples/docs_getting_started_publish.rs
git commit -m "Add getting-started-publish example"
git push origin doc-examples
```

##### JavaScript/TypeScript Examples

**Repository:** `nats.js` (cloned as `~/coding/nats.js-docs`)
**Branch:** `doc-examples`
**Location:** `~/coding/nats.js-docs/examples/docs/[page]-[snippet]/index.ts`

```typescript
// examples/docs/getting-started-publish/index.ts
// import the connect function from a transport
import { connect } from "@nats-io/transport-deno";

// connect to NATS demo server
const nc = await connect({ servers: "demo.nats.io:4222" });

// publish a message to the 'hello' subject
nc.publish("hello", "Hello NATS!");
console.log("Message published to hello");

// drain the connection (flushes and closes)
await nc.drain();
```

After creating examples:
```bash
cd ~/coding/nats.js-docs
git add examples/docs/getting-started-publish/
git commit -m "Add getting-started-publish example"
git push origin doc-examples
```

#### Using NATS-DOC Markers (Optional)

For examples that need setup code but you only want to show a specific section in the docs:

```go
func main() {
    // Setup code here
    nc, _ := nats.Connect("demo.nats.io")
    defer nc.Close()

    // NATS-DOC-START
    // This is the code that will be extracted
    nc.Publish("hello", []byte("Hello!"))
    // NATS-DOC-END

    // More code here
}
```

If no markers are present, the entire file is used (recommended for "getting started" examples).

#### Registering Examples

Add your examples to `scripts/fetch-examples.js`:

```javascript
const EXAMPLES_CONFIG = {
  "go": {
    examples: {
      "getting-started-publish": "examples/docs/getting-started-publish/main.go",
      // ... add more
    },
  },
  "rust": {
    examples: {
      "getting-started-publish": "async-nats/examples/docs_getting_started_publish.rs",
      // ... add more
    },
  },
  "javascript": {
    examples: {
      "getting-started-publish": "examples/docs/getting-started-publish/index.ts",
      // ... add more
    },
  },
};
```

#### Fetching Examples

After pushing examples to GitHub, fetch them into this repo:

```bash
npm run fetch-examples
```

This downloads examples from GitHub and saves them to `static/examples/snippets/`.

#### Using Examples in Documentation

In your MDX files:

```mdx
### Publisher Example

<div class="nats-example" data-type="getting-started-publish" data-languages="cli,js,go,java,rust,csharp"></div>
```

Languages are shown in the order specified. CLI should always be first with `default` attribute.

#### Complete Workflow

**For multi-language examples (CLI + Go + Rust + JS):**

1. **Create CLI example** in this repository: `static/examples/snippets/cli/[page]/[snippet].sh`
2. **Create Go example** in `~/coding/nats.go-docs` repository on `doc-examples` branch
3. **Create Rust example** in `~/coding/nats.rs-docs` repository on `doc-examples` branch
4. **Create JavaScript example** in `~/coding/nats.js-docs` repository on `doc-examples` branch
5. **Format code** in each repository (go fmt, cargo fmt, etc.)
6. **Commit and push** CLI example to this repo, other examples to `doc-examples` branch in client repos
7. **Update** `scripts/fetch-examples.js` to register new Go/Rust/JS examples
8. **Fetch examples**: `npm run fetch-examples` (pulls Go/Rust/JS from GitHub)
9. **Use in docs**: Add `<div class="nats-example" data-type="..." data-languages="cli,js,go,java,rust,csharp"></div>`
10. **Test locally**: `npm start` and verify all tabs appear correctly

**For CLI-only examples:**

1. **Create CLI example** in this repository: `static/examples/snippets/cli/[page]/[snippet].sh`
2. **Commit and push** to this repo
3. **Use in docs**: Add `<div class="nats-example" data-type="..." data-languages="cli"></div>`
4. **Test locally**: `npm start` and verify example appears

### Style Guide

See [CLAUDE.md](./CLAUDE.md) for detailed documentation style guidelines including:
- Code example structure
- Tab ordering (CLI, JavaScript/TypeScript, Go, Python, Java, Rust, C#/.NET)
- Comment style
- When to use NatsFlow animations vs code examples

## Troubleshooting

### Development Server Won't Start

**Issue:** `npm start` fails or shows port conflicts

**Solutions:**
1. Check if port 3000 is already in use:
   ```bash
   lsof -i :3000
   ```
2. Kill any existing process:
   ```bash
   lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill
   ```
3. Clear Docusaurus cache and try again:
   ```bash
   npm run clear
   npm start
   ```

### Code Examples Not Appearing

**Issue:** `<div class="nats-example">` tags show "No examples available"

**Possible causes and solutions:**

1. **Examples not fetched from GitHub:**
   ```bash
   npm run fetch-examples
   ```
   Check that `static/examples/snippets/metadata.json` exists and contains your example.

2. **Wrong data-type attribute:**
   Verify the `data-type` matches the example name in `scripts/fetch-examples.js`.
   For example, if the config has `"getting-started-publish"`, use:
   ```html
   <div class="nats-example" data-type="getting-started-publish" ...></div>
   ```

3. **CLI examples missing:**
   CLI examples are stored in this repository at `static/examples/snippets/cli/[page]/[snippet].sh`.

   If a CLI example doesn't appear:
   - Check that the file exists: `static/examples/snippets/cli/[page]/[snippet].sh`
   - Verify the file is committed to git (CLI examples should be in the repository)
   - Re-run `npm run fetch-examples` (it scans the CLI tree into `metadata.json`) and restart the dev server — the rehype plugin caches `metadata.json`

### Type Checking Errors

**Issue:** `npm run typecheck` shows errors

**Solutions:**
1. Make sure `docusaurus.config.ts` and other TypeScript files have correct types
2. Check imports in MDX files - use `@site/` prefix for absolute imports:
   ```typescript
   import { NatsFlow } from '@site/src/components/NatsFlow';
   ```
3. Restart your IDE's TypeScript server if errors persist after fixing

### Hot Reload Not Working

**Issue:** Changes to files don't appear in the browser

**Solutions:**
1. Restart the dev server (`Ctrl+C`, then `npm start`)
2. Hard refresh the browser (`Cmd+Shift+R` on Mac, `Ctrl+Shift+R` on Windows/Linux)
3. Check the terminal for build errors
4. Clear cache: `npm run clear` then `npm start`

### Build Fails

**Issue:** `npm run build` fails

**Common causes:**
1. **Broken links:** Check for invalid internal links in markdown files
2. **Type errors:** Run `npm run typecheck` to identify issues
3. **Missing dependencies:** Run `npm install` to ensure all packages are installed
4. **Code example issues:** Run `npm run fetch-examples` to refresh examples

### Examples Not Updating After Push to Client Repo

**Issue:** Pushed new examples but they don't appear in docs

**For programming language examples (Go, Rust, JavaScript, Python, Java, C#):**
Examples are fetched from GitHub, not local repositories. You need to:
1. Push your changes to the `doc-examples` branch in the client repo (nats.go, nats.rs, or nats.js)
2. Wait a moment for GitHub to process the push
3. Run `npm run fetch-examples` in this repository to pull from GitHub
4. Refresh your browser

**Note:** The fetch script pulls from GitHub's raw content URLs, so changes must be pushed to be visible.

**For CLI examples:**
CLI examples are stored directly in this repository at `static/examples/snippets/cli/`, so they don't need to be fetched:
1. Commit your CLI example to this repository
2. Changes appear immediately after saving (hot reload)
3. No need to run `npm run fetch-examples` for CLI-only changes

### Interactive Animations (NatsFlow) Not Working

**Issue:** `<div class="nats-flow" data-scenario="...">` not rendering

**Solutions:**
1. Verify the `data-scenario` name: `*Animated` scenarios must be exported from
   `src/components/NatsFlow/scenarios/index.ts` and registered in
   `src/plugins/nats-flow/client-module.tsx`
2. Check the browser console for JavaScript errors
3. See `src/components/NatsFlow/README.md` for the full authoring and wiring guide

### Getting Help

- Check [Docusaurus documentation](https://docusaurus.io/docs)
- Review [CLAUDE.md](./CLAUDE.md) for style guidelines
- Check existing documentation pages for examples
- Look at `src/components/NatsFlow/README.md` for animation component details

## License and Attribution

The original code and documentation in this repository are licensed under
the [MIT License](./LICENSE).

Parts of this repository derive from Apache-2.0-licensed upstream projects,
and those portions remain under the Apache License 2.0 — see
[NOTICE](./NOTICE) for details and [LICENSE-APACHE](./LICENSE-APACHE) for the
license text:

- Documentation content derived from
  [nats-io/nats.docs](https://github.com/nats-io/nats.docs)
- Reference documentation and JSON schemas generated from
  [nats-io/nats-server](https://github.com/nats-io/nats-server) and
  [nats-io/jsm.go](https://github.com/nats-io/jsm.go)
