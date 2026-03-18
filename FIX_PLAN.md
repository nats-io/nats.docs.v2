# Fix Plan: generate-docs Review Issues

Prioritized plan to address all issues found during PR review.
Each item includes the problem, root cause, and concrete fix.

---

## P0 — Must fix before merge

### 1. Fix `varz.md` broken response import

**Problem:** `docs/reference/system/monitor/varz.md` line 5 imports
`@site/jsm.go/schemas/server/monitor/v1/varz.json` (old path) while the request
import on line 4 uses the new `@site/src/schemas/` path. No `varz_response.json`
exists at `src/schemas/` either. This will break the build or render a broken page.

**Fix:**
- Copy `jsm.go/schemas/server/monitor/v1/varz.json` → `src/schemas/server/monitor/v1/varz_response.json`
- Update `varz.md` import to `@site/src/schemas/server/monitor/v1/varz_response.json`
- This keeps the migration consistent with all other monitor endpoints

**Files:** `docs/reference/system/monitor/varz.md`, `src/schemas/server/monitor/v1/varz_response.json`

---

### 2. Don't mark request schema fields as `required`

**Problem:** `buildStructProperties()` (line 465-467) treats any field without
`omitempty`/`omitzero` as required. For request option structs (e.g., `ConnzOptions`),
all fields are optional query parameters — clients don't need to send any of them.

**Root cause:** The `required` heuristic is valid for response structs (server always
populates them) but wrong for request structs.

**Fix:** Add a `isRequest bool` parameter through the schema generation chain:
- `typeInfoToSchema()` already knows `schemaType` ("request" vs "response")
- Pass this down to `buildStructProperties()`
- When `isRequest == true`, never add fields to `required` — all request fields are optional
- Chain: `typeInfoToSchema` → `buildStructProperties(info, registry, 0, isRequest)` → skip required logic when true

**Files:** `scripts/generate-docs.go` — functions `typeInfoToSchema`, `buildStructProperties`

---

### 3. Include struct fields without JSON tags

**Problem:** `extractFields()` (line 170-174) skips fields when `parseJSONTag()`
returns `include=false`, which happens when a field has no `json:` tag at all.
Go's `encoding/json` marshals such fields using the exact field name. Many
nats-server monitor structs have untagged fields.

**Root cause:** `parseJSONTag()` conflates "has `json:\"-\"`" (explicit skip) with
"has no json tag at all" (should be included with field name as key).

**Fix:** Change `extractFields()`:
```go
if field.Tag != nil {
    jsonName, omitEmpty, omitZero, include := parseJSONTag(field.Tag.Value)
    if !include {
        continue // json:"-" → explicitly excluded
    }
    fi.JSONName = jsonName
    fi.OmitEmpty = omitEmpty
    fi.OmitZero = omitZero
} else {
    // No tag at all → include with Go field name (matches encoding/json behavior)
    fi.JSONName = field.Names[0].Name
    fi.OmitEmpty = true // treat as optional since no tag
}
```
Also update the fallback in `buildStructProperties()` (line 452-455): when
`jsonName` is empty but the field was included, use the exact Go field name
(not `strings.ToLower`), matching `encoding/json` behavior.

**Files:** `scripts/generate-docs.go` — functions `extractFields`, `buildStructProperties`

---

## P1 — Should fix before merge

### 4. Expand TypeRegistry to parse more source files

**Problem:** Only 3 files are parsed (`monitor.go`, `monitor_sort_opts.go`,
`events.go`). Types defined in `jetstream_api.go`, `stream.go`, `consumer.go`,
`opts.go`, etc. silently become `{"type": "object"}` with no properties. This
affects `jsz_response.json`, `statsz_response.json`, `raftz_response.json` and
others — nested types like `config`, `cluster`, `consumer_detail` are opaque.

**Fix:** Add more source files to `monitorSourceFiles`:
```go
var monitorSourceFiles = []string{
    "server/monitor.go",
    "server/monitor_sort_opts.go",
    "server/events.go",
    "server/stream.go",
    "server/consumer.go",
    "server/jetstream.go",
    "server/jetstream_api.go",
    "server/opts.go",
    "server/client.go",
    "server/gateway.go",
    "server/leafnode.go",
    "server/route.go",
}
```
Start with the files that define types referenced in existing monitor response
structs. Verify by running the generator and checking which schemas still have
bare `{"type": "object"}` — iterate until the main response schemas are fully
populated.

**Risk:** More files = more types = potential for new edge cases in the AST parser.
Test with `-dry-run` first.

**Files:** `scripts/generate-docs.go` — `monitorSourceFiles` variable

---

### 5. Use user-friendly error names in system errors doc

**Problem:** The old docs used readable strings like `Maximum Connections Exceeded`
with clear descriptions. The new version uses Go constants like
`ErrTooManyConnections` with descriptions that redundantly repeat the constant name.

