#!/usr/bin/env node
/**
 * generate-version.js
 *
 * Regenerates one or more versions of the reference docs from all four
 * sources (nats-server, jsm.go, config-generator types, schema-refs.json)
 * plus the shared hand-written content in docs-reference/. Each version's
 * output is a self-contained tree under reference_versioned_docs/version-<name>/
 * and src/schemas/vendor/v<name>/ so Docusaurus can render past NATS majors
 * without cross-version leakage.
 *
 * Pipeline per version:
 *   1. checkout nats-server and jsm.go submodules at the configured tags
 *   2. wipe reference_versioned_docs/version-<name>/  (clean slate)
 *   3. copy docs-reference/** → version-<name>/        (hand-written content:
 *        landing page, protocol specs, index.md files)
 *   4. generate-docs.go                                (errors, headers,
 *        monitor schemas from nats-server; copy jsm.go/schemas into vendor)
 *   5. seed src/schemas/vendor/v<name>/server/monitor/v1/varz_response.json
 *      from scripts/seed-varz-response.json (nats-server does not generate
 *      this schema and the older jsm.go tags don't ship it either)
 *   6. tools/config-generator                          (config tree .md files
 *        and a config-sidebar.json fragment at a temp path)
 *   7. generate-schema-refs.js                         (71 pure-template MDX
 *        files with version-scoped schema imports)
 *   8. build reference_versioned_sidebars/version-<name>-sidebars.json by
 *      splicing the config-sidebar fragment into a fixed reference-sidebar
 *      template (doc IDs have their legacy "reference/" prefix stripped)
 *   9. restore submodules to their original HEADs (unless --no-restore)
 *
 * Usage:
 *   node scripts/generate-version.js                # all versions
 *   node scripts/generate-version.js 2.12           # single version
 *   node scripts/generate-version.js --no-restore   # leave submodules on tag
 */

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const ROOT = path.resolve(__dirname, "..");
const CONFIG = path.join(ROOT, "scripts/doc-versions.json");
const SCHEMA_REFS = path.join(ROOT, "scripts/schema-refs.json");
const DOCS_REFERENCE_SRC = path.join(ROOT, "docs-reference");
const SEED_VARZ = path.join(ROOT, "scripts/seed-varz-response.json");

// --------------------------------------------------------------------------
// helpers
// --------------------------------------------------------------------------

function log(msg) {
  process.stderr.write(`[generate-version] ${msg}\n`);
}

function die(msg) {
  log(`ERROR: ${msg}`);
  process.exit(1);
}

function git(repoPath, args, { capture = true } = {}) {
  const res = spawnSync("git", ["-C", repoPath, ...args], {
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (res.status !== 0) {
    const err = capture ? res.stderr.trim() : `exit ${res.status}`;
    throw new Error(`git ${args.join(" ")} (in ${repoPath}): ${err}`);
  }
  return capture ? res.stdout.trim() : "";
}

function currentRef(repoPath) {
  try {
    const branch = git(repoPath, ["symbolic-ref", "--short", "HEAD"]);
    if (branch) return branch;
  } catch (_) {
    /* detached */
  }
  return git(repoPath, ["rev-parse", "HEAD"]);
}

function checkoutTag(repoPath, tag) {
  log(`  fetching tags in ${path.relative(ROOT, repoPath)}`);
  git(repoPath, ["fetch", "--tags", "--quiet"]);
  log(`  checking out ${tag}`);
  git(repoPath, ["checkout", "--quiet", tag]);
}

/**
 * Assert `dir` is its own git repository, not merely an existing directory.
 * An uninitialized submodule leaves an empty directory behind, and `git -C`
 * on it silently walks up to this repo — so checkoutTag would fetch and check
 * out the docs repo itself at a server tag, and the restore in main() would
 * then "restore" it. Comparing the resolved toplevel against dir is the only
 * check that catches that; existsSync passes on the empty directory.
 */
function assertGitRepo(dir, name) {
  const hint = `run: git submodule update --init --filter=tree:0 ${name}`;
  if (!fs.existsSync(dir)) die(`${name} submodule missing at ${dir} — ${hint}`);
  let top;
  try {
    top = git(dir, ["rev-parse", "--show-toplevel"]);
  } catch (e) {
    die(`${name} at ${dir} is not a git repository — ${hint}`);
  }
  if (fs.realpathSync(top) !== fs.realpathSync(dir)) {
    die(
      `${name} at ${dir} is not initialized; git resolves it to ${top} — ${hint}`,
    );
  }
}

function rmrf(target) {
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
}

/** Recursively copy dir contents. Creates dst as needed. */
function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      copyDir(s, d);
    } else if (entry.isFile()) {
      fs.mkdirSync(path.dirname(d), { recursive: true });
      fs.copyFileSync(s, d);
    }
  }
}

