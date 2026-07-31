---
name: config-reload-audit
description: Derive config reference metadata — reload verdicts, version gating, added and removed keys — from nats-server source, and encode it in tools/config-generator. Use when adding a NATS version to scripts/doc-versions.json, bumping a pinned tag, or re-verifying a reload claim someone has questioned.
---

# Auditing nats-server for config reference metadata

The config reference at `/reference/config` is generated from `tools/config-generator/config.yaml` and
`tools/config-generator/types/*.yaml`. Three kinds of metadata in that spec can only be established by
reading server source: whether a key reloads (`reloadable`), which versions it exists in (`version`,
`removed`), and where behaviour differs between versions (`versions`).

This skill is the procedure for deriving those from source. It is mechanical — the answer is in
`server/reload.go` and `server/opts.go`, not in judgement.

## Ground rules

Read these first. Each one has already produced a wrong verdict in this repo.

**Assess at the pinned tags, never at the submodule checkout.** `scripts/doc-versions.json` maps each
doc version to the exact `nats-server` tag it renders from. The `nats-server` submodule pointer is
unrelated to those tags and has been months out of date. Always read source with
`git -C nats-server show "<tag>:server/reload.go"`.

**Patch releases change reload behaviour.** `gateway.tls.pinned_certs` fails the reload at `v2.11.9`
and reloads at `v2.11.17`. Use the tag in `doc-versions.json`, not "latest 2.11".

**Run `git show` under bash.** In zsh, `$tag:server/reload.go` is parsed as the `:s` substitution
modifier and silently resolves to a mangled rev — it returns empty output or a confusing
"ambiguous argument" naming a path you never typed. Wrap the loop in `bash -c '...'`.

**Do not trust the existing audit artifacts.** `reloadable-audit.tsv` and `hot-reload-opts.md` are
starting points, not sources. The TSV truncated 34 caveat strings at 160 characters, and at least one
row (`gateway.tls.pinned_certs`) states a verdict that is wrong for two of the three live versions.
Confirm every verdict against source before writing it.

**Verdicts do not cascade.** A block marked `not-reloadable` does not freeze its children. Children
routinely differ from the parent and from each other; each one gets its own reading.

## Step 1 — Fetch the tags

The submodule is a treeless clone, so tags need fetching before `git show` can reach their trees.

```bash
NS=nats-server
jq -r '.versions[]["nats-server"]' scripts/doc-versions.json |
  xargs -I{} git -C $NS fetch --filter=tree:0 --no-tags origin tag {}
```

This adds refs only. It does not move the checkout, so `git submodule status` stays clean.

## Step 2 — Derive the reload verdict

Everything is decided by `(*Server).diffOptions` in `server/reload.go`. It walks the `Options` struct
field by field and switches on the lowercased field name. There are three outcomes, which map exactly
onto the spec's four-value vocabulary (`tools/config-generator/CLAUDE.md` has the badge table).

**A `case` that appends an option to `diffOpts` → `reloadable`.** The change is accepted. What it does
at runtime is in that option's `Apply` method or in `applyOptions`. Read it: the runtime effect is what
the `reloadable_note` should describe, in particular whether it touches *existing* connections or only
ones established afterwards.

**No `case` → `not-reloadable`.** The field falls through to `default:`, which returns
`config reload not supported for %s`. Note that this aborts the *entire* reload, not just that key —
worth saying in the note when the key is one an operator might expect to be independent.

**A composite block compared with `reflect.DeepEqual` → read the blanking.** `gateway`, `leafnode`,
`mqtt` and `websocket` are compared wholesale after selectively zeroing sub-fields:

```go
case "gateway":
    tmpOld := oldValue.(GatewayOpts)
    tmpNew := newValue.(GatewayOpts)
    tmpOld.TLSConfig = nil       // blanked → excluded from the comparison
    tmpNew.TLSConfig = nil
    tmpOld.tlsConfigOpts = nil
    tmpNew.tlsConfigOpts = nil
    if !reflect.DeepEqual(tmpOld, tmpNew) {
        return nil, fmt.Errorf("config reload not supported for %s: ...", field.Name)
    }
```

The blanked fields are the reloadable ones. Everything else in the struct aborts the reload if it
differs. So the procedure is:

1. Read the block struct in `server/opts.go` (`GatewayOpts`, `LeafNodeOpts`, …).
2. List its exported fields.
3. Subtract the fields blanked in the `case` body.
4. What remains is `not-reloadable`. What was blanked is `reloadable`.

This single distinction explains most TLS verdicts. Certificate material lives in `tlsConfigOpts`,
which is blanked, so it reloads. TLS knobs hoisted onto the block struct as their own fields —
`TLSTimeout`, `TLSMap`, `TLSCheckKnownURLs`, `TLSPinnedCerts` — are not blanked, so each one fails the
reload. Map those back to config keys: `timeout`, `verify_and_map`,
`verify_cert_and_check_known_urls`, `pinned_certs`.