**Fix:** In `parseSystemErrors()`, prioritize the error string from
`extractErrorString()` as the display name, and use the Go constant as secondary:
```go
displayName := extractErrorString(vs)
if displayName != "" {
    displayName = capitalize(displayName)
} else {
    displayName = name.Name
}
```
Update the `SystemError` type to have both `Name` (Go constant) and `DisplayName`
(user-facing string). Update the system-errors template to show `DisplayName` as
the primary name in the table and `Name` (Go constant) as a secondary reference
(e.g., in a smaller font or parenthetical).

**Files:** `scripts/generate-docs.go` — `parseSystemErrors`, `SystemError` struct;
`scripts/templates/system-errors.md.tmpl`

---

### 6. Add post-generation validation

**Problem:** The generator exits 0 even when producing empty/incomplete output.
Missing source files, empty template ranges, unresolved types — all silent.

**Fix:** Add a validation pass at the end of `generateDocs()`:
```go
// After all generation is done:
var warnings []string

// Check JetStream errors
if len(jsErrors) == 0 {
    warnings = append(warnings, "WARN: No JetStream errors found")
}

// Check system errors
if len(sysErrors) == 0 {
    warnings = append(warnings, "WARN: No system errors found")
}

// Check headers
if len(headers) == 0 {
    warnings = append(warnings, "WARN: No headers found")
}

// Check schema files written
expectedSchemas := countExpectedSchemas(endpoints)
actualSchemas := countGeneratedSchemas(schemasDir)
if actualSchemas < expectedSchemas {
    warnings = append(warnings, fmt.Sprintf("WARN: Expected %d schemas, got %d", expectedSchemas, actualSchemas))
}

// Check for unresolved types (bare {"type": "object"} in schemas)
unresolvedCount := countUnresolvedTypes(schemasDir)
if unresolvedCount > 0 {
    warnings = append(warnings, fmt.Sprintf("WARN: %d unresolved types (bare object) in schemas", unresolvedCount))
}

if len(warnings) > 0 {
    fmt.Fprintln(os.Stderr, "\n--- Generation Warnings ---")
    for _, w := range warnings {
        fmt.Fprintln(os.Stderr, w)
    }
    // Return error to fail CI but not local dev
    if strictMode {
        return fmt.Errorf("generation completed with %d warnings", len(warnings))
    }
}
```
Add a `-strict` flag that turns warnings into errors (for CI). Default to
warning-only for local development.

**Files:** `scripts/generate-docs.go` — `generateDocs`, new validation functions, new `-strict` flag

---

### 7. Restore dropped system error sections

**Problem:** Two useful conceptual groupings from main are missing:
- "Slow Consumer and Flow Control" — errors like `Slow Consumer Detected` are only
  partially covered in Connection Close Reasons
- "Configuration and Resolver Errors" — `Account Resolver Missing`, `System Account Not Setup`, etc.

**Root cause:** These sections exist in the categorization rules (line 875-880) but
the matching `Err*` constants may have different naming than expected, or the
user-facing strings from `errors.go` aren't being extracted for the generated table.

**Fix:**
- Verify which `Err*` constants match these categories by running the generator with
  debug output: print each error and its assigned category
- For errors that exist as runtime strings but not as `Err*` constants, add them to
  `supplementalErrors` (line 928) — this is the mechanism already designed for this
- Add entries for: `Slow Consumer Detected`, `Consumer Is Slow`,
  `Write Deadline Exceeded`, `Account Resolver Missing`, `Account Resolver Update Too Soon`,
  `System Account Not Setup`, `Credentials Have Been Revoked`, `Stale Connection`

**Files:** `scripts/generate-docs.go` — `supplementalErrors` slice

---

## P2 — Should fix soon after merge

### 8. Remove hardcoded personal path fallback

**Problem:** Line 1789 falls back to `~/coding/nats-server`. The npm script
`generate-docs` in `package.json` also uses `-server ~/coding/nats-server`.

**Fix:**
- In `main()`, remove the `~/coding/nats-server` fallback. Keep only:
  1. `-server` flag (explicit)
  2. `./nats-server` (submodule)
  3. `../nats-server` (sibling directory)
  4. Error with clear message if none found
- Update `package.json` `generate-docs` script to use `-server ./nats-server`
  (same as `generate-docs:build`)
- Remove the unused `natsServerPath` constant (line 19)

**Files:** `scripts/generate-docs.go` — `main()`, constants; `package.json`

---

### 9. Warn on unresolved external types

**Problem:** `resolveSelectorExpr()` silently returns `{"type": "object"}` for
unknown `pkg.Type` expressions. No way to know which types are missing.

**Fix:** Add a logger/collector for unresolved types:
```go
var unresolvedTypes []string // package-level

func resolveSelectorExpr(t *ast.SelectorExpr) JSONProperty {
    key := fmt.Sprintf("%s.%s", t.X.(*ast.Ident).Name, t.Sel.Name)
    if prop, ok := externalTypes[key]; ok {
        return prop
    }
    unresolvedTypes = append(unresolvedTypes, key)
    return JSONProperty{Type: "object", Comment: fmt.Sprintf("unresolved: %s", key)}
}
```
Print the collected unresolved types at the end of generation. This immediately
surfaces when new external types need to be added to `externalTypes`.