/**
 * Walk a sidebar tree (array or object) and rewrite doc-ID strings to drop
 * a legacy prefix. Mirrors the shape Docusaurus expects for sidebars JSON.
 */
function stripDocIdPrefix(node, prefix) {
  if (typeof node === "string") {
    return node.startsWith(prefix) ? node.slice(prefix.length) : node;
  }
  if (Array.isArray(node)) return node.map((n) => stripDocIdPrefix(n, prefix));
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === "id" && typeof v === "string") {
        out[k] = v.startsWith(prefix) ? v.slice(prefix.length) : v;
      } else if (k === "items" && Array.isArray(v)) {
        out[k] = v.map((n) => stripDocIdPrefix(n, prefix));
      } else if (k === "link" && v && typeof v === "object") {
        out[k] = stripDocIdPrefix(v, prefix);
      } else {
        out[k] = v;
      }
    }
    return out;
  }
  return node;
}

// --------------------------------------------------------------------------
// sidebar template
// --------------------------------------------------------------------------

/**
 * Fixed structural template for the per-version reference sidebar. The
 * "Configuration" category is spliced in from the config-generator output;
 * leaf doc IDs match the filesystem layout under reference_versioned_docs/
 * version-<name>/ (no "reference/" prefix).
 *
 * Schema-refs entries are plumbed in here from scripts/schema-refs.json so
 * the sidebar stays in sync with what the schema-ref generator produces —
 * avoids having two sources of truth.
 */
function buildSidebarTemplate(schemaRefs, configCategory) {
  const pathsByKind = (kind) =>
    schemaRefs.filter((e) => e.kind === kind).map((e) => e.path);

  const apiByParent = {};
  for (const p of pathsByKind("api")) {
    const parts = p.split("/"); // jetstream/api/<group>/<name>
    const group = parts[2];
    (apiByParent[group] = apiByParent[group] || []).push(p);
  }

  return [
    { type: "doc", id: "index", label: "Reference" },
    { type: "link", label: "Release Notes", href: "/release-notes/" },
    configCategory,
    {
      type: "category",
      label: "JetStream",
      collapsed: true,
      link: { type: "doc", id: "jetstream/index" },
      items: [
        {
          type: "category",
          label: "API",
          collapsed: true,
          link: { type: "doc", id: "jetstream/api/index" },
          items: [
            {
              type: "category",
              label: "Account",
              collapsed: true,
              link: { type: "doc", id: "jetstream/api/account/index" },
              items: apiByParent.account ?? [],
            },
            {
              type: "category",
              label: "Stream",
              collapsed: true,
              link: { type: "doc", id: "jetstream/api/stream/index" },
              items: apiByParent.stream ?? [],
            },
            {
              type: "category",
              label: "Consumer",
              collapsed: true,
              link: { type: "doc", id: "jetstream/api/consumer/index" },
              items: apiByParent.consumer ?? [],
            },
            {
              type: "category",
              label: "Meta",
              collapsed: true,
              link: { type: "doc", id: "jetstream/api/meta/index" },
              items: apiByParent.meta ?? [],
            },
            { type: "doc", label: "Headers", id: "jetstream/api/headers" },
          ],
        },
        {
          type: "category",
          label: "Advisories",
          collapsed: true,
          link: { type: "doc", id: "jetstream/advisory/index" },
          items: pathsByKind("advisory").filter((p) => p.startsWith("jetstream/advisory/")),
        },
        {
          type: "category",
          label: "Metric",
          collapsed: true,
          link: { type: "doc", id: "jetstream/metric/index" },
          items: pathsByKind("metric").filter((p) => p.startsWith("jetstream/metric/")),
        },
        { type: "doc", label: "Errors", id: "jetstream/errors" },
      ],
    },
    {
      type: "category",
      label: "System",
      collapsed: true,
      link: { type: "doc", id: "system/index" },
      items: [
        {
          type: "category",
          label: "Advisory",
          collapsed: true,
          link: { type: "doc", id: "system/advisory/index" },
          items: pathsByKind("advisory").filter((p) => p.startsWith("system/advisory/")),
        },
        {
          type: "category",
          label: "Metric",
          collapsed: true,
          link: { type: "doc", id: "system/metric/index" },
          items: pathsByKind("metric").filter((p) => p.startsWith("system/metric/")),
        },
        {
          type: "category",
          label: "Monitoring",
          collapsed: true,
          link: { type: "doc", id: "system/monitor/index" },
          items: pathsByKind("monitor"),
        },
        { type: "doc", label: "Errors", id: "system/errors" },
      ],
    },
    {
      type: "category",
      label: "Services",
      collapsed: true,
      link: { type: "doc", id: "services/index" },
      items: pathsByKind("services"),
    },
    {
      type: "category",
      label: "Protocols",
      collapsed: true,
      link: { type: "doc", id: "protocols/index" },
      items: [
        "protocols/client",
        "protocols/route",
        "protocols/leafnode",
        "protocols/gateway",
      ],
    },
  ];
}