**Accepted by the parser but never stored → `noop`.** This is the state the operator cannot see: the
reload succeeds and the value is ignored. Find the block's parse function in `server/opts.go`
(`parseGateway`, `parseGateways`, `parseCluster`, `parseLeafNodes`, `parseRemoteLeafNodes`,
`parseLeafAuthorization`, `parseMQTT`, …) and check whether the parsed value is assigned to an
`Options` field at all. A key the parse function accepts and discards is `noop`, as is a key stored on
a struct that nothing reads. Cite the function in the note — "Silently discarded by `parseGateways`"
tells a reader where to check.

### Worked example

`gateway.tls.pinned_certs`, across the three pinned tags:

```bash
bash -c '
for t in v2.11.9 v2.12.4 v2.14.0; do
  echo "=== $t ==="
  git -C nats-server show "$t:server/reload.go" |
    grep -A 20 "case \"gateway\":" | grep -E "= nil|DeepEqual"
done'
```

At `v2.11.9` and `v2.12.4` only `TLSConfig` and `tlsConfigOpts` are blanked. `GatewayOpts.TLSPinnedCerts`
is a direct field, so it survives into the comparison and a change aborts the reload →
`not-reloadable`. At `v2.14.0` two more lines appear blanking `TLSPinnedCerts` → `reloadable`.

Then confirm the runtime effect for the version where it does reload. `recheckPinnedCerts` disconnects
already-connected peers whose certificate is no longer pinned — but check the guard, because it was
inverted (`reflect.DeepEqual` instead of `!reflect.DeepEqual`) in the same versions that could not
reload it. Only claim the disconnect behaviour for versions where both the blanking and the guard are
right.

The result is a per-version verdict, which is encoded with `versions:` rather than picking one answer.

## Step 3 — Derive version gating

For a new server version, the question is which config keys appeared or disappeared. The parse
functions enumerate accepted keys in `switch` statements, so diff the label sets between the old and
new tag:

```bash
bash -c '
keys() {
  git -C nats-server show "$1:server/opts.go" |
    sed -n "/^func $2(/,/^}/p" |
    grep -E "^[[:space:]]*case \"" |
    grep -oE "\"[a-z_]+\"" | tr -d "\"" | sort -u
}
for fn in parseGateway parseCluster parseLeafNodes parseMQTT; do
  echo "=== $fn ==="
  diff <(keys v2.12.4 $fn) <(keys v2.14.0 $fn)
done'
```

Sanity-check the extraction before trusting an empty diff — two empty sets also diff clean. Running
the same function across `v2.11.9 -> v2.12.4` should report `connect_backoff`, `write_deadline` and
`write_timeout` added to both `parseGateway` and `parseCluster`, which is what those keys'
`version: "2.12"` annotations record.

Lines only in the new tag are candidates for `version: "2.14"`. Lines only in the old tag are
candidates for `removed: "2.14"`. Confirm each one by reading the case body — a key can be renamed, or
moved to a different parse function, which shows up as both an add and a remove.

Do this per parse function, not globally. A key can exist at top level and not in a block: at 2.11
`write_deadline` is a top-level key only, and adding it under `cluster` would document config the
server rejects.

## Step 4 — Encode it

`tools/config-generator/CLAUDE.md` is the authority on the spec's vocabulary. In short:

- One verdict per key: `reloadable`, `not-reloadable`, or `noop`. Omitted means unaudited and renders
  no badge. An unrecognised value fails the build.
- `reloadable_note` for the caveat. Say what an operator would otherwise get wrong — whether existing
  connections are affected, and whether a rejection aborts the whole reload.
- Behaviour that differs by version goes in `versions:` with the unkeyed value as the default. A key
  may name several versions (`"2.11, 2.12"`). Two keys claiming the same version is a build error.
- A new key gets `version:`; a dropped one gets `removed:`.
- A key the server rejects in one context gets `omit: true` at that reference site, not a page saying
  "do not use this". Documenting config that fails to boot is worse than documenting nothing.
- For a shared type that needs different answers per context, override the child at the reference site
  under `properties:`. Do not duplicate the type.

Keep the parent block's note consistent with its children. A summary note listing the keys that fail
the reload will contradict a child page if a verdict changes and only one side is updated — that is
exactly how the `pinned_certs` inconsistency arose.

## Step 5 — Verify

```bash
cd tools/config-generator && gofmt -l . && go test ./...
go run . -audit -version 2.14 -known 2.11,2.12,2.14      # TSV of path/type/verdict
go run . -markdown -dir /tmp/out -strict                  # non-zero exit if any verdict is missing
cd ../.. && npm run generate-docs:all-versions
git status --short
```

Checks that matter:

- `git status` shows only the pages you expected to change. A verdict edit to a shared type that
  touches hundreds of files means the override was written on a node other contexts share — move it to
  a uniquely-owned ancestor.
- `git submodule status` is clean afterwards. The generator checks submodules out at each version's tag
  and restores them; a `+` prefix means a run was interrupted.
- Read the rendered badge for each version you changed, and the parent's summary table row. The table
  renders `Yes` / `No` / `Ignored` with a `*` when a note is attached, and it is generated separately
  from the leaf page — confirm both.
