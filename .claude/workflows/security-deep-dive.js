export const meta = {
  name: 'security-deep-dive',
  description: 'Research + write 10 Security deep-dive Learn pages (+CLI snippets +3 NatsFlow scenarios), review, verify continuity',
  phases: [
    { title: 'Research', detail: '10 fact-domains: nats-server/nsc/jwt/nkeys via nats-mcp + synadia-org example sweep' },
    { title: 'NatsFlow', detail: 'author 3 animated scenarios, wire the 5 files, typecheck' },
    { title: 'Write+Review+Fix', detail: 'per page: write .md + CLI .sh, adversarial review, apply fixes' },
    { title: 'Continuity', detail: 'whole-chapter lockfile + scenario-state + link-allowlist critic, then targeted fixes' },
  ],
}

// ---------------------------------------------------------------------------
// Shared paths
// ---------------------------------------------------------------------------
const ROOT = '.' // repo root — run from the repository checkout
const SEC_DIR = ROOT + '/learn/security'
const CLI_DIR = ROOT + '/static/examples/snippets/cli/learn/security'
const SPEC = ROOT + '/specs/2026-06-03-security-deep-dive-design.md'
const NF_DIR = ROOT + '/src/components/NatsFlow'
const EXEMPLARS = [
  ROOT + '/learn/jetstream/why-a-stream.md',
  ROOT + '/learn/jetstream/your-first-stream.md',
  ROOT + '/learn/jetstream/acknowledgment.md',
]

// ---------------------------------------------------------------------------
// The authoring contract every page-writer must obey (spec §4-6 distilled)
// ---------------------------------------------------------------------------
const CONTRACT = [
  'You are writing one page of the NATS "Security" Learn chapter (Rust-book style, an Operate-half sibling of the JetStream deep dive).',
  '',
  'BEFORE writing, Read these for voice + facts (do not skip):',
  '  - Design spec (authoritative): ' + SPEC,
  '  - Three gold-standard already-written JetStream pages (match their VOICE exactly; content differs): ' + EXEMPLARS.join(', '),
  '  - Project rules: ' + ROOT + '/CLAUDE.md',
  '',
  'RUNNING SCENARIO (pinned, identical across every page and language) — secure the JetStream ORDERS world:',
  '  Accounts (tenants): ORDERS (the order service) and ANALYTICS (read-only).',
  '  Users: order-svc (in ORDERS, publishes orders.>) and analytics-reader (in ANALYTICS, subscribes to imported orders.shipped).',
  '  Cross-account: ORDERS EXPORTS stream orders.shipped; ANALYTICS IMPORTS it.',
  '  Operator (decentralized rebuild): operator ACME signs accounts ORDERS/ANALYTICS which sign their users.',
  '  Auth callout: external service auth-svc (own account) maps a token to a user in ORDERS.',
  '  Canonical message JSON (same as JetStream): {"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}',
  '  Never invent a different payload, account, or user name. Carry server/config + CLI state forward; state each transition explicitly.',
  '',
  'WORDING LOCKFILE (same word for same thing; NEVER the banned terms):',
  '  account (NOT "namespace"/"org"/"realm"); user = the auth identity (NOT "principal"/"login"); client = the connecting app (do not conflate with user);',
  '  operator = root of trust (reserve "issuer" for the JWT field); nkey (lowercase, NOT "key pair"/"NKEY"/"Nkey");',
  '  JWT (after first "JSON Web Token (JWT)"; do not call a JWT a "token" — "token" is the password-style credential);',
  '  credentials / creds file / .creds (NOT "cert"/"key file" for creds); permissions (NOT "ACL"/"rules"/"policy");',
  '  TLS (NOT "SSL"); "mutual TLS (mTLS)" then mTLS (NOT "client TLS"/"two-way TLS");',
  '  "centralized authentication"/"config-based" (NOT "static"/"basic auth"); "decentralized authentication" (NOT "JWT auth" loosely);',
  '  export/import for cross-account sharing (NOT "share"/"link"); "auth callout" two lowercase words (NOT "callback"/"AuthCallout");',
  '  subject (NOT "topic"/"channel"); publish/subscribe (NOT "send"/"listen").',
  '',
  'VOICE RULES (hard):',
  '  - ONE teaching thought per paragraph. If two ideas are joined by "and", split them.',
  '  - Define-then-use: never use a term before its own paragraph in this or a prior page.',
  '  - <=2 NEW concepts per page. A third goes to a later page or is linked out.',
  '  - Active voice, present tense. NO filler ("it is important to note", "basically", "essentially", "simply").',
  '  - Length 150-400 source lines. Hard cap 400. index and where-next may be 80+.',
  '',
  'FRONTMATTER (exact shape, match exemplars):',
  '  id: <slug>',
  '  title: "<NUM>. <Title>"   (content pages, e.g. "5. Authorization"); the index page uses title: "Security Deep Dive".',
  '  sidebar_position: <POS>',
  '  description: <one line>',
  '  H1 in body equals the title.',
  '',
  'EXAMPLE PATTERN (security is CONFIG-HEAVY — read carefully, this differs from JetStream):',
  '  - Server config files, nsc command sequences, nats-server startup, and "nats <x> info" / "nsc describe" output are CLI/CONFIG-ONLY:',
  '      use a PLAIN fenced block. Use the `conf` language tag for nats.conf config, `bash` for shell. These get NO nats-example div.',
  '  - Use a nats-example div ONLY for a snippet that genuinely has a client-library form (connecting/publishing/subscribing as a user, across accounts, with creds, or over TLS):',
  '      <div class="nats-example" data-type="learn-security-<slug>-<snippet>" data-languages="cli,js,go,python,java,rust,csharp"></div>',
  '  - For EACH nats-example div, ALSO author the CLI source file so CLI renders today:',
  '      ' + CLI_DIR + '/<slug>/<snippet>.sh   (starts with #!/bin/bash, real nats/nsc/nats-server commands, committable).',
  '      Path dirs join with dashes to form the data-type: cli/learn/security/<slug>/<snippet>.sh => learn-security-<slug>-<snippet>. Verify it matches your div.',
  '  - Any additional CLI-only .sh files requested below also start with #!/bin/bash and use real commands.',
  '  - If you ever hand-write a Tabs block: import Tabs/TabItem at top, groupId="lang", CLI TabItem FIRST with default, order CLI,JS,Go,Python,Java,Rust,C#. Prefer the div.',
  '',
  'VALID INTERNAL LINKS (allow-list — the reference docs have NO security section; NEVER invent /reference/security, /reference/auth, or /reference/tls paths, they 404 and fail the build):',
  '  /concepts/security, /concepts/jetstream, /concepts/subjects, /concepts/pub-sub-basics, /concepts/request-reply, /concepts/queue-groups, /concepts/topologies, /concepts/what-is-nats;',
  '  sibling /learn/security/<slug> pages; /learn/clustering, /learn/deployment/hardening, /learn/topologies/leaf-nodes, /learn/jetstream/surviving-node-loss; /reference/ (root only).',
  '  When the natural handoff is an exhaustive option table, point to /reference/ root or the upstream /concepts page — not a fabricated path.',
  '',
  'REFERENCE HANDOFF (greppable): "The full set of <X> options is documented in [Reference](/reference/). We use only <Y> here."',
  'End every page with a "## See also" section: 1-3 links from the allow-list, HARD max 3.',
  '',
  'NAVIGATION: include a short "## Where you are" (recap state) near the end and a "## What is next" pointer to the next page, like the exemplars.',
  '',
  'ACCURACY: every config field, CLI/nsc flag, default value, key prefix, and JWT claim MUST be verified against the research fact pack you are given (and if unsure, against nats-server/nsc/natscli/jwt source via nats-mcp tools). Do not invent fields or flags. Honor any "version-bound" or "not implemented" note exactly.',
].join('\n')