// --------------------------------------------------------------------------
// per-version pipeline steps
// --------------------------------------------------------------------------

function runCmd(cmd, args, { cwd = ROOT } = {}) {
  log(`  $ ${cmd} ${args.join(" ")}`);
  const res = spawnSync(cmd, args, { cwd, stdio: "inherit" });
  if (res.status !== 0) {
    throw new Error(`${cmd} ${args[0] ?? ""} exited with ${res.status}`);
  }
}

function step_copyHandWritten(outDocs) {
  log(`  copying docs-reference/ → ${path.relative(ROOT, outDocs)}`);
  copyDir(DOCS_REFERENCE_SRC, outDocs);
}

function step_runGenerateDocs(paths) {
  runCmd("go", [
    "run",
    "scripts/generate-docs.go",
    "-server", paths.natsPath,
    "-jsm", paths.jsmPath,
    "-docs-out", paths.outDocs,
    "-monitor-schemas-out", paths.outMonitorSchemas,
    "-jsm-schemas-out", paths.outJsmSchemas,
  ]);
}

function step_seedVarzResponse(paths) {
  const dst = path.join(paths.outMonitorSchemas, "varz_response.json");
  if (fs.existsSync(dst)) return; // generator/jsm.go already wrote one
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(SEED_VARZ, dst);
  log(`  seeded ${path.relative(ROOT, dst)}`);
}

function step_runConfigGenerator(paths, versionName, knownVersions) {
  // config-generator does not clean its output dir; wipe it here so repeat
  // runs drop renamed or removed properties.
  const configDir = path.join(paths.outDocs, "config");
  rmrf(configDir);
  runCmd(
    "go",
    [
      "run",
      "-C", "./tools/config-generator",
      ".",
      "-types", "./types",
      "-markdown",
      "-trimindex",
      // Emit version-relative `./child.md` links between config pages so each
      // version's links resolve within its own tree. Docusaurus rewrites them
      // per-version automatically — no version segment is baked into the
      // output, so flipping `latest` never requires relinking older versions.
      "-relative",
      "-dir", path.relative(path.join(ROOT, "tools/config-generator"), configDir),
      "-base", "/reference/config",
      "-sidebar", path.relative(path.join(ROOT, "tools/config-generator"), paths.configSidebarTmp),
      // Render this version's answers. Properties gated to a newer server drop
      // out of the page tree, the parent tables and the sidebar together, and
      // per-version `versions:` overrides are folded in. -known lets the
      // generator reject an annotation naming a version that no longer exists
      // instead of silently matching nothing.
      "-version", versionName,
      "-known", knownVersions.join(","),
    ],
  );
}

