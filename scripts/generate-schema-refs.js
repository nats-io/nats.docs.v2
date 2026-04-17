#!/usr/bin/env node
/**
 * generate-schema-refs.js
 *
 * Renders the 71 "pure template" reference MDX files from
 * scripts/schema-refs.json into a versioned docs tree, rewriting each
 * schema import to point at that version's vendored schemas at
 * src/schemas/vendor/v<version>/.
 *
 * Usage:
 *   node scripts/generate-schema-refs.js <version> [--out DIR]
 *
 * Defaults to writing into reference_versioned_docs/version-<version>/.
 *
 * Pairs with scripts/extract-schema-refs.js (one-shot), which produced
 * schema-refs.json by parsing an existing version-2.12 reference tree.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SCHEMA_REFS = path.join(ROOT, "scripts/schema-refs.json");

function die(msg) {
  process.stderr.write(`ERROR: ${msg}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const out = { version: null, outDir: null };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") {
      out.outDir = argv[++i] ?? die("--out requires value");
    } else if (a === "-h" || a === "--help") {
      process.stdout.write(
        "Usage: node scripts/generate-schema-refs.js <version> [--out DIR]\n",
      );
      process.exit(0);
    } else if (a.startsWith("--")) {
      die(`unknown flag: ${a}`);
    } else {
      rest.push(a);
    }
  }
  if (rest.length !== 1) die(`expected exactly one positional arg (version), got ${rest.length}`);
  out.version = rest[0];
  if (!out.outDir) {
    out.outDir = path.join(ROOT, "reference_versioned_docs", `version-${out.version}`);
  }
  return out;
}

/**
 * Render a single schema-ref entry to MDX source.
 *
 * Layout (fixed, for consistency across regenerated files):
 *
 *   # Title
 *
 *   Description.            (if present)
 *
 *   import JSONSchema from '@site/src/components/JSONSchema';
 *   import v1 from '…';     (one per schema)
 *
 *   ## Subject              (if subject section present)
 *
 *   `$…`                    (inline, bulleted, or code-fence)
 *
 *   Subject prose…          (if present)
 *
 *   ## Request Schema       (per schema, using entry's recorded label)
 *
 *   <JSONSchema schema={var} />
 */
function renderEntry(entry, version) {
  const importBase = `@site/src/schemas/vendor/v${version}`;
  const parts = [];

  parts.push(`# ${entry.title}`);
  if (entry.description) {
    parts.push("");
    parts.push(entry.description);
  }

  // Imports
  parts.push("");
  parts.push("import JSONSchema from '@site/src/components/JSONSchema';");
  for (const s of entry.schemas) {
    parts.push(`import ${s.var} from '${importBase}/${s.import}';`);
  }

  // Subject section
  const hasSubjectSection =
    entry.subjectLabel && (entry.subjects.length > 0 || entry.subjectProse);
  if (hasSubjectSection) {
    parts.push("");
    parts.push(`## ${entry.subjectLabel}`);
    parts.push("");
    if (entry.subjects.length > 0) {
      if (entry.subjectStyle === "fence") {
        parts.push("```");
        for (const s of entry.subjects) parts.push(s);
        parts.push("```");
      } else if (entry.subjects.length === 1) {
        parts.push("`" + entry.subjects[0] + "`");
      } else {
        // inline + multiple → bulleted list
        for (const s of entry.subjects) parts.push("- `" + s + "`");
      }
    }
    if (entry.subjectProse) {
      parts.push("");
      parts.push(entry.subjectProse);
    }
  }

  // Schema sections
  for (const s of entry.schemas) {
    parts.push("");
    parts.push(`## ${s.label}`);
    parts.push("");
    parts.push(`<JSONSchema schema={${s.var}} />`);
  }

  return parts.join("\n") + "\n";
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(SCHEMA_REFS)) die(`${SCHEMA_REFS} not found`);

  const data = JSON.parse(fs.readFileSync(SCHEMA_REFS, "utf8"));
  if (!Array.isArray(data.entries)) die(`${SCHEMA_REFS}: 'entries' must be an array`);

  fs.mkdirSync(opts.outDir, { recursive: true });

  // Resolve the vendor directory for this version so we can skip entries
  // whose schemas do not exist (e.g. v2.12-only advisories when generating
  // for v2.11).
  const vendorDir = path.join(ROOT, "src/schemas/vendor", `v${opts.version}`);

  let count = 0;
  let skipped = 0;
  for (const entry of data.entries) {
    // Skip entries whose schema files are missing from this version's vendor.
    const missing = entry.schemas.filter(
      (s) => !fs.existsSync(path.join(vendorDir, s.import)),
    );
    if (missing.length > 0) {
      process.stderr.write(
        `[schema-refs] skipping ${entry.path}: missing schemas ${missing.map((m) => m.import).join(", ")} in v${opts.version}\n`,
      );
      skipped++;
      continue;
    }

    const out = path.join(opts.outDir, `${entry.path}.md`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, renderEntry(entry, opts.version));
    count++;
  }
  process.stderr.write(
    `[schema-refs] wrote ${count} files to ${path.relative(ROOT, opts.outDir)} (v${opts.version})${skipped ? `, skipped ${skipped}` : ""}\n`,
  );
}

main();