// ---------------------------------------------------------------------------
// Phase 1 — research fact domains
// ---------------------------------------------------------------------------
const RESEARCH_SCHEMA = {
  type: 'object', additionalProperties: true,
  required: ['key', 'summary', 'cliCommands', 'configFields', 'gotchas', 'referencePaths'],
  properties: {
    key: { type: 'string' },
    summary: { type: 'string' },
    cliCommands: { type: 'array', items: { type: 'object', additionalProperties: true, properties: { command: { type: 'string' }, explanation: { type: 'string' } } } },
    configFields: { type: 'array', items: { type: 'object', additionalProperties: true, properties: { name: { type: 'string' }, type: { type: 'string' }, default: { type: 'string' }, meaning: { type: 'string' }, versionNote: { type: 'string' } } } },
    clientNotes: { type: 'array', items: { type: 'object', additionalProperties: true, properties: { lang: { type: 'string' }, note: { type: 'string' } } } },
    gotchas: { type: 'array', items: { type: 'string' } },
    referencePaths: { type: 'array', items: { type: 'string' }, description: 'real links usable as See-also (allow-list only) or external example URLs' },
    exampleLinks: { type: 'array', items: { type: 'object', additionalProperties: true, properties: { url: { type: 'string' }, shows: { type: 'string' } } }, description: 'hidden/runnable examples found in nats-io/synadia orgs + nats-by-example' },
    snippetIdeas: { type: 'array', items: { type: 'object', additionalProperties: true, properties: { id: { type: 'string' }, description: { type: 'string' } } } },
  },
}

const MCP_HINT = 'Load and use the nats-mcp tools first: ToolSearch("select:mcp__nats-mcp__get_adr,mcp__nats-mcp__find_equivalent,mcp__nats-mcp__show_type,mcp__nats-mcp__search_code,mcp__nats-mcp__read_file,mcp__nats-mcp__get_schema,mcp__nats-mcp__get_repos_path"). Cross-check nats-server for EXACT config field names/defaults, natscli + nsc for exact CLI/nsc flag spellings, the jwt + nkeys repos for claim/key details. Cite ADRs by number where relevant. ALSO use WebSearch/WebFetch to sweep the nats-io, synadia-io, synadia-labs, and ConnectEverything GitHub orgs plus natsbyexample.com for hidden, runnable security examples — return their URLs and what each demonstrates.'

