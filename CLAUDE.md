# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code Examples Convention

When adding code examples to documentation, use Docusaurus's Tabs component to show examples in multiple languages:

1. **Always include CLI as the default tab** - Set `default` attribute on the CLI TabItem
2. **Use bash language for CLI examples** - Use ` ```bash ` for CLI code blocks to enable syntax highlighting with grayed-out comments
3. **Use consistent groupId** - Use `groupId="lang"` to synchronize language selection across all code blocks on the page
4. **Standard language order**:
   - CLI (default)
   - JavaScript/TypeScript
   - Go
   - Python
   - Java
   - Rust
   - C#/.NET

Example structure:
```mdx
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="lang">
<TabItem value="cli" label="CLI" default>

```bash
# Comments will be grayed out
nats pub hello "Hello NATS!"
nats sub weather.updates
```

</TabItem>
<TabItem value="js" label="JavaScript/TypeScript">

```javascript
// JavaScript example here
```

</TabItem>
<!-- Add other languages -->
</Tabs>
```

## Development Commands

### Install dependencies
```bash
npm install
```

### Start development server
```bash
npm start
```
Opens a local development server at http://localhost:3000 with hot reload.

### Build the site
```bash
npm run build
```
Generates static content into the `build` directory.

### Type checking
```bash
npm run typecheck
```

### Serve production build locally
```bash
npm run serve
```

### Deploy to GitHub Pages
```bash
# With SSH
USE_SSH=true npm run deploy

# Without SSH
GIT_USER=<GitHub username> npm run deploy
```

## Code Examples System

The documentation includes code examples from NATS client repositories. This system fetches real, working code from official repos to keep docs in sync with actual client libraries.

### How It Works

The `scripts/fetch-examples.js` script:

1. **Fetches examples** from GitHub repositories (nats.go, nats.rs, etc.)
2. **Extracts snippets** using `NATS-DOC-START` / `NATS-DOC-END` markers (or uses full file if no markers)
3. **Cleans indentation** to make snippets presentable
4. **Organizes by page and snippet** (e.g., `basics-publish` → `basics/publish.go`)
5. **Generates metadata.json** with information about all fetched examples

### Output Location

All fetched examples go to: **`static/examples/snippets/`**

```
static/examples/snippets/
├── go/
│   └── basics/
│       ├── publish.go
│       └── subscribe.go
├── rust/
│   └── basics/
│       ├── publish.rs
│       └── subscribe.rs
├── cli/              (local files, not fetched)
│   └── basics/
│       └── publish.sh
└── metadata.json     (generated)
```

**Important:** This entire directory is gitignored and regenerated during build.

### Running the Script

```bash
# Manually fetch examples
npm run fetch-examples

# Automatically run during build
npm run build  # Runs fetch-examples first
```

### Adding New Examples

#### For Remote Examples (Go, Rust, etc.)

1. Add examples to the client repo (e.g., nats.go) on the `doc-examples` branch
2. Use this file naming pattern:
   - **Go:** `examples/docs/[page]-[snippet]/main.go`
   - **Rust:** `async-nats/examples/docs_[page]_[snippet].rs`
3. Add markers to extract specific sections (optional):
   ```go
   // Full example file with setup...

   // NATS-DOC-START
   nc.Publish("subject", []byte("hello"))
   // NATS-DOC-END

   // Cleanup code...
   ```
4. Add entry to `EXAMPLES_CONFIG` in `scripts/fetch-examples.js`:
   ```javascript
   "go": {
       repo: "nats-io/nats.go",
       branch: "doc-examples",
       examples: {
           "basics-publish": "examples/docs/basics-publish/main.go",
           "basics-subscribe": "examples/docs/basics-subscribe/main.go",
       },
   },
   ```

#### For CLI Examples

CLI examples are stored locally (not fetched):
1. Create `.sh` files in `static/examples/snippets/cli/[page]/[snippet].sh`
2. The script automatically finds and includes them in metadata.json

### Using in Documentation

Use the custom `<div class="nats-example">` tag:

```mdx
<div class="nats-example" data-type="basics-publish" data-languages="cli,go,rust"></div>
```

The JavaScript loader (`static/js/nats-example-loader-v2.js`) will:
- Read the metadata.json
- Load the appropriate code files
- Create multi-language tabs
- Apply syntax highlighting

### Configuration

Edit `scripts/fetch-examples.js` to configure:
- `EXAMPLES_CONFIG`: Repository URLs, branches, and example paths
- `OUTPUT_DIR`: Where examples are saved (don't change unless needed)
- Marker patterns for snippet extraction

## Architecture Overview

This is a **Docusaurus v3** documentation site for NATS. Key architectural elements:

### Configuration
- **docusaurus.config.ts**: Main configuration file containing site metadata, presets, theme config, and deployment settings
- **sidebars.ts**: Defines sidebar structure (currently using autogenerated sidebar from filesystem)
- **tsconfig.json**: TypeScript configuration extending Docusaurus defaults

### Content Structure
- **docs/**: Documentation pages in Markdown/MDX format
  - Uses autogenerated sidebar from folder structure
  - Root path is configured as "/" (docs are the main content)
- **blog/**: Blog posts with author info (authors.yml) and tags (tags.yml)
- **src/**: React components and custom styling
  - components/HomepageFeatures/: Custom homepage features component
  - css/custom.css: Global CSS customizations
  - pages/: Additional standalone pages

### Key Configuration Notes
- Docs are served at root path ("/") instead of "/docs"
- Site is configured for GitHub Pages deployment (org: nats-io, project: nats.docs)
- Uses Prism for syntax highlighting
- TypeScript support enabled with strict type checking

### Branding Assets
- **nats-branding/**: Contains official NATS logo assets in various formats
  - Horizontal, stacked, and icon versions
  - Color, black, and white variants
  - AI, PNG, and SVG formats
- Logos automatically switch between light/dark mode
- Official NATS color palette: #27AAE1, #375C93, #34A574, #8DC63F