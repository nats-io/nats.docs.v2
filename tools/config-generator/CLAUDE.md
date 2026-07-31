# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Go-based configuration documentation generator for the NATS server. It parses YAML-based type definitions and generates Markdown documentation files suitable for Docusaurus, including a sidebar navigation structure.

## Commands

### Build and run the generator
```bash
go run .
```

### Generate markdown documentation
```bash
go run . -markdown -dir <output-dir>
```

### Common flags
- `-config <file>` - Root config YAML file (default: `config.yaml`)
- `-types <dir>` - Path to types directory (default: `types`)
- `-markdown` - Generate markdown files for reference docs
- `-dir <name>` - Output directory for reference docs (default: `reference`)
- `-base <path>` - Base URL path for the ref document paths (default: `/reference/config`)
- `-relative` - Use relative paths for links
- `-indexname <name>` - Index filename for a directory (default: `index.md`)
- `-trimindex` - Trim the index filename from the URL path
- `-sidebar <file>` - Sidebar file to output to (default: `config-sidebar.json`)

### Format code
```bash
go fmt ./...
```

## Architecture

### Core Components

**main.go** - Entry point handling CLI flags and orchestrating the parsing and generation flow.

**parse.go** - Configuration parser that:
- Loads the root config YAML (`config.yaml`)
- Loads type definitions from the `types/` directory
- Dereferences type definitions recursively
- Handles array types: `array(T)`, map types: `map(T)`, and nested combinations
- Validates and normalizes property definitions

**model.go** - Data models representing the configuration structure:
- `Config` - Top-level configuration container
- `Section` - Logical grouping of properties (e.g., "Connectivity", "Clustering")
- `Property` - Individual configuration property with types, defaults, examples, aliases
- `TypeOption` - Represents a possible value type (primitive, array, map, or object with nested sections)
- `Example` - Documentation examples with labels and descriptions

**markdown.go** - Markdown documentation generator that:
- Generates hierarchical directory structure of `.md` files
- Creates property pages with types tables, examples, and nested property links
- Generates Docusaurus-compatible sidebar JSON structure
- Handles both flat properties and deeply nested object structures

### Type System

The generator supports a flexible type system defined in YAML:

**Built-in primitive types:**
- `string`, `integer`, `float`, `boolean`
- `duration` - Go time.Duration format (e.g., `10s`, `5m`)
- `storage` - Byte sizes with units (e.g., `1MB`, `100K`)

**Container types:**
- `array(T)` - Array of type T
- `map(T)` - Map from string keys to type T values
- Nested combinations like `array(map(T))`, `map(array(T))`

**Custom types:**
Defined in `types/*.yaml` files. Types can reference other types, which are recursively dereferenced during parsing.

**Multiple type support:**
Properties can accept multiple types (e.g., `jetstream` can be boolean, string enum, or object).

### Configuration Flow

1. **Parse Phase** (`parse.go`):
   - Load root `config.yaml` with sections and properties
   - Load all type definitions from `types/*.yaml`
   - Index types by name for reference resolution
   - For each property, recursively dereference type definitions
   - Build complete `Config` structure with all types resolved

2. **Generation Phase** (`markdown.go`):
   - Create output directory structure mirroring nested properties
   - For each property with nested objects, create a subdirectory
   - Generate `index.md` files for properties with children
   - Generate `<property>.md` files for leaf properties
   - Build sidebar JSON with nested category structure
   - Link nested properties using relative or absolute paths

### Type Definition Files

Located in `types/` directory, organized by domain:
- `shared.yaml` - Common types like `host`, `listen`, `enable-disable`
- `accounts.yaml` - Account and user configuration
- `auth.yaml` - Authorization and authentication
- `cluster.yaml` - Server clustering configuration
- `gateway.yaml` - Gateway connections between clusters
- `jetstream.yaml` - JetStream persistence engine
- `leafnode.yaml` - Leaf node connections
- `mappings.yaml` - Subject mapping/transformation
- `mqtt.yaml` - MQTT protocol interface
- `ocsp.yaml` - OCSP stapling configuration
- `resolver.yaml` - Account resolver settings
- `tls.yaml` - TLS/SSL configuration
- `websocket.yaml` - WebSocket interface

### Property Metadata

Properties support rich metadata for documentation:
- `description` - Detailed explanation
- `deprecation` - Deprecation notice with migration guidance
- `default` - Default value
- `aliases` - Alternative property names
- `reloadable` - Whether changes can be hot-reloaded. The vocabulary matches the
  `reloadable-audit.tsv` columns so a value can be read straight across and
  checked:

  | value | badge | meaning |
  | :--- | :--- | :--- |
  | omitted | none | nobody has checked; may be filled in by inheritance |
  | `reloadable` | Hot Reloadable | the running server picks the change up |
  | `not-reloadable` | Requires Restart | the reload is *rejected* — and `diffOptions` aborts on the first unsupported field, so the whole reload fails |
  | `noop` | Ignored Until Restart | the reload succeeds and the value is then ignored; nothing the operator sees says so |

  There is no default — an omitted value never renders as `reloadable`. An
  unrecognised value fails the build.
- `reloadable_note` - Caveats about reloadability. Renders beneath the badge, and
  renders on its own if no `reloadable` verdict is set. Starred (`Yes*` / `No*`)
  in parent summary tables.
- `examples` - Code examples with labels and descriptions
- `version` - Server version when introduced

