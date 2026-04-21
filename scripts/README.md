# Documentation Generation Scripts

This directory contains scripts for generating NATS documentation from source code.

## Pipeline overview

Reference docs are generated **per NATS version**. `scripts/generate-version.js` is the orchestrator; it checks out version-specific tags of both `nats-server` and `jsm.go` submodules (per `scripts/doc-versions.json`), then drives the generators below and atomically swaps the per-version output into place.

Direct invocation of `generate-docs.go` is only useful for dry-run parser inspection; all real generation flows through `generate-version.js`.

## generate-docs.go

Parses nats-server source and produces the errors / headers markdown + monitor JSON schemas for one version's output tree. Invoked by `generate-version.js` with `-docs-out` pointing at a per-version staging dir; `-docs-out` is required unless `-dry-run` is passed.

### What It Generates

#### Documentation Files (written under `-docs-out`)

1. **jetstream/errors.md** - JetStream error codes and descriptions
   - Source: `./nats-server/server/errors.json` (via submodule)
   - Organized by category (Account, Stream, Consumer, etc.)
   - Curly braces in descriptions are escaped for MDX compatibility

2. **system/errors.md** - System error messages
   - Source: `./nats-server/server/errors.go` (via submodule)
   - Categorized by error type (Authentication, Protocol, etc.)

3. **jetstream/api/headers.md** - JetStream header reference
   - Sources: Multiple nats-server files (see Header Generation Details below)
   - Organized into sections (H2) and subsections (H3)
   - Supports both const and var declarations
   - Static examples / notes for Batch / Scheduled / Counter are gated on presence of matching `Nats-Batch-*`, `Nats-Schedule-*`, `Nats-Counter-*` constants in the checked-out server source — so 2.11 source produces a 2.11-appropriate page.

#### JSON Schemas