function step_runSchemaRefs(version, paths) {
  runCmd("node", ["scripts/generate-schema-refs.js", version, "--out", paths.outDocs]);
}

function step_buildSidebar(version, paths) {
  // Filter schema-refs to only entries whose schemas exist in this version's
  // vendor dir — mirrors the filtering in generate-schema-refs.js.
  const vendorDir = path.join(ROOT, "src/schemas/vendor", `v${version}`);
  const allSchemaRefs = JSON.parse(fs.readFileSync(SCHEMA_REFS, "utf8")).entries;
  const schemaRefs = allSchemaRefs.filter((e) =>
    e.schemas.every((s) => fs.existsSync(path.join(vendorDir, s.import))),
  );

  if (!fs.existsSync(paths.configSidebarTmp)) {
    throw new Error(`config sidebar not produced at ${paths.configSidebarTmp}`);
  }
  const rawConfig = JSON.parse(fs.readFileSync(paths.configSidebarTmp, "utf8"));
  // config-generator emits IDs prefixed with "reference/" because it was
  // invoked with -base /reference/config (keeps URL links pointing at
  // /reference/config/...). Strip that prefix so IDs match the versioned
  // docs tree layout.
  const configCategory = stripDocIdPrefix(rawConfig, "reference/");

  const sidebarItems = buildSidebarTemplate(schemaRefs, configCategory);
  const sidebarJson = { referenceSidebar: sidebarItems };
  const out = path.join(
    ROOT,
    "reference_versioned_sidebars",
    `version-${version}-sidebars.json`,
  );
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(sidebarJson, null, 2) + "\n");
  log(`  wrote ${path.relative(ROOT, out)}`);
}

// --------------------------------------------------------------------------
// orchestration
// --------------------------------------------------------------------------

function generateOne(version, tmpDir, knownVersions) {
  log(`==> version ${version.name}`);
  log(`    nats-server: ${version["nats-server"]}`);
  log(`    jsm.go:      ${version["jsm.go"]}`);

  const natsPath = path.join(ROOT, "nats-server");
  const jsmPath = path.join(ROOT, "jsm.go");
  assertGitRepo(natsPath, "nats-server");
  assertGitRepo(jsmPath, "jsm.go");

  const paths = {
    natsPath,
    jsmPath,
    outDocs: path.join(ROOT, "reference_versioned_docs", `version-${version.name}`),
    outMonitorSchemas: path.join(
      ROOT,
      "src/schemas/vendor",
      `v${version.name}`,
      "server/monitor/v1",
    ),
    outJsmSchemas: path.join(ROOT, "src/schemas/vendor", `v${version.name}`, "jsm"),
    configSidebarTmp: path.join(tmpDir, `config-sidebar-v${version.name}.json`),
  };

  checkoutTag(natsPath, version["nats-server"]);
  checkoutTag(jsmPath, version["jsm.go"]);

  // Generate into staging directories (siblings of final paths, same
  // filesystem) so a mid-pipeline failure does not leave partial output.
  const stageDocs = paths.outDocs + ".staging";
  const stageVendorRoot = path.join(ROOT, "src/schemas/vendor", `v${version.name}.staging`);
  const stageMonitorSchemas = path.join(stageVendorRoot, "server/monitor/v1");
  const stageJsmSchemas = path.join(stageVendorRoot, "jsm");

  // Clean any leftover staging dirs from a prior aborted run.
  rmrf(stageDocs);
  rmrf(stageVendorRoot);

  const stagePaths = {
    ...paths,
    outDocs: stageDocs,
    outMonitorSchemas: stageMonitorSchemas,
    outJsmSchemas: stageJsmSchemas,
  };

  let stageOk = false;
  try {
    step_copyHandWritten(stagePaths.outDocs);
    step_runGenerateDocs(stagePaths);
    step_seedVarzResponse(stagePaths);
    step_runConfigGenerator(stagePaths, version.name, knownVersions);
    step_runSchemaRefs(version.name, stagePaths);
    stageOk = true;
  } finally {
    if (!stageOk) {
      log(`  cleaning up staging dirs after failure`);
      rmrf(stageDocs);
      rmrf(stageVendorRoot);
    }
  }

  // All steps succeeded — swap staging into final locations.
  fs.mkdirSync(path.dirname(paths.outDocs), { recursive: true });
  rmrf(paths.outDocs);
  fs.renameSync(stageDocs, paths.outDocs);

  const vendorRoot = path.join(ROOT, "src/schemas/vendor", `v${version.name}`);
  fs.mkdirSync(path.dirname(vendorRoot), { recursive: true });
  rmrf(vendorRoot);
  fs.renameSync(stageVendorRoot, vendorRoot);

  // Sidebar is written after swap so it stays consistent with the docs tree.
  step_buildSidebar(version.name, paths);

  log(`    done: ${path.relative(ROOT, paths.outDocs)}`);
}