- `version` - Server version the property was introduced in, e.g. `"2.12"`. The
  property is omitted entirely from older doc versions, and a `<Since />` badge
  renders on newer ones (suppressed when the value is at or below the oldest live
  version). Always quote it — unquoted `2.10` reads as a float to a human.
- `removed` - Server version the property was dropped in. Omitted from that
  version onward.
- `versions` - Map of version to a narrow override applied when that version is
  being rendered. A key may name several versions: `"2.11, 2.12"`. Overridable
  fields are exactly `reloadable`, `reloadable_note`, `default`, `description`,
  `deprecation` and `choices` — never `type` or children. **The unkeyed value is
  the default for any version not listed**, so a new server minor that changed
  nothing needs no spec edit. A version not in `-known` is a build error, so a
  typo fails loudly instead of matching nothing.

### Inheritance and per-context overrides

Metadata set on a *type* is inherited by every property that references it, but
only for fields the property leaves unset — a value at the reference site always
wins. Inherited: `default`, `aliases`, `url`, `reloadable`, `reloadable_note`,
`version`, `removed`. Not inherited: `description`, `deprecation`, `examples`
(these carry concrete values, so they belong to the use site). Inheritance only
applies when a property resolves to exactly one type; with several there is no
defensible answer to "inherit from which?".

Verdicts do **not** cascade to children. A block marked `not-reloadable` does
not freeze its sub-keys, because the measured data shows children differ from
their parent and from each other.

- `omit` - Drops a property from the rendered tree at one reference site. A
  shared type may declare a key the server rejects in a particular context:
  `network-authorization` declares `users`, but cluster and gateway both error
  with "does not allow multiple users" (`opts.go:1942`, `:2185`) and refuse to
  start. Documenting it there tells the reader to write config that fails, so
  the page is removed rather than annotated. `omit: true` on a name the
  referenced type does not declare is a build error — it would otherwise append
  a phantom page instead of removing one.

When a shared type needs different answers per context, override the individual
children at the reference site:

```yaml
      tls:
        type: tls
        properties:          # merged BY NAME onto the type's own children
          timeout:
            reloadable: not-reloadable
          pinned_certs:
            reloadable: reloadable
```

Overrides nest. An entry that names no type and carries only `properties:` is
merged into the base rather than replacing it, so a correction can reach a
grandchild:

```yaml
      authorization:
        type: network-authorization
        properties:
          default_permissions:
            properties:
              allow_responses:
                reloadable: noop
```

The host must be a node no other rendered path shares, or the override moves
every context that shares it.

This is the mechanism to reach for, not type duplication. The audit measured
`tls` alone resolving to four different verdicts for `timeout` across seven
contexts; naming a specialised type per context would mean roughly fifteen new
type names each restating the full property list.

### Rendering commands

```bash
go run . -markdown -dir out -version 2.12 -known 2.11,2.12,2.14   # one version
go run . -audit    -version 2.14 -known 2.11,2.12,2.14            # TSV of path/type/verdict
go run . -markdown -dir out -strict                               # fail if any verdict is missing
go test ./...
```

`-audit` exists to make the backfill tractable: findings are keyed by rendered
page path but the spec is authored by type, so joining the dump against
`reloadable-audit.tsv` shows which shared types resolve to conflicting verdicts
and therefore need per-context overrides. Every run prints reload coverage to
stderr; `-strict` turns a gap into a non-zero exit and should stay off until the
backfill is complete.

Do **not** treat `hot-reload-opts.md` as authoritative. It was audited against
nats-server v2.11.17 / v2.12.12 / v2.14.3 and found wrong in both directions —
see `reloadable-audit.md` at the repo root for per-key verdicts. Those verdicts
have been backfilled into this spec: every rendered page matches the audit at all
three versions, and `-strict` passes.

The audit itself is not authoritative either, and it was taken at different tags
from the ones the docs render. It ran against v2.11.17 / v2.12.12 / v2.14.3,
while `scripts/doc-versions.json` pins v2.11.9 / v2.12.4 / v2.14.0 — and reload
behaviour changes within a minor. `gateway.tls.pinned_certs` is the known case:
the audit reports it reloadable at all three versions, which is true at the tags
it measured but false at the tags 2.11 and 2.12 render from, where a change to it
aborts the whole reload. That key is version-gated here and deliberately diverges
from the audit. Re-derive from source at the pinned tag before trusting any row;
see the `config-reload-audit` skill for the procedure.

34 of the audit's caveat strings were hard-truncated at 160 characters when the
TSV was written. Those keys were re-read against the server source and their
notes rewritten by hand; the truncated strings in the TSV are still unusable, so
do not copy from that column without checking its length.

58 keys the audit reported as absent from every version were verified against
`nats-server` and removed from the spec — cluster and gateway `authorization.users`
and `.token` (config errors that stop the server booting), the leafnode
`authorization` keys `parseLeafAuthorization`/`parseLeafUsers` do not accept,
`verify_cert_and_check_known_urls` under either leafnode TLS block, and
`websocket.jwt_token`, which was a typo for `jwt_cookie` and was renamed.

## Key Design Patterns

**Type Resolution:** Types are dereferenced recursively to terminal options (primitives, enums, or objects with explicit properties). Referenced types can themselves have multiple type options.

**Hierarchical Documentation:** Properties with object types generate their own pages with nested properties, creating a navigable documentation tree.

**Sidebar Generation:** The sidebar JSON structure mirrors the documentation hierarchy, with categories for properties that have children and direct links for leaf properties.

**Flexible Links:** Supports both relative links (for local development) and absolute paths (for production), with optional index file trimming.