const DOMAINS = [
  { key: 'S_ACCOUNTS', focus: 'Accounts & multitenancy. The accounts {} config block, per-account user lists, the $G default account, the $SYS system account + system_account directive, no_auth_user, how subjects are isolated per account. Exact nats-server config field names + a minimal two-account nats.conf.' },
  { key: 'S_CENTRALIZED', focus: 'Centralized (config-based) authentication. The authorization {} block; credential types: user/password, token, nkey via authorized_keys/nkey field; bcrypt password hashing (mkpasswd); account-scoped users. Exact nats.conf shapes + the natscli/nats context flags to connect with each (--user/--password, --token, --nkey/--creds).' },
  { key: 'S_NKEYS_JWT', focus: 'nkeys + JWTs (the concept layer). nkeys are Ed25519 keypairs; key prefixes O=operator, A=account, U=user, X=xkey; seeds (S...). JWT = signed claims; what an operator/account/user JWT contains (iss, sub, nats{} block). The trust chain: operator signs account, account signs user, server trusts only the operator public key (no user list). Scoped signing keys. READ ADR-14. Keep it conceptual + accurate; nsc commands belong to S_NSC.' },
  { key: 'S_NSC', focus: 'The nsc tool (hands-on operator mode). Exact commands: nsc add operator, nsc add account, nsc add user, nsc edit, nsc generate creds, nsc describe, nsc push/pull, nsc env. The .creds file format/location. Account resolvers: memory/URL/full nats-resolver — the server config to use a nats-based resolver and nsc push to it. Verify exact command/flag spellings against the nsc repo + Synadia nsc docs.' },
  { key: 'S_AUTHZ', focus: 'Authorization / permissions. permissions { publish { allow/deny } subscribe { allow/deny } } with subject wildcards; the rule that an allow-list closes off everything else and deny beats allow; allow_responses for services; defaults when omitted. How the SAME permission model applies in config-mode users and in JWT users. Exact field names + a worked ORDERS example.' },
  { key: 'S_CROSSACCT', focus: 'Cross-account exports/imports. accounts { X { exports: [...] imports: [...] } }; STREAM export (pub/sub, one-way subject sharing) vs SERVICE export (request/reply); public vs private exports + activation tokens; subject remapping/transform on import. Exact config fields + a worked example: ORDERS exports orders.shipped, ANALYTICS imports it.' },
  { key: 'S_TLS', focus: 'TLS / encryption in transit. The tls {} block and that it applies per connection type independently: client (top-level tls), cluster {tls}, leafnodes {tls}, gateway {tls}, websocket {tls}. Fields: ca_file, cert_file, key_file, verify, verify_and_map, timeout, cipher_suites, curve_preferences, pinned_certs, insecure. mutual TLS (mTLS) + cert->user mapping via verify_and_map (RFC2253 DN as the user). natscli TLS flags (--tlsca/--tlscert/--tlskey). Exact field names + a minimal TLS + an mTLS-map config.' },
  { key: 'S_REST', focus: 'Encryption at rest for JetStream. How to enable it (server/account config key + nats-server --encryption or config), supported ciphers AES vs ChaCha20-Poly1305, what it protects (on-disk message data) and what it does NOT (in-transit). Keep brief — one paragraph + one config line.' },
  { key: 'S_CALLOUT', focus: 'Auth callout. READ ADR-26 in full. authorization { auth_callout { issuer, auth_users, account, xkey } }; the $SYS.REQ.USER.AUTH subject; the signed authorization-request JWT (client_info/client_opts/user_nkey/server_id) and the signed AuthorizationResponse user JWT; running the auth service in its own isolated account; binding a client to an account; operator-mode callout differences; optional xkey encryption. Note any server-version requirements. Find runnable auth-callout service examples in synadia/nats-io orgs + nats-by-example.' },
  { key: 'S_RESOURCES', focus: 'Hidden-examples sweep ONLY. Use WebSearch/WebFetch across nats-io, synadia-io, synadia-labs, ConnectEverything GitHub orgs and natsbyexample.com. Find runnable/canonical examples and authoritative writeups for: decentralized auth / nsc setup, auth callout services (Go/JS), cross-account exports, TLS/mTLS configs, JetStream encryption-at-rest. Return a curated list of URLs with a one-line note on what each shows and which page it helps (map to slugs). Do not invent URLs — only return links you actually retrieved.' },
]

// ---------------------------------------------------------------------------
// Phase 2 — three NEW animated NatsFlow scenarios
// ---------------------------------------------------------------------------
const NF_CONTRACT = [
  'You are authoring ONE new animated NatsFlow scenario (a React/TSX component) for the NATS docs site.',
  '',
  'BEFORE writing, Read these to learn the exact API (do not skip):',
  '  - ' + NF_DIR + '/scenarios/jetStreamContrastAnimated.tsx   (primary model: toggle state + setTimeout sequencing + ReactFlowProvider)',
  '  - ' + NF_DIR + '/scenarios/jetStreamConsumersAnimated.tsx  (second model: server + multiple nodes + animated edges)',
  '  - ' + NF_DIR + '/types.ts                                  (NatsFlowScenario, AnimatedEdgeData, NatsNodeData)',
  '  - ' + NF_DIR + '/nodes/index.ts and the node components     (available node `type` values: publisher, subscriber, service, server)',
  '  - ' + NF_DIR + '/edges/                                     (the AnimatedEdge; edge data: color, animated, label, delay, interval)',
  '',
  'HARD REQUIREMENTS:',
  '  - Use ONLY node types publisher | subscriber | service | server. Use type:"animated" edges with markerEnd ArrowClosed.',
  '  - Self-contained, no new deps. Use React state + setTimeout to sequence the steps (like jetStreamContrastAnimated). Wrap the inner component in <ReactFlowProvider>.',
  '  - Export EXACTLY: export function <ComponentName>(props: { width?: number; height?: number }) { ... }',
  '  - Match the visual frame of the exemplars (bordered box, optional caption/status text below, optional small step buttons). Default width 600, height 380.',
  '  - Keep the labels consistent with the Security chapter scenario (accounts ORDERS/ANALYTICS, user order-svc, operator ACME, auth-svc) where relevant.',
  '  - Write ONLY your own new file. Do NOT edit index.ts, client-module.tsx, global.d.ts, or the loader — a separate wiring step does that.',
].join('\n')

const SCENARIOS = [
  { comp: 'CentralizedAuthAnimated', data: 'centralizedAuthAnimated', file: 'centralizedAuthAnimated.tsx',
    shows: 'A client connects with credentials to the NATS server. The server checks them against its in-config user list and either ADMITS or REJECTS. Let the viewer toggle valid vs invalid credentials (e.g. a Valid/Invalid button), and show the accept (green) vs reject (red) outcome on the client->server edge and a status caption. Nodes: a client (publisher), the NATS server (server) holding a small "user list" caption.' },
  { comp: 'DecentralizedAuthAnimated', data: 'decentralizedAuthAnimated', file: 'decentralizedAuthAnimated.tsx',
    shows: 'The trust chain. Show three stacked nodes: operator ACME (service) -> account ORDERS (service) -> user order-svc (publisher), with "signs" labels on the downward edges. Then a client presents the user JWT to the NATS server (server); animate the server VERIFYING the signature chain walking UP to the single operator public key it trusts, then admitting the client. Emphasize there is NO user list on the server. A short step caption per stage.' },
  { comp: 'AuthCalloutAnimated', data: 'authCalloutAnimated', file: 'authCalloutAnimated.tsx',
    shows: 'The auth callout message flow (a genuine request/reply). Steps, animated in sequence on animated edges: (1) client connects to the NATS server; (2) server publishes a SIGNED auth request to $SYS.REQ.USER.AUTH; (3) auth-svc (service, in its own account) receives it; (4) auth-svc returns a SIGNED user JWT; (5) server admits the client. Label the edges with the subject / "signed request" / "signed user JWT". Nodes: client (publisher), NATS server (server), auth-svc (service).' },
]