function parseArgs(argv) {
  const out = { versionName: null, restore: true };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--no-restore") out.restore = false;
    else if (a === "-h" || a === "--help") {
      process.stdout.write(
        "Usage: node scripts/generate-version.js [version] [--no-restore]\n",
      );
      process.exit(0);
    } else if (a.startsWith("--")) die(`unknown flag: ${a}`);
    else rest.push(a);
  }
  if (rest.length > 1) die(`unexpected args: ${rest.slice(1).join(" ")}`);
  if (rest.length === 1) out.versionName = rest[0];
  return out;
}

function readConfig() {
  if (!fs.existsSync(CONFIG)) die(`config not found: ${CONFIG}`);
  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(CONFIG, "utf8")); }
  catch (e) { die(`invalid JSON in ${CONFIG}: ${e.message}`); }
  if (!Array.isArray(cfg.versions) || cfg.versions.length === 0)
    die(`${CONFIG} must contain a non-empty 'versions' array`);
  for (const [i, entry] of cfg.versions.entries()) {
    for (const field of ["name", "nats-server", "jsm.go"]) {
      if (typeof entry[field] !== "string" || entry[field].length === 0)
        die(`${CONFIG}: versions[${i}] is missing required string field '${field}'`);
    }
  }
  return cfg;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const cfg = readConfig();
  const targets = opts.versionName
    ? cfg.versions.filter((v) => v.name === opts.versionName)
    : cfg.versions;
  if (opts.versionName && targets.length === 0)
    die(`version not found in config: ${opts.versionName}`);

  const natsPath = path.join(ROOT, "nats-server");
  const jsmPath = path.join(ROOT, "jsm.go");
  // Before currentRef, which is the first call that would silently read this
  // repo's HEAD instead of the submodule's and record it as the ref to restore.
  assertGitRepo(natsPath, "nats-server");
  assertGitRepo(jsmPath, "jsm.go");
  const origNats = currentRef(natsPath);
  const origJsm = currentRef(jsmPath);
  log(`original HEAD: nats-server=${origNats} jsm.go=${origJsm}`);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gen-version-"));
  log(`tmp dir: ${tmpDir}`);

  let failed = false;
  try {
    for (const v of targets) {
      try { generateOne(v, tmpDir, cfg.versions.map((x) => x.name)); }
      catch (e) { log(`FAILED for ${v.name}: ${e.message}`); failed = true; }
    }
  } finally {
    if (opts.restore) {
      log(`restoring submodules`);
      try { git(natsPath, ["checkout", "--quiet", origNats]); }
      catch (e) { log(`WARN: could not restore nats-server: ${e.message}`); }
      try { git(jsmPath, ["checkout", "--quiet", origJsm]); }
      catch (e) { log(`WARN: could not restore jsm.go: ${e.message}`); }
    } else {
      log(`--no-restore: submodules left at their checked-out tags`);
    }
    rmrf(tmpDir);
  }

  if (failed) process.exit(1);
  log(`done`);
}

main();
