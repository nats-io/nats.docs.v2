# Documentation Generation Scripts

This directory contains scripts for generating NATS documentation from source code.

## generate-docs.go

Generates reference documentation by parsing the nats-server source code.

### What It Generates

The script generates documentation files and JSON schemas:

#### Documentation Files

1. **docs/reference/jetstream/errors.md** - JetStream error codes and descriptions
   - Source: `~/coding/nats-server/server/errors.json`
   - Organized by category (Account, Stream, Consumer, etc.)
   - Curly braces in descriptions are escaped for MDX compatibility

2. **docs/reference/system/errors.md** - System error messages
   - Source: `~/coding/nats-server/server/errors.go`
   - Categorized by error type (Authentication, Protocol, etc.)

3. **docs/reference/jetstream/api/headers.md** - JetStream header reference
   - Source: `~/coding/nats-server/server/stream.go`
   - Grouped by function (Publishing, Delivery, etc.)

#### JSON Schemas

4. **jsm.go/schemas/server/monitor/v1/*.json** - Monitor endpoint schemas (30 files)
   - Source: `~/coding/nats-server/server/monitor.go`
   - Request and response schemas for 15 monitor endpoints:
     - `varz`, `connz`, `routez`, `subsz`, `gatewayz`, `leafz`, `accountz`, `jsz`
     - `healthz`, `profilez`, `raftz`, `ipqueuesz`, `statsz`, `accstatz`, `idz`
   - Automatically extracts:
     - Field names from JSON struct tags
     - Field types from Go type system
     - Field descriptions from Go comments
   - Handles both structs and type aliases (maps)

### Usage

```bash
# Generate all documentation
npm run generate-docs

# Preview output without writing files
npm run generate-docs:dry-run

# Run directly with Go
go run scripts/generate-docs.go

# Specify custom nats-server path
go run scripts/generate-docs.go -server /path/to/nats-server

# Preview specific file
go run scripts/generate-docs.go -dry-run | head -100
```

### How It Works

1. **Parsing**: The script parses source files from nats-server:
   - JSON parsing for `errors.json`
   - Go AST parsing for `errors.go`
   - Go AST parsing for header constants in `stream.go`

2. **Categorization**: Errors and headers are automatically categorized:
   - JetStream errors grouped by subsystem (Account, Consumer, Stream, etc.)
   - System errors grouped by function (Authentication, Protocol, etc.)
   - Headers grouped by usage (Publishing, Delivery, etc.)

3. **Template Rendering**: Uses Go templates from `scripts/templates/`:
   - `jetstream-errors.md.tmpl`
   - `system-errors.md.tmpl`
   - `headers.md.tmpl`

4. **Generation**: Writes markdown files to `docs/reference/`

### Templates

Templates are located in `scripts/templates/` and use Go's `text/template` syntax.

Template structure:
- **Generated sections**: Tables populated from parsed source code
- **Manual sections**: Static content like introductions, examples, and notes
- **Preserved content**: Templates maintain manual edits in non-generated sections

### Versioning

To track when documentation was last generated:

```bash
# Check if docs are up-to-date
git status docs/reference/jetstream/errors.md docs/reference/system/errors.md docs/reference/jetstream/api/headers.md
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
npm run generate-docs
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