4. **src/schemas/vendor/v<ver>/server/monitor/v1/*.json** - Monitor endpoint schemas
   - Source: `./nats-server/server/monitor.go` and related files (via submodule)
   - Request and response schemas for 15 monitor endpoints:
     - `varz`, `connz`, `routez`, `subsz`, `gatewayz`, `leafz`, `accountz`, `jsz`
     - `healthz`, `profilez`, `raftz`, `ipqueuesz`, `statsz`, `accstatz`, `idz`
   - Automatically extracts:
     - Field names from JSON struct tags
     - Field types from Go type system
     - Field descriptions from Go comments
   - Handles both structs and type aliases (maps)
   - Referenced in docs via `@site/src/schemas/vendor/v<ver>/server/monitor/v1/`

### Usage

```bash
# Normal path: regenerate all versions from doc-versions.json
npm run generate-docs:all-versions

# One version
npm run generate-docs:v2.11
npm run generate-docs:v2.12

# Dry-run the parser (stdout only, no -docs-out required)
npm run generate-docs:dry-run

# Dry-run against a specific nats-server checkout
go run scripts/generate-docs.go -server /path/to/nats-server -dry-run | head -100
```

### How It Works

1. **Parsing**: The script parses source files from nats-server:
   - JSON parsing for `errors.json`
   - Go AST parsing for `errors.go` (including manual string-literal errors)
   - Go AST parsing for header constants and variables across 6 files

2. **Categorization**: Errors and headers are automatically categorized:
   - JetStream errors grouped by subsystem (Account, Consumer, Stream, etc.)
   - System errors grouped by function (Authentication, Protocol, etc.)
   - Headers grouped by usage with subsections (e.g., Message Publishing → Expected State Headers)

3. **Template Rendering**: Uses Go templates from `scripts/templates/`:
   - `jetstream-errors.md.tmpl`
   - `system-errors.md.tmpl`
   - `headers.md.tmpl`

4. **Generation**: Writes markdown files to the staging directory passed via `-docs-out` (a per-version `reference_versioned_docs/version-<ver>.staging` tree under `generate-version.js` control).

### Templates

Templates are located in `scripts/templates/` and use Go's `text/template` syntax.

Template structure:
- **Generated sections**: Tables populated from parsed source code
- **Manual sections**: Static content like introductions, examples, and notes
- **Preserved content**: Templates maintain manual edits in non-generated sections

### Versioning

Generated per-version trees are committed to git under `reference_versioned_docs/version-<ver>/` + `reference_versioned_sidebars/` + `src/schemas/vendor/v<ver>/`:

```bash
# Check if docs are up-to-date after a submodule bump
git status reference_versioned_docs/ reference_versioned_sidebars/ src/schemas/vendor/
```

**Important**: The vendored JSON schemas in `src/schemas/vendor/v<ver>/` **ARE committed** to git:
- They are derived from `nats-server` + `jsm.go` source at the tags pinned in `scripts/doc-versions.json`
- Both repos are included as git submodules for reference and regeneration
- To regenerate: `npm run generate-docs:all-versions` (requires Go, Node, and both submodules)
- Regenerate whenever a version's pinned tag in `doc-versions.json` changes

### Header Generation Details

The header generation process scans multiple nats-server source files:

- `server/stream.go` - Core JetStream headers (Message ID, Rollup, TTL, etc.)
- `server/consumer.go` - Pull request headers (Pending Messages, Pending Bytes, Pin ID)
- `server/jetstream_api.go` - API headers (Required API Level)
- `server/msgtrace.go` - Message tracing headers (Trace Dest, Trace Hop, etc.)
- `server/accounts.go` - Account headers (Request Info)
- `server/auth_callout.go` - Authentication headers (Server Xkey)

Headers are organized into sections (H2) and subsections (H3):

**Sections with subsections:**
- **Message Publishing Headers** (8 subsections):
  - Message Identification and Deduplication
  - Expected State Headers
  - Message Rollup
  - Message Size
  - Message TTL
  - Counter Operations
  - Batch Operations
  - Scheduled Messages

- **Message Delivery Headers** (5 subsections):
  - Stream Information
  - Consumer Information
  - Pull Request Headers
  - Source and Mirror Information
  - Response Type

**Sections without subsections:**
- API Headers
- Marker Headers
- Authentication and Authorization Headers
- Message Tracing Headers
- Key-Value Store Headers

The parser supports both `const` and `var` declarations, enabling it to find headers like `KV-Operation` that are defined as variables rather than constants.

### System Error Generation Details

System errors are extracted from two sources:

1. **Go error variables** in `server/errors.go` (regex-based extraction)
2. **Manual error definitions** in `generate-docs.go` for errors that are sent as string literals

Manual errors include categories:
- **TLS and Security Errors**: Secure Connection - TLS Required, TLS Handshake Error, Certificate Not Pinned
- **Route-Specific Errors**: Duplicate Route, Route Authorization Violation, Cluster Name Conflicts, Minimum Version Required
- **Slow Consumer and Flow Control**: Slow Consumer, Write Deadline Exceeded
- **Configuration and Resolver Errors**: Account Resolver Missing, System Account Not Configured, Credentials Revoked

To add new manual errors, update `getManualSystemErrors()` in `generate-docs.go`:

```go
{
    Name: "New Category",
    Errors: []SystemError{
        {Name: "Error Name", Description: "Error description"},
    },
}
```

### Customizing

#### Add New Error Categories

Edit `categorizeJSErrors()` or `parseSystemErrors()` in `generate-docs.go`:

```go
categories := []struct {
    Name    string
    Pattern *regexp.Regexp
}{
    {"New Category", regexp.MustCompile(`Err(NewPattern)`)},
    // ...
}
```

#### Modify Templates

Edit files in `scripts/templates/`:
- Change structure
- Add new sections
- Update examples

Then regenerate:
```bash
npm run generate-docs:all-versions
```

#### Add New Generated Files

1. Create a new template in `scripts/templates/`
2. Add parsing logic to `generate-docs.go`
3. Add generation call in `generateDocs()` function
4. Update this README

## fetch-examples.js

Fetches code examples from GitHub repositories (nats.go, nats.rs, etc.) for use in documentation.

See [CLI examples README](../static/examples/snippets/cli/README.md) for CLI example workflow.

## Future Enhancements

- [ ] Add generation timestamp to file headers
- [ ] Version comparison (detect nats-server updates)
- [ ] CI integration to check docs are current
- [ ] Generate advisory/monitor docs (currently manual)
- [ ] Support for multiple nats-server versions