// ---------------------------------------------------------------------------
// Phase 3 — the 10 pages
// ---------------------------------------------------------------------------
const PAGES = [
  { slug: 'index', num: 0, pos: 1, title: 'Security Deep Dive', isIndex: true,
    teaches: 'What this chapter is and who it is for. Frame security as three pillars — authentication (who you are), authorization (what you may do), encryption (is the wire safe) — all scoped per account. Give the chapter map and what the reader will have built by the end (the secured ORDERS/ANALYTICS setup).',
    stateIn: 'Nothing built yet.', stateOut: 'Reader has the mental map and the page list.',
    needs: ['S_ACCOUNTS'], snippets: [], cli: [], defers: '', visual: '',
    links: 'Point forward to the content pages and to /concepts/security. Mirror the JetStream index.md shape.' },

  { slug: 'accounts-and-multitenancy', num: 1, pos: 2, title: 'Accounts & Multitenancy',
    teaches: 'TWO concepts: (1) an account is an isolated tenant with its own subject space — two accounts never see each other\'s traffic; (2) the $G default account and the $SYS system account. Build the ORDERS and ANALYTICS accounts in a minimal nats.conf and show isolation.',
    stateIn: 'No accounts configured (single default).', stateOut: 'ORDERS and ANALYTICS accounts exist in nats.conf; their subjects are isolated.',
    needs: ['S_ACCOUNTS'],
    snippets: [{ id: 'isolation', desc: 'publish as order-svc in ORDERS and subscribe as analytics-reader in ANALYTICS — show the message does NOT cross accounts' }],
    cli: [{ file: 'isolation.sh', desc: 'nats-server -c nats.conf (two accounts) + nats pub/sub with --user across both accounts showing isolation' }],
    defers: 'account limits + system events -> /learn/monitoring; system-account detail -> /reference/ root', visual: '' },

  { slug: 'authentication-basics', num: 2, pos: 3, title: 'Authentication Basics',
    teaches: 'TWO concepts: (1) centralized (config-based) authentication — the server checks credentials against its own config user list; (2) the credential types: user/password (with a bcrypt note), token, and nkey. Log in as order-svc. This is the centralized half; decentralized is the next page.',
    stateIn: 'ORDERS/ANALYTICS accounts exist.', stateOut: 'order-svc authenticates against the config user list with a password.',
    needs: ['S_CENTRALIZED', 'S_ACCOUNTS'],
    snippets: [{ id: 'connect', desc: 'connect and publish to orders.created as order-svc using user/password' }],
    cli: [{ file: 'connect.sh', desc: 'nats pub --user order-svc --password ... orders.created with the canonical payload' }, { file: 'config-userpass.sh', desc: 'start nats-server with an authorization users block (show the conf inline in the page; this .sh starts the server)' }],
    defers: 'TLS-cert authentication -> the encryption page; decentralized auth -> next page; full flag table -> /reference/ root',
    visual: '<div class="nats-flow" data-scenario="centralizedAuthAnimated" data-width="600" data-height="380"></div>' },

  { slug: 'decentralized-auth', num: 3, pos: 4, title: 'Decentralized Authentication',
    teaches: 'TWO concepts: (1) the trust chain operator -> account -> user; (2) nkeys (Ed25519, prefixes O/A/U) sign JWTs, so the server trusts only the operator public key and keeps NO user list. Concept only — the nsc tool walkthrough is the next page. MUST cite ADR-14.',
    stateIn: 'Centralized auth understood.', stateOut: 'Reader understands the trust chain and what a user JWT proves; no commands run yet.',
    needs: ['S_NKEYS_JWT', 'S_RESOURCES'],
    snippets: [], cli: [],
    defers: 'nsc commands -> next page; every JWT claim + scoped signing keys -> /reference/ root',
    visual: '<div class="nats-flow" data-scenario="decentralizedAuthAnimated" data-width="600" data-height="380"></div>',
    mustCite: 'ADR-14' },

  { slug: 'operator-mode', num: 4, pos: 5, title: 'Operator Mode',
    teaches: 'TWO concepts: (1) the nsc workflow — create operator ACME, accounts ORDERS/ANALYTICS, user order-svc, and generate a .creds file; (2) the account resolver that tells the server where to fetch account JWTs (use a nats-based resolver + nsc push). Connect with the creds file. This realizes the trust chain from the previous page.',
    stateIn: 'Trust chain understood conceptually.', stateOut: 'An operator-mode ACME setup mirrors the config-mode accounts; order-svc connects with a .creds file.',
    needs: ['S_NSC', 'S_NKEYS_JWT', 'S_RESOURCES'],
    snippets: [{ id: 'connect-creds', desc: 'connect and publish to orders.created as order-svc using the generated .creds file' }],
    cli: [{ file: 'nsc-setup.sh', desc: 'nsc add operator ACME; add account ORDERS and ANALYTICS; add user order-svc; nsc generate creds (exact nsc flags)' }, { file: 'resolver-start.sh', desc: 'nats-server with a nats-resolver config block + nsc push of the accounts' }, { file: 'connect-creds.sh', desc: 'nats pub --creds order-svc.creds orders.created with the canonical payload' }],
    defers: 'resolver types (mem/url/full) + scoped signing keys + JWT push/pull detail -> /reference/ root and /concepts/security', visual: '' },

  { slug: 'authorization', num: 5, pos: 6, title: 'Authorization',
    teaches: 'TWO concepts: (1) subject permissions — publish/subscribe allow and deny lists with wildcards; (2) an allow-list closes off everything else, and deny beats allow. Restrict order-svc to orders.>. Note the same model works for config users and JWT users.',
    stateIn: 'order-svc can authenticate.', stateOut: 'order-svc is restricted to publishing orders.> (and a denied attempt is shown).',
    needs: ['S_AUTHZ'],
    snippets: [{ id: 'denied', desc: 'order-svc publishes to orders.created (allowed) then to billing.charge (denied) — show the permissions violation' }],
    cli: [{ file: 'permissions.sh', desc: 'server config with order-svc permissions (show conf inline) + nats pub allowed vs denied as order-svc' }],
    defers: 'response permissions (allow_responses) + import/export permissions -> /reference/ root; subjects recap -> /concepts/subjects', visual: '' },

  { slug: 'cross-account', num: 6, pos: 7, title: 'Cross-Account',
    teaches: 'TWO concepts: (1) exports and imports deliberately share a subject across the account boundary; (2) a stream export (pub/sub) vs a service export (request/reply). ORDERS exports the stream orders.shipped; ANALYTICS imports it so analytics-reader can subscribe.',
    stateIn: 'ORDERS and ANALYTICS are isolated.', stateOut: 'ANALYTICS imports orders.shipped from ORDERS; analytics-reader receives it.',
    needs: ['S_CROSSACCT'],
    snippets: [{ id: 'consume-imported', desc: 'analytics-reader subscribes to the imported orders.shipped while ORDERS publishes it' }],
    cli: [{ file: 'export-import.sh', desc: 'server config exports/imports (show conf inline) + nats pub orders.shipped in ORDERS + nats sub as analytics-reader in ANALYTICS' }],
    defers: 'activation tokens + private exports + subject transforms -> /reference/ root', visual: '' },

  { slug: 'encryption', num: 7, pos: 8, title: 'Encryption & TLS',
    teaches: 'TWO concepts: (1) TLS secures each connection type independently (client, cluster, leafnode, gateway); (2) mutual TLS (mTLS) plus cert->user mapping (verify_and_map) lets a client certificate BE the user identity. One line on encryption at rest. Keep cipher/curve tables out (link them).',
    stateIn: 'Auth + authz configured over a plaintext link.', stateOut: 'The client<->server link is TLS; an mTLS cert maps to the order-svc identity.',
    needs: ['S_TLS', 'S_REST'],
    snippets: [{ id: 'connect-tls', desc: 'connect and publish as order-svc over TLS (client trusts the CA)' }],
    cli: [{ file: 'tls.sh', desc: 'server tls config (show conf inline) + nats pub --tlsca ... over TLS' }, { file: 'mtls-map.sh', desc: 'verify_and_map config (show conf inline) + connect presenting a client cert whose DN maps to order-svc' }],
    defers: 'cipher suites + curve preferences + cert pinning -> /reference/ root; at-rest detail -> /learn/jetstream/surviving-node-loss; per-link TLS in topologies -> /learn/clustering and /learn/topologies/leaf-nodes', visual: '' },

  { slug: 'auth-callout', num: 8, pos: 9, title: 'Auth Callout',
    teaches: 'TWO concepts: (1) auth callout delegates the authentication decision to an external NATS service via the $SYS.REQ.USER.AUTH subject; (2) the signed request / signed user-JWT response, and why the auth service runs in its own isolated account. Use the auth_callout config and explain when to reach for it (OIDC/LDAP/custom). MUST cite ADR-26.',
    stateIn: 'Config + decentralized auth understood.', stateOut: 'Reader can configure auth callout and understands the signing protocol; auth-svc maps a token to a user in ORDERS.',
    needs: ['S_CALLOUT', 'S_RESOURCES'],
    snippets: [],
    cli: [{ file: 'callout-config.sh', desc: 'server authorization auth_callout config (show conf inline) + start; a client connecting with a token that triggers the callout' }],
    defers: 'xkey encryption + operator-mode callout binding + the full request claim -> /reference/ root and ADR-26; the auth-service implementation -> the example links in See also',
    visual: '<div class="nats-flow" data-scenario="authCalloutAnimated" data-width="600" data-height="380"></div>',
    mustCite: 'ADR-26' },

  { slug: 'where-next', num: 9, pos: 10, title: 'Where to go next',
    teaches: 'A short navigation page. Recap the mental model: account (tenant) + user (identity) + permissions (authz) + TLS (wire) = the whole game. Point to sibling Learn chapters and Reference. May be shorter than 150 lines (80+ is fine).',
    stateIn: 'Whole chapter complete.', stateOut: 'None.',
    needs: [], snippets: [], cli: [], defers: '', visual: '',
    links: 'Point to: /learn/clustering, /learn/deployment/hardening, /learn/topologies/leaf-nodes, /learn/jetstream/surviving-node-loss, /concepts/security, and the Reference root /reference/.' },
]

