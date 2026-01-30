# Documentation Generation

This document explains how to generate and maintain auto-generated documentation for NATS.

## Overview

Some NATS documentation is automatically generated from source code in the [nats-server](https://github.com/nats-io/nats-server) repository. This ensures that reference documentation stays synchronized with the codebase.

## Generated Files

The following files are automatically generated:

| File | Source | Description |
|------|--------|-------------|
| `docs/reference/jetstream/errors.md` | `nats-server/server/errors.json` | JetStream error codes and descriptions |
| `docs/reference/system/errors.md` | `nats-server/server/errors.go` | System error messages |
| `docs/reference/jetstream/api/headers.md` | `nats-server/server/stream.go` | JetStream header reference |

## Prerequisites

1. **Go** - Required to run the generation script
2. **nats-server repository** - Clone at `~/coding/nats-server` or specify custom path

```bash
# Clone nats-server if needed
cd ~/coding
git clone https://github.com/nats-io/nats-server.git
```

## Generating Documentation

### Quick Start

```bash
# Generate all documentation
npm run generate-docs
```

### Preview Changes

```bash
# Preview without writing files
npm run generate-docs:dry-run
```

### Custom nats-server Location

```bash
# Specify custom path
go run scripts/generate-docs.go -server /path/to/nats-server
```

## When to Regenerate

Regenerate documentation when:

1. **nats-server is updated** - New error codes, headers, or descriptions
2. **Templates are modified** - Changes to documentation structure
3. **Manual sections are added** - New examples or explanations

## Workflow

### For nats-server Updates

```bash
# 1. Update nats-server
cd ~/coding/nats-server
git pull origin main

# 2. Regenerate docs
cd ~/coding/new-nats.docs
npm run generate-docs

# 3. Review changes
git diff docs/reference/

# 4. Commit if appropriate
git add docs/reference/
git commit -m "Update generated docs from nats-server"
```

### For Template Changes

```bash
# 1. Edit template
vim scripts/templates/jetstream-errors.md.tmpl

# 2. Regenerate
npm run generate-docs

# 3. Review
git diff docs/reference/jetstream/errors.md

# 4. Commit both template and generated file
git add scripts/templates/jetstream-errors.md.tmpl docs/reference/jetstream/errors.md
git commit -m "Update JetStream errors template"
```

## Template System

Templates use Go's `text/template` syntax and are located in `scripts/templates/`.

### Structure

```markdown
# Title

Manual introduction text...

{{range .Categories}}
## {{.Name}}

| Column | Column |
|--------|--------|
{{range .Items}}| {{.Field}} | {{.Value}} |
{{end}}
{{end}}

Manual appendix text...
```

### Variables

#### JetStream Errors (`jetstream-errors.md.tmpl`)

```go
.Categories[]
  .Name         string   // Category name
  .Errors[]
    .ErrorCode  int      // Error code (e.g., 10002)
    .Constant   string   // Go constant name
    .Code       int      // HTTP status code
    .Description string  // Error description
```

#### System Errors (`system-errors.md.tmpl`)

```go
.Categories[]
  .Name         string   // Category name
  .Errors[]
    .Name       string   // Human-readable name
    .Description string  // Error message
```

#### Headers (`headers.md.tmpl`)

```go
.Sections[]
  .Name         string   // Section name
  .Description  string   // Section description
  .Headers[]
    .Name       string   // Header name (e.g., "Nats-Msg-Id")
    .ValueType  string   // Value type
    .Description string  // Header description
```

## Customization

### Add a New Generated File

1. Create template in `scripts/templates/`
2. Add parsing function in `scripts/generate-docs.go`
3. Call in `generateDocs()` function
4. Update this document

### Modify Categorization

Edit categorization logic in `generate-docs.go`:

```go
// For JetStream errors
func categorizeJSErrors(errors []JSError) []ErrorCategory {
    // Modify categories here
}

// For system errors
func parseSystemErrors(serverPath string) ([]SystemErrorCategory, error) {
    // Modify categories here
}

// For headers
func categorizeHeader(name string) string {
    // Modify categories here
}
```

## CI Integration

To ensure docs stay current:

```bash
# Add to CI pipeline
npm run generate-docs
git diff --exit-code docs/reference/ || (echo "Generated docs are out of date" && exit 1)
```

## Troubleshooting

### "nats-server path does not exist"

```bash
# Specify path explicitly
go run scripts/generate-docs.go -server ~/path/to/nats-server
```

### "failed to parse errors.json"

Ensure nats-server is up-to-date:
```bash
cd ~/coding/nats-server
git pull origin main
```

### Generated docs differ from originals

This is expected! The script may:
- Add newly discovered errors/headers
- Reorganize categories
- Update descriptions from source

Review changes carefully before committing.

## See Also

- [scripts/README.md](./scripts/README.md) - Detailed script documentation
- [nats-server errors.json](https://github.com/nats-io/nats-server/blob/main/server/errors.json)
- [nats-server stream.go](https://github.com/nats-io/nats-server/blob/main/server/stream.go)