**Files:** `scripts/generate-docs.go` — `resolveSelectorExpr`, `generateDocs`

---

### 10. Warn on unresolved embedded structs and depth limit hits

**Problem:** `buildStructProperties()` silently skips embedded structs it can't
resolve (line 441-448). Depth limit hits (line 431-432) silently return empty
objects.

**Fix:** Add warnings when:
- An embedded struct name can't be found in the registry
- The depth limit is reached (include the type name chain)

```go
if embeddedInfo == nil {
    fmt.Printf("Warning: Embedded struct %q not found in registry\n", field.Name)
}
```
```go
if depth > 10 {
    fmt.Printf("Warning: Depth limit reached for type chain at depth %d\n", depth)
    return nil, nil
}
```

**Files:** `scripts/generate-docs.go` — `buildStructProperties`, `goTypeToJSONSchema`

---

### 11. Make map iteration deterministic

**Problem:** Leftover error categories (line 676-678) and header sections
(line 1471-1476) iterate over maps non-deterministically. Output order can change
between runs, creating noisy diffs.

**Fix:** Collect remaining map keys, sort them, then iterate in sorted order:
```go
var remainingKeys []string
for name := range categories {
    remainingKeys = append(remainingKeys, name)
}
sort.Strings(remainingKeys)
for _, name := range remainingKeys {
    result = append(result, ErrorCategory{Name: name, Errors: categories[name]})
}
```
Apply the same pattern to `buildHeaderSections`.

**Files:** `scripts/generate-docs.go` — `categorizeJSErrors`, `buildHeaderSections`

---

## P3 — Nice to have

### 12. Split single file into logical modules

**Problem:** 1807 lines with 5 distinct concerns in one file.

**Fix:** Split into separate files within `package main` in `scripts/`:
- `scripts/main.go` — flag parsing, `generateDocs` orchestration
- `scripts/typeregistry.go` — `TypeRegistry`, `ParseFile`, `extractFields`, `parseJSONTag`
- `scripts/schema.go` — `goTypeToJSONSchema`, `buildStructProperties`, `generateMonitorSchemas`, JSON types
- `scripts/errors_jetstream.go` — `parseJSErrors`, `categorizeJSErrors`
- `scripts/errors_system.go` — `parseSystemErrors`, `categorizeSystemErrors`, `supplementalErrors`, `parseClosedStates`
- `scripts/headers.go` — `parseHeaders`, `categorizeHeaderWithSubsection`, `buildHeaderSections`, description/type overrides
- `scripts/helpers.go` — `cleanComment`, `capitalize`, `escapeMDX`, `generateFromTemplate`

**Impact:** No logic changes. Build command changes from `go run scripts/generate-docs.go`
to `go run ./scripts/` (runs the package).

**Files:** All above, plus `package.json` npm scripts

---

### 13. Fix `capitalize()` for UTF-8

**Problem:** `s[:1]` takes only the first byte, corrupting multi-byte runes.

**Fix:**
```go
func capitalize(s string) string {
    if s == "" {
        return s
    }
    r, size := utf8.DecodeRuneInString(s)
    return string(unicode.ToUpper(r)) + s[size:]
}
```

**Files:** `scripts/generate-docs.go` — `capitalize` function

---

### 14. Write to buffer before file

**Problem:** `generateFromTemplate()` (line 1657-1668) writes directly to file.
If `tmpl.Execute` fails midway, a partial file remains.

**Fix:** Execute template into `bytes.Buffer` first, then write:
```go
var buf bytes.Buffer
if err := tmpl.Execute(&buf, data); err != nil {
    return fmt.Errorf("failed to execute template: %w", err)
}
return os.WriteFile(outPath, buf.Bytes(), 0644)
```

**Files:** `scripts/generate-docs.go` — `generateFromTemplate`

---

### 15. Restore lost formatting in header descriptions

**Problem:**
- `Nats-TTL` lost example format: was "Duration string (e.g., '60s', '5m')", now just "Duration"
- `Nats-Rollup` lost backtick formatting around `sub` and `all`

**Fix:** Update `headerDescriptionData` (line 1314) and `headerValueTypeOverrides`
(line 1256) to match the richer descriptions from main.

**Files:** `scripts/generate-docs.go` — `headerDescriptionData`, `headerValueTypeOverrides`

---

## Execution Order

```
P0 (before merge):     1 → 2 → 3           (each independent, can parallelize)
P1 (before/with merge): 4 → 5 → 6 → 7     (4 first — it unblocks better schemas)
P2 (soon after):        8 → 9 → 10 → 11   (all independent, can parallelize)
P3 (whenever):          12 → 13 → 14 → 15  (all independent)
```