// ---------------------------------------------------------------------------
// Schemas for write / review / critic
// ---------------------------------------------------------------------------
const WRITE_SCHEMA = {
  type: 'object', additionalProperties: true,
  required: ['slug', 'path', 'snippetIds', 'cliFiles', 'conceptsIntroduced', 'approxLines'],
  properties: {
    slug: { type: 'string' }, path: { type: 'string' },
    snippetIds: { type: 'array', items: { type: 'string' } },
    cliFiles: { type: 'array', items: { type: 'string' } },
    conceptsIntroduced: { type: 'array', items: { type: 'string' } },
    approxLines: { type: 'number' },
    notes: { type: 'string' },
  },
}
const REVIEW_SCHEMA = {
  type: 'object', additionalProperties: true,
  required: ['slug', 'pass', 'lockfileViolations', 'issues', 'factErrors', 'badLinks'],
  properties: {
    slug: { type: 'string' }, pass: { type: 'boolean' },
    lockfileViolations: { type: 'array', items: { type: 'string' } },
    factErrors: { type: 'array', items: { type: 'string' } },
    badLinks: { type: 'array', items: { type: 'string' }, description: 'links outside the allow-list / fabricated /reference paths' },
    issues: { type: 'array', items: { type: 'object', additionalProperties: true, properties: { severity: { type: 'string' }, location: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' } } } },
  },
}
const CRITIC_SCHEMA = {
  type: 'object', additionalProperties: true,
  required: ['continuityIssues', 'lockfileHits', 'linkIssues', 'verdict'],
  properties: {
    continuityIssues: { type: 'array', items: { type: 'object', additionalProperties: true, properties: { pages: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' } } } },
    lockfileHits: { type: 'array', items: { type: 'object', additionalProperties: true, properties: { file: { type: 'string' }, term: { type: 'string' }, line: { type: 'string' } } } },
    linkIssues: { type: 'array', items: { type: 'string' } },
    verdict: { type: 'string' },
  },
}
const NF_SCHEMA = {
  type: 'object', additionalProperties: true,
  required: ['component', 'path', 'ok'],
  properties: { component: { type: 'string' }, path: { type: 'string' }, ok: { type: 'boolean' }, notes: { type: 'string' } },
}
const TYPECHECK_SCHEMA = {
  type: 'object', additionalProperties: true,
  required: ['passed'],
  properties: { passed: { type: 'boolean' }, errors: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' } },
}

// ===========================================================================
// RUN
// ===========================================================================
phase('Research')
const researchResults = await parallel(DOMAINS.map((d) => () =>
  agent(
    'Research NATS security facts for the domain "' + d.key + '". Focus: ' + d.focus + '\n\n' + MCP_HINT +
    '\n\nTreat legacy nats.docs prose as a hint only; code/ADRs/official tool docs are the source of truth. ' +
    'Return a precise, citeable fact sheet: exact config field names with types/defaults, exact CLI/nsc commands, client-library notes, gotchas/footguns, See-also link candidates (allow-list internal paths only, plus external example URLs), real example links you actually retrieved, and snippet ideas. Be exhaustive and correct — downstream writers trust this verbatim.',
    { label: 'research:' + d.key, phase: 'Research', schema: RESEARCH_SCHEMA, agentType: 'Explore' }
  ).then((r) => (r ? { ...r, key: d.key } : null))
))
const pack = {}
for (const r of researchResults.filter(Boolean)) pack[r.key] = r
log('Research done: ' + Object.keys(pack).length + '/' + DOMAINS.length + ' fact sheets assembled')

// ---------------------------------------------------------------------------
phase('NatsFlow')
// Stage A — author the 3 components in parallel (each writes only its own new file)
const nfAuthored = await parallel(SCENARIOS.map((s) => () =>
  agent(
    NF_CONTRACT + '\n\n=== YOUR SCENARIO ===\n' +
    'Component name (export this exactly): ' + s.comp + '\n' +
    'File to write: ' + NF_DIR + '/scenarios/' + s.file + '\n' +
    'What it must show: ' + s.shows + '\n\n' +
    'Write the .tsx file now with the Write tool. Return the structured result (ok=true only if the file compiles in your head against the exemplar API).',
    { label: 'nf:' + s.comp, phase: 'NatsFlow', schema: NF_SCHEMA }
  )
))
log('NatsFlow components authored: ' + nfAuthored.filter(Boolean).filter((r) => r.ok).length + '/' + SCENARIOS.length)

// Stage B — ONE serial agent wires all three into the 4 shared files (avoids parallel edit conflicts)
const wireList = SCENARIOS.map((s) => '  - component ' + s.comp + ' (file ./scenarios/' + s.file.replace('.tsx', '') + ', data-scenario "' + s.data + '")').join('\n')
await agent(
  'Wire three NEW animated NatsFlow scenarios into the loader so they render from markdown. The component .tsx files already exist in ' + NF_DIR + '/scenarios/.\n\n' +
  'Scenarios to register:\n' + wireList + '\n\n' +
  'Edit these FOUR files, following the EXACT pattern already used for jetStreamContrastAnimated / jetStreamConsumersAnimated (Read each file first, then add the new entries alongside the existing ones):\n' +
  '1. ' + NF_DIR + '/scenarios/index.ts — add an `export { <Comp> } from \'./<file>\';` line for each.\n' +
  '2. ' + ROOT + '/src/plugins/nats-flow/client-module.tsx — in the `window.NatsFlow = { ... }` object add `<Comp>: module.<Comp>,` for each (next to JetStreamConsumersAnimated).\n' +
  '3. ' + ROOT + '/src/types/global.d.ts — add an import type alias for each (e.g. `<Comp> as <Comp>Component`) and a `<Comp>: typeof <Comp>Component;` line in the Window NatsFlow interface.\n' +
  '4. ' + ROOT + '/static/js/nats-flow-loader.js — (a) add each <Comp> to the destructuring `const { ... } = components;`, and (b) add a `if (scenarioName === \'<data>\') { ... render <Comp> ... }` special-case branch mirroring the jetStreamConsumersAnimated branch exactly.\n\n' +
  'Be surgical: only ADD lines, do not remove or reorder existing entries. After editing, briefly confirm the four files and the exact identifiers you added.',
  { label: 'nf:wire', phase: 'NatsFlow' }
)

// Stage C — typecheck gate (fix loop up to 2 attempts)
let tc = await agent(
  'Run `cd ' + ROOT + ' && npm run typecheck` and report the result. If it FAILS, read the errors, fix ONLY issues in the three new NatsFlow scenario files (' + SCENARIOS.map((s) => s.file).join(', ') + ') or the four wiring files, and re-run until it passes or you have tried twice. Return passed + any remaining errors.',
  { label: 'nf:typecheck', phase: 'NatsFlow', schema: TYPECHECK_SCHEMA }
)
if (tc && !tc.passed) {
  log('Typecheck still failing after first pass; one more targeted attempt')
  tc = await agent(
    'npm run typecheck is still failing in ' + ROOT + '. Errors: ' + JSON.stringify(tc.errors || []) + '\nFix the NatsFlow scenario/wiring files only, then re-run `npm run typecheck` and report. Do not touch unrelated files.',
    { label: 'nf:typecheck-2', phase: 'NatsFlow', schema: TYPECHECK_SCHEMA }
  )
}
log('NatsFlow typecheck: ' + (tc && tc.passed ? 'PASS' : 'still has errors — flagged in final report'))

// ---------------------------------------------------------------------------
phase('Write+Review+Fix')
const PAGE_TABLE = PAGES.map((p) => p.num + '. ' + p.title + ' (/learn/security/' + p.slug + ')').join('\n')

const results = await pipeline(
  PAGES,
  // STAGE 1 — write the page + its CLI snippet files
  (page) => {
    const relevant = page.needs.map((k) => pack[k]).filter(Boolean)
    const prompt = [
      CONTRACT,
      '',
      '=== FULL CHAPTER PAGE LIST (for correct cross-links / "what is next") ===',
      PAGE_TABLE,
      '',
      '=== THIS PAGE ===',
      'slug: ' + page.slug,
      'file to write: ' + SEC_DIR + '/' + page.slug + '.md',
      page.isIndex ? 'title: "Security Deep Dive" (index page — mirror learn/jetstream/index.md shape; list the content pages and what the reader builds)' : 'title: "' + page.num + '. ' + page.title + '"',
      'sidebar_position: ' + page.pos,
      'TEACHES: ' + page.teaches,
      'SCENARIO STATE entering this page: ' + page.stateIn,
      'SCENARIO STATE leaving this page: ' + page.stateOut,
      'DEFERS / LINKS OUT: ' + (page.defers || '(nothing major)'),
      page.mustCite ? 'MUST cite ' + page.mustCite + ' by number in prose.' : '',
      page.links ? 'LINKS: ' + page.links : '',
      page.visual ? 'VISUAL: embed this NatsFlow div where it best fits (it is already wired):\n' + page.visual : '',
      '',
      'nats-example divs to emit (ONLY genuine client-library snippets; one div + one CLI .sh each):',
      page.snippets.length ? page.snippets.map((s) => '  - data-type="learn-security-' + page.slug + '-' + s.id + '"  (' + s.desc + ')  => CLI file ' + CLI_DIR + '/' + page.slug + '/' + s.id + '.sh').join('\n') : '  (none — this page is conceptual / config-only)',
      page.cli.length ? '\nCLI .sh files to author (for div CLI rendering AND config-only demos; remember: server config goes in INLINE `conf` blocks in the .md, the .sh runs/demonstrates it):\n' + page.cli.map((c) => '  - ' + CLI_DIR + '/' + page.slug + '/' + c.file + '  (' + c.desc + ')').join('\n') : '',
      '',
      '=== VERIFIED FACT PACK (authoritative — do not contradict) ===',
      JSON.stringify(relevant, null, 1),
      '',
      'NOW: (1) Read the spec + 3 JetStream exemplars + CLAUDE.md. (2) Write the .md with the Write tool (inline `conf`/`bash` blocks for config; nats-example divs only for true client snippets). (3) Write each CLI .sh (start with #!/bin/bash, real commands). Use ONLY verified facts. Stay inside the link allow-list. Return the structured result.',
    ].filter(Boolean).join('\n')
    return agent(prompt, { label: 'write:' + page.slug, phase: 'Write+Review+Fix', schema: WRITE_SCHEMA })
  },
  // STAGE 2 — adversarial review
  (writeRes, page) => {
    if (!writeRes) return null
    const relevant = page.needs.map((k) => pack[k]).filter(Boolean)
    const prompt = [
      'Adversarially review the Learn page just written at ' + SEC_DIR + '/' + page.slug + '.md (Read it).',
      'Also Read one exemplar for the target voice: ' + EXEMPLARS[0],
      '',
      'Check HARD and report every failure:',
      '1. WORDING LOCKFILE — flag any banned term: namespace/org/realm for account; principal/login for user; "issuer" misused for operator; "key pair"/NKEY/Nkey for nkey; a JWT called "token"; cert/key-file for creds; ACL/rules/policy for permissions; SSL for TLS; "client TLS"/"two-way TLS" for mTLS; topic/channel for subject; send/listen for publish/subscribe; "auth callback"/AuthCallout.',
      '2. <=2 NEW concepts. List them; if >2, flag it.',
      '3. "## See also" exists with 1-3 links.',
      '4. LINK ALLOW-LIST — flag ANY internal link not in: /concepts/{security,jetstream,subjects,pub-sub-basics,request-reply,queue-groups,topologies,what-is-nats}, /learn/security/<sibling>, /learn/clustering, /learn/deployment/hardening, /learn/topologies/leaf-nodes, /learn/jetstream/surviving-node-loss, /reference/ (root). Any /reference/security|auth|tls/... path is a fabricated link = badLink.',
      '5. Frontmatter: id/title/sidebar_position(' + page.pos + ')/description present and correct' + (page.isIndex ? ' (title "Security Deep Dive").' : ' (title "' + page.num + '. ' + page.title + '").'),
      '6. EXAMPLES: server config is in INLINE `conf` blocks (NOT a div, NOT Tabs). Each nats-example div has data-type="learn-security-' + page.slug + '-<snippet>" AND a matching CLI .sh under ' + CLI_DIR + '/' + page.slug + '/. Any hand Tabs has CLI first + default + groupId="lang".',
      '7. LENGTH 150-400 lines (index/where-next may be 80+).',
      '8. SCENARIO STATE matches — entering: "' + page.stateIn + '"; leaving: "' + page.stateOut + '". Account/user names + payload match the pinned scenario (ORDERS, ANALYTICS, order-svc, analytics-reader, operator ACME, auth-svc, acme-co payload).',
      '9. FACTUAL ACCURACY vs the fact pack below — wrong config fields, wrong nsc/CLI flags, invented claims/key-prefixes, or wrong defaults = factError.',
      page.mustCite ? '10. Must cite ' + page.mustCite + ' — flag if missing.' : '',
      '',
      '=== FACT PACK ===',
      JSON.stringify(relevant, null, 1),
      '',
      'Return the structured verdict. pass=true ONLY if zero high-severity issues, zero lockfile violations, zero factErrors, zero badLinks.',
    ].filter(Boolean).join('\n')
    return agent(prompt, { label: 'review:' + page.slug, phase: 'Write+Review+Fix', schema: REVIEW_SCHEMA, agentType: 'Explore' })
      .then((rev) => ({ rev, writeRes }))
  },
  // STAGE 3 — apply fixes
  (stage2, page) => {
    if (!stage2) return { slug: page.slug, status: 'write-failed' }
    const { rev, writeRes } = stage2
    const clean = rev && rev.pass &&
      (rev.issues || []).filter((i) => i.severity === 'high').length === 0 &&
      (rev.lockfileViolations || []).length === 0 &&
      (rev.factErrors || []).length === 0 &&
      (rev.badLinks || []).length === 0
    if (clean) return { slug: page.slug, status: 'clean', path: writeRes.path, approxLines: writeRes.approxLines }
    const prompt = [
      'Apply these review fixes to ' + SEC_DIR + '/' + page.slug + '.md (and its CLI files if a CLI issue is listed). Read the file, Edit it, keep the voice and the verified facts. Introduce no new lockfile violations and no links outside the allow-list.',
      '',
      'Lockfile violations: ' + JSON.stringify(rev.lockfileViolations || []),
      'Fact errors: ' + JSON.stringify(rev.factErrors || []),
      'Bad links: ' + JSON.stringify(rev.badLinks || []),
      'Issues: ' + JSON.stringify(rev.issues || []),
      '',
      'After editing, briefly confirm what you changed.',
    ].join('\n')
    return agent(prompt, { label: 'fix:' + page.slug, phase: 'Write+Review+Fix' })
      .then((summary) => ({ slug: page.slug, status: 'fixed', path: writeRes.path, approxLines: writeRes.approxLines, fixSummary: summary }))
  }
)

// ---------------------------------------------------------------------------
phase('Continuity')
const written = results.filter(Boolean)
const critic = await agent(
  'You are the whole-chapter continuity critic for the Security Learn deep dive in ' + SEC_DIR + '.\n' +
  'Pages: ' + PAGES.map((p) => p.slug).join(', ') + '.\n\n' +
  'Do these checks across the WHOLE chapter (use Grep/Read across ' + SEC_DIR + '):\n' +
  '1. WORDING LOCKFILE — grep every page for banned terms (namespace/org/realm, principal/login, "key pair"/NKEY, a JWT called token, cert-for-creds, ACL/rules/policy, SSL, "client TLS"/"two-way TLS", topic/channel, send/listen, AuthCallout/"auth callback"). Report file + term + line.\n' +
  '2. SCENARIO CONTINUITY — accounts ORDERS/ANALYTICS, users order-svc/analytics-reader, operator ACME, auth-svc, and the acme-co payload must be consistent page to page; the carried config/CLI state must not contradict (e.g. a page using an export a later page only creates; centralized vs operator-mode state).\n' +
  '3. INTERNAL LINKS — every (/learn/...) and (/concepts/...) and (/reference/...) target is in the allow-list (NO fabricated /reference/security|auth|tls paths), and each "## What is next" points to the correct next slug in page order (index->accounts->authentication-basics->decentralized-auth->operator-mode->authorization->cross-account->encryption->auth-callout->where-next).\n' +
  'Return the structured punch list. Be specific (file + line + fix).',
  { label: 'critic:chapter', phase: 'Continuity', schema: CRITIC_SCHEMA, agentType: 'Explore' }
)

const affected = new Set()
for (const h of (critic.lockfileHits || [])) if (h.file) affected.add(h.file)
for (const c of (critic.continuityIssues || [])) { const m = (c.fix || c.problem || c.pages || '').match(/[\w-]+\.md/g); if (m) m.forEach((f) => affected.add(f)) }
const affectedList = [...affected]

let continuityFixes = []
if (affectedList.length) {
  log('Continuity critic flagged ' + affectedList.length + ' file(s); dispatching targeted fixes')
  continuityFixes = await parallel(affectedList.map((f) => () =>
    agent(
      'Fix continuity/lockfile/link problems in ' + SEC_DIR + '/' + (f.includes('/') ? f.split('/').pop() : f) + '. Read it, apply only the relevant items below, preserve voice + verified facts, introduce no new lockfile violations and no links outside the allow-list.\n\n' +
      'Lockfile hits: ' + JSON.stringify((critic.lockfileHits || []).filter((h) => (h.file || '').includes(f.replace('.md', '')))) + '\n' +
      'Continuity issues mentioning it: ' + JSON.stringify((critic.continuityIssues || []).filter((c) => (JSON.stringify(c)).includes(f.replace('.md', '')))) + '\n' +
      'Link issues: ' + JSON.stringify(critic.linkIssues || []),
      { label: 'fix:' + f, phase: 'Continuity' }
    )
  ))
}

return {
  pagesWritten: written.map((w) => ({ slug: w.slug, status: w.status, lines: w.approxLines })),
  researchDomains: Object.keys(pack),
  natsflow: { authored: nfAuthored.filter(Boolean).map((r) => r.component), typecheckPassed: !!(tc && tc.passed), typecheckErrors: (tc && tc.errors) || [] },
  criticVerdict: critic.verdict,
  lockfileHits: critic.lockfileHits || [],
  continuityIssues: critic.continuityIssues || [],
  linkIssues: critic.linkIssues || [],
  continuityFilesFixed: affectedList,
}
