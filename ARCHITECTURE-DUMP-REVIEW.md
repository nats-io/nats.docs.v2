# Adversarial review of the Architecture knowledge dump

Generated 2026-09-07. Ten area reviewers read every claim in the topic index of `ARCHITECTURE-KNOWLEDGE-DUMP.md` looking for contradictions, wrong, stale, unverifiable, and dubious claims. A finding is **RESOLVED** only when verified against nats-server/jsm.go/nats.go source (commit 8e54a5954 for the server) or an explicit maintainer statement with URL. Docs, blogs, and talks never count as verification. Everything else is **REQUIRES RESOLUTION** with a note on what would settle it.

## Stats

| Area | Findings | Resolved | Requires resolution |
| --- | --- | --- | --- |
| SIZE | 40 | 33 | 7 |
| STRM | 26 | 24 | 2 |
| CONS | 41 | 35 | 6 |
| TOPO | 30 | 28 | 2 |
| SEC | 41 | 36 | 5 |
| KVOBJ | 27 | 25 | 2 |
| CLNT | 33 | 30 | 3 |
| OPS | 39 | 32 | 7 |
| SUBJCORE | 24 | 20 | 4 |
| MIGMYTH | 41 | 36 | 5 |
| **total** | **342** | **299** | **43** |

| Type | Count |
| --- | --- |
| contradiction | 108 |
| unverifiable | 62 |
| wrong | 61 |
| stale | 51 |
| dubious | 40 |
| (verified) | 17 |
| maintainers-disagree | 1 |
| (verified, | 1 |
| (reviewed) | 1 |

| Verdict × severity | high | medium | low |
| --- | --- | --- | --- |
| RESOLVED | 29 | 104 | 166 |
| REQUIRES RESOLUTION | 5 | 10 | 28 |

## Requires resolution (43), by severity

Each row links to the full finding in Part 2 by ID.

| ID | Sev | Type | Title | What would settle it |
| --- | --- | --- | --- | --- |
| F-KVOBJ-9 | high | unverifiable | KV latency figures (1-5 ms vs ~40 µs vs "tens of µs") | The third-party "1-5 ms" figure contradicts the maintainer's loopback measurement by two orders of magnitude and should not be used; but none of the numbers are guarantees. Docs must either quote the maintainer benchmark |
| F-MIGMYTH-1 | high | maintainers-disagree | KV as a cache — maintainers disagree in the same thread | by definition. Both positions are on record. A Misconceptions page can safely state only the measured facts (same order of magnitude as Redis over a real network; memory storage + direct get required; no Redis data types |
| F-OPS-9 | high | contradiction | Minimum RAM and CPU for a JetStream server | The maintainers' floor rose from 4 CPU / 8 GiB (2022) to 4 cores / 16 GB (2025) and a maintainer called the website memory tables wrong. The legacy 32–256 MiB tables must not be reproduced. Settling it needs a current ma |
| F-SIZE-7 | high | contradiction | Sizing minimums — 4c/8Gi vs 4c/16GB vs 2c/8GiB vs "not below 3GB" | every figure is a maintainer opinion at a different date; the newest general statement is wallyqs 2025-01 (4 cores / 16 GB / SSD). Publish one baseline and mark the rest as older; ripienaar explicitly calls the current w |
| F-TOPO-6 | high | unverifiable | Stretch-cluster latency bound (100-150 ms) vs deployed 285-350 ms | The dump carries 150 ms as a hard limit from one maintainer comment and a 350 ms production deployment from a partner. Needs a maintainer statement on what degrades above ~150 ms (and whether the Akamai layout ran replic |
| F-CONS-24 | medium | stale | Ordered consumer configuration (ADR-17 push era vs current pull-based) | Client-side fact; nats.go source supports the Learn page and marks ADR-17 as the legacy push design, but under the strict rule a maintainer statement or an ADR update is needed to call ADR-17 superseded. Ask piotrpio/Jar |
| F-CONS-25 | medium | unverifiable | Which clients implement the pinned-client loop | Client repos support the claim as of 2026-08 but this is a moving target; confirm with Jarema (Rust) and the Python maintainer before publishing a support matrix, or phrase as "at time of writing". |
| F-KVOBJ-22 | medium | unverifiable | Third-party benchmark claims in "Building Distributed State Stores" | Treat all numbers from this source as unusable; only a Synadia/maintainer benchmark or a reproducible run could replace them. |
| F-MIGMYTH-6 | medium | unverifiable | Priority-group update rules in ADR-42 are not enforced in server code | Either the server silently accepts a priority update without changing runtime behaviour (worst case for users), or clients reject it. A live test (update `priority_policy` on a running pull consumer, then inspect `nats c |
| F-OPS-10 | medium | contradiction | GOMEMLIMIT percentage and name | The only maintainer number is ~75%; the docs (90%), blog (80–90%) and Learn example (~92%) all exceed it with no stated basis. Settle by adopting 75% unless a maintainer confirms a higher figure. Separately RESOLVED: the |
| F-OPS-15 | medium | unverifiable | Snapshot consistency: "configuration frozen, no retention eviction during backup" | Read `fileStore.Snapshot`/`streamSnapshot` (filestore.go ≈12150-12420) and `stream.snapshot` in stream.go:9180-9230 to confirm whether `ageChk`/limits are paused (or a consistent block list is captured up front) during t |
| F-OPS-31 | medium | unverifiable | Sizing, throughput and timing figures with no code or maintainer backing | Drop or attribute-and-hedge every figure above. The only way to settle them is a maintainer statement or a reproducible benchmark; none exists in the corpus. |
| F-OPS-32 | medium | unverifiable | Support / downgrade policy ("current release plus one patch prior") | The "one patch prior" rule has no maintainer backing and conflicts with the minor-version downgrade guidance (2.9.22+, 2.11.9+) that maintainers do give. Needs a current maintainer statement on supported downgrade target |
| F-SIZE-16 | medium | unverifiable | Consumer-count guidance — 20K per stream, 100k+, "few thousand" design point | the maintainer statements (≤20K per stream; ≤10k filtered R1 consumers fine; >100k needs Synadia design help) are consistent with each other; the blog's "100,000" threshold is unsourced and should either be attributed or |
| F-STRM-16 | medium | unverifiable | Unverified performance and sizing numbers | Ask a maintainer (or run `nats bench js` on a 2.14 R3 cluster) for the `sync_interval: always` figure; treat the hardware table as an old doc estimate; the 2.9.22 format-compatibility claim needs the 2.9.22 release notes |
| F-CLNT-30 | low | unverifiable | TLS-first availability and legacy "minimum client versions" for the proxy case | 2.10.4 and nats.go v1.31.0 are confirmed as TLS-first versions. Why the proxy/`allow_non_tls` recipe needs those client versions is unbacked; a maintainer statement (kozlovic authored both commits) or a reproduction agai |
| F-CLNT-31 | low | dubious | Java latency benchmark "55–86 ns median per message" | Treat as client-internal instrumentation, not end-to-end latency; needs the benchmark harness or an author (scottf) statement to be quotable. |
| F-CLNT-32 | low | unverifiable | Client-library counts ("40+", "45+", "46+ clients") and "reconnect in 10–15 ms" | Do not quote a number; "10–15 ms" contradicts current default reconnect waits except for the immediate first attempt. |
| F-CONS-27 | low | unverifiable | Ephemeral queue push consumers "not supported as of 2.8.4" | The server does not reject an ephemeral push consumer with a deliver group; whether clients refuse it is a client rule. Since push consumers are legacy, recommend dropping the claim rather than resolving it. |
| F-CONS-29 | low | unverifiable | `$JS.ACK` domain awareness | Both true at different layers; whether the routing gap was fixed after 2024-11 is unknown. Check discussion 6136 for a follow-up or ask derekcollison before documenting cross-domain acks. |
| F-CONS-39 | low | unverifiable | Required API level for the prioritized policy | `_nats.req.level` under-reports for prioritized consumers; confirm with the server team whether that is intended before documenting required levels per policy. |
| F-CONS-40 | low | unverifiable | MQTT `consumer_replicas: 1` under an R5 stream vs "replicas must match on Interest/WorkQueue" | Inspect server/mqtt.go retention settings for `$MQTT_msgs`/`$MQTT_sess` and the consumer creation path; until then do not generalize the MQTT statement to user consumers. |
| F-MIGMYTH-14 | low | unverifiable | Ephemeral queue push consumers "not supported as of 2.8.4" | Likely a client-library limitation of the legacy `QueueSubscribe` path, not a server rule; current server code has no such check. Confirm with a live create of an ephemeral push consumer with `deliver_group` before citin |
| F-MIGMYTH-16 | low | dubious | DZone / AutoMQ comparison numbers and anecdotes | Drop these numbers/anecdotes; if a comparison page needs client counts, take them from nats.io/download at publish time. |
| F-MIGMYTH-17 | low | stale | "Kafka queue functionality remains in the proposal stage" | Do not print "proposal stage"; check current Kafka release notes before publishing any comparison sentence about queues. |
| F-OPS-13 | low | unverifiable | Restore under a different stream name | The rename rejection is most likely enforced by natscli (the snapshot's `backup.json` carries the name), not the server. Grep natscli `cli/stream_command.go` for the string to confirm before attributing it to the server. |
| F-OPS-33 | low | unverifiable | Jepsen-cited "stream unexpectedly deleted after process kills" (2.10.20–2.10.22, fixed 2.10.23) | Consistent with the 2.10.23 notes but the affected-version range (from 2.10.20) is not confirmed; check PR #6061 for the regression's origin before quoting the range. |
| F-SEC-7 | low | unverifiable | Whether `nats-server -t` catches a `no_auth_user` naming a missing user | Trace `main.go` `-t`/`configCheck` handling to see if `validateOptions` runs; or run `nats-server -t` with a bogus `no_auth_user` and observe. |
| F-SEC-28 | low | dubious | Revocation disconnects immediately on push; "global within 10 ms" and "11th connection denied anywhere" are eventual, unquantified | Revocation on push is confirmed. The "10 ms globally" and "denied anywhere in the world" claims are eventual-consistency behaviours with no stated bound; a maintainer statement or a measurement of `$SYS.ACCOUNT.*.CONNS`  |
| F-SEC-37 | low | unverifiable | Client-library credential-rotation behaviours and "callout libraries recommend dropping" are outside the server source | Verify per client repo (`UserCredentials` implementations in nats.go `nats.go`, nats.java `Nats.credentials`, nats.py `nkeys`/`user_credentials`, nats.js `credsAuthenticator`, nats.rs `ConnectOptions::with_credentials_fi |
| F-SEC-38 | low | stale | "Known issue: across accounts, push consumers are not supported" (JetStream on leaf nodes) has no current backing | Test: export `$JS.<domain>.API.>` + a `deliver.>` stream from account A, import into B, create a push consumer from B with a `deliver_subject` under the imported stream subject; or find the issue this note referenced (se |
| F-SEC-39 | low | dubious | Exporting `$SYS.ACCOUNT.*.CONNECT/DISCONNECT` from the system account to another account | Confirm with a two-account config (stream export of `$SYS.ACCOUNT.*.CONNECT` from `$SYS`, import into an app account) that events arrive; it is mechanically plausible but the "no-ack stream avoids duplicate processing" r |
| F-SIZE-20 | low | dubious | Priority groups — "one per consumer" vs "multiple accepted, first wins" | the ADR's "error on multiple groups" is not implemented; a maintainer statement (MauriceVanVeen/Jarema) or a delivery-path trace is needed to confirm "first wins" before publishing it. |
| F-SIZE-32 | low | unverifiable | Learn "JetStream spends roughly two FDs per stream" / `LimitNOFILE=800000` | needs a maintainer statement or a measurement note; present as "raise NOFILE on large clusters" without the "two per stream" figure. |
| F-SIZE-36 | low | unverifiable | Throughput/benchmark figures (14.8M msgs/s, 10M/s, 48 Gbit/s, 70 Gbit NICs, 100B msgs/day, etc.) | publish none as a spec; at most cite the nats bench docs example with its hardware and version, and the loopback caveat. |
| F-SIZE-37 | low | unverifiable | Restart/recovery timings (2.1 TB stream 15 min → 1.1 s; meta-election 5–10 s; LDM 60 s demo waits) | for the 15-min→1.1-s figure (talk only); the 5–10 s meta-election stall is consistent with code timers. |
| F-SIZE-39 | low | dubious | `max_consumers` account limit wording "per stream(!)" | dump-cited only; STRM/CONS reviewer should confirm the semantics before the wording is kept. |
| F-STRM-24 | low | unverifiable | Republish destination constraints | The overlap rule is enforced (RESOLVED); the "at least 1 non-wildcard token" rule needs either a check inside `NewSubjectTransform` (server/subject_transform.go) or a maintainer statement before a page presents it as a s |
| F-SUBJCORE-20 | low | stale | `_INBOX.*` "sees every request" (2017 talk) | Almost certainly stale (a `*` matches only one token; modern clients emit at least two tokens after `_INBOX`). Settle by citing the inbox format in nats.go `newInbox`/`NewRespInbox` or an ADR on inboxes; use `_INBOX.>` i |
| F-SUBJCORE-21 | low | unverifiable | Subscription memory sizing ("more than 1 GB per million subscriptions") | Present as a rough order of magnitude only, or drop. A measurement (`nats-server` RSS with 1M subs via `nats bench --subs`) or a maintainer statement would settle it. |
| F-SUBJCORE-22 | low | unverifiable | Whitespace in a subject "silently misroutes" | Plausible (the extra token becomes the reply-to or triggers a parse error depending on arity), but "silently misroutes" needs one concrete trace: send `PUB orders created 0\r\n\r\n` over telnet and record whether the ser |
| F-SUBJCORE-23 | low | unverifiable | `$SRV`, `NATS-RPLY-22`, `"q"` default queue, service framework behaviours | Out of scope for server verification; the CLNT reviewer should confirm against natscli `cli/reply_command.go` and ADR-32 / nats.go `micro`. |
| F-TOPO-29 | low | unverifiable | Extension of a hub JetStream via leaf requires the hub to be clustered (known issue) | The hub-side clustering requirement and the "more than one JS leaf needs hub JS + domain" note have no code or maintainer backing in the dump; a maintainer confirmation or a reproduction on 2.12+ would settle whether the |

## Resolved, high severity (29)

Corrections a page author must apply.

| ID | Type | Title | Correct statement |
| --- | --- | --- | --- |
| F-SIZE-1 | contradiction | MaxAckPending default — 1,000 vs 20,000 vs 65,536 vs 100 | default is 1,000 since v2.8.0 (April 2022); 20,000 applied from v2.2.x to v2.7.x. The 65,536 and 100 figures are wrong on every version. |
| F-SIZE-4 | wrong | max_file_store default — "1 TB" vs 75% of available disk | on Linux/macOS/*BSD/Solaris the default is 75% of the store directory's available space; 1 TiB is only the Windows/NetBSD/wasm/fallback value. The legacy "1TB default" is wrong for the platforms almost everyone runs. |
| F-STRM-1 | contradiction | Which stream config fields are immutable after creation | Immutable: name, storage, retention to/from WorkQueue, unseal, turning DenyDelete/DenyPurge back off, mirror block (removal only), turning AllowMsgTTL/AllowMsgSchedules off, any AllowMsgCounter change, persist_mode. Retention Limits<->Interest is editable and  |
| F-STRM-2 | contradiction | Mirror configuration editability | Since v2.12.0 the only allowed change to a mirror block is deleting it (promotion). Re-pointing, adding a filter, or changing transforms is rejected with 10055 on every version. "Mirror became editable in 2.12.0" overstates it. |
| F-STRM-9 | contradiction | Does editing `compression` take effect on a running stream | The update is accepted and persisted in the stream config, but the live file store keeps the algorithm it was opened with until the store is re-created (server restart or the stream being re-created on a peer). Existing blocks are never rewritten. The webinar  |
| F-STRM-10 | contradiction | Writes to a mirror | A mirror captures no subjects. A publish on the origin's subjects is stored by the origin because the origin owns them, not because the mirror forwards anything; publishing "to" the mirror by name fails with 10060. |
| F-CONS-1 | contradiction | MaxAckPending default (1,000 vs 20,000 vs 65,536 vs 100 vs 500) | Server default is 1,000 since v2.8.0; it was 20,000 before v2.8.0 (2021 CLI output and ADR-13 examples are pre-2.8). 65,536 was a legacy nats.go push-subscribe client default, never a server default. "100" is wrong (likely the speaker's account/server limit, w |
| F-CONS-2 | contradiction | AckPolicy default: none vs explicit | On the wire the server default is `none`. `explicit` is the default the CLI and modern clients send. Pages must say "the CLI/clients default to explicit; a raw API request that omits ack_policy gets none". |
| F-CONS-3 | stale | Pull consumers "must be explicit ack" | Pull consumers accept none/all/explicit. Only WorkQueue streams force explicit (or flow_control), and that applies to push consumers too. The Model Deep Dive and the talk are stale. |
| F-CONS-5 | contradiction | Does BackOff apply to NAK? | BackOff shapes AckWait-expiry redeliveries only. A plain NAK redelivers immediately; a delayed NAK uses its own delay. The jsm.go schema description is wrong. |
| F-CONS-7 | contradiction | What happens to a message that hits MaxDeliver on WorkQueue/Interest streams | Intended and (since v2.11.0) actual behaviour: the message stays in the stream; the consumer's ack floor moves past it, the advisory fires, and the consumer keeps a redelivered marker that preserves interest. Before v2.11.0, on Interest (and by the same code p |
| F-TOPO-1 | contradiction | The JetStream-disabled "arbiter" does not count toward meta-group quorum | A server with `jetstream.enabled: false` is excluded from the meta group's cluster size; the example's meta group is 6 peers with quorum 4, so losing either 3-node cluster loses meta quorum exactly as without the arbiter. The example's own `server report jetst |
| F-TOPO-3 | contradiction | `unique_tag` is read from the meta leader's config, so per-cluster differing values are unsafe | The legacy docs are right. Placement enforces the meta leader's `unique_tag`, not the target cluster's. In the NbE layout, whenever the meta leader sits in `xr` (prefix `rg:`), an R3 regional stream on `rg2` (`rg2-az1..3`, all `rg:2`) fails with "server tag no |
| F-SEC-1 | wrong | `allow_responses: true` has a 2-minute expiry, not "no time limit" | `allow_responses: true` permits 1 reply per request and the permission expires 2 minutes after the request was received. A responder that takes longer than 2 minutes gets a publish permission violation. Use `allow_responses: { max: 1, expires: "-1s" }` (negati |
| F-SEC-14 | wrong | Bearer tokens are ALLOWED by default at the account level in the JWT model; `nats auth` sets disallow by default | The server/jwt default permits bearer users; only the user needs `bearer_token: true`. The "accounts disallow by default" statement is a `nats auth` CLI default (and not verified for `nsc add account`, which uses the library default unless it sets the flag). D |
| F-SEC-19 | contradiction | Account-level `max_consumers` is a per-stream cap, not an account-wide total | The account JetStream limit `max_consumers` bounds the number of consumers on EACH stream in the account (and clamps each stream's `max_consumers`); it is not a tenant-wide total. `max_streams` is account-wide. Capacity planning that treats `max_consumers` as  |
| F-SEC-23 | wrong | The auth-callout xkey is a per-server key, not "one-time per connection"; replay protection is the per-request user NKey | The xkey (x25519) pair is generated once per server process and provides confidentiality only. Replay resistance comes from the fresh user NKey generated per authorization request (which must be the response subject) plus the server-ID audience. The request-si |
| F-SEC-27 | wrong | Enabling encryption at rest re-encrypts existing plaintext blocks in place; key rotation exists; a wrong master key skips the stream (block-level key failure deletes the block) | Since v2.9.0 existing plaintext blocks are converted on recovery (lazily, per block as it is loaded); "only new blocks / backup-restore" is stale. Key rotation with `prev_key` exists since v2.10.0; ADR-12's "no key rolling" is stale. The visible wrong-key erro |
| F-KVOBJ-1 | contradiction | KV read consistency — "immediately consistent" / "strong consistency" vs ADR-8 "no read-after-write" | KV `Get` is served by any replica or opted-in mirror that happens to receive the queue-group request; there is no read-after-write and no monotonic-read guarantee across successive gets. The legacy "immediately consistent" and "monotonic reads" sentences, the  |
| F-KVOBJ-12 | contradiction | KV mirror buckets — ADR-57 vs ADR-58 vs "transparent read replica" talk; same-domain mirror bucket cannot serve Get | Transparent read replicas = bind to the origin bucket, add mirror streams (any name) with `mirror_direct`; "closest" is queue-group routing (see F-KVOBJ-13). A same-domain bucket created with `KeyValueConfig.Mirror` (ADR-57 model) is write-through but cannot ` |
| F-CLNT-1 | contradiction | Default subscription pending limits (65536 msgs vs 500,000 msgs) | The legacy 65536 / 64 MiB figure is stale for every current client. Go: 500,000 msgs / 64 MiB. Python: 524,288 msgs / 128 MiB. Java: 524,288 msgs / 64 MiB. Rust: 65,536 msgs, no byte cap. .NET: 16,384 msgs (channel), no byte cap. JS: unbounded, never drops. |
| F-CLNT-8 | contradiction | JetStream publish with no stream: "fails immediately with no responders" vs Go retry | Only nats.go (both APIs) retries no-responders by default (2 retries, 250 ms apart, ~500 ms before `no response from stream`). Rust, Python, Java, JS fail immediately (JS opt-in via `retries`). "Fails immediately" is wrong for Go; "let the client retry" across |
| F-OPS-1 | contradiction | sync_interval default, `always`, and what a PubAck guarantees | All sources agree: default background sync every 2 minutes (with jitter, never later than 2m), `sync: always` fsyncs each write before the ack, and a stream created with async persist mode ignores `sync: always`. A PubAck on a replicated stream proves quorum c |
| F-OPS-4 | contradiction | Lame duck mode mechanics (grace, minimum, spread, what happens to JetStream and SIGTERM) | Learn's sequence is correct, with two corrections to the rest of the material: (1) client eviction is spread over `duration − grace` (1m50s by default), not over the full duration; (2) JetStream on the node is already shut down before the first client is evict |
| F-OPS-7 | stale | `/healthz?js-server-only` semantics and the readiness-probe advice | In 2.10.x, `js-server-only` still failed while the node was "not current with the meta leader"; from 2.11.0 it returns before every JetStream check and is the least strict JetStream probe. Learn's description is correct for 2.11+; wallyqs's advice is correct f |
| F-OPS-25 | stale | ADR-61 `META.RESCUE` vs "no in-product recovery exists on 2.12+" | Both are correct for their versions: from 2.12.0 an empty-log server cannot vote itself into leadership, so the 2.10/2.11 "scale to 4 and peer-remove" trick no longer works and released servers up to 2.14.5 have no rescue API. `META.RESCUE` is unreleased (2.15 |
| F-SUBJCORE-2 | contradiction | `max_payload` "maximum 64 MB" vs "warn above 8 MB" | `max_payload` defaults to 1 MiB and has no fixed maximum. The "64 MB" figure is the default `max_pending` (64 MiB): `max_payload` may not exceed `max_pending`, so raising `max_pending` raises the ceiling. Above 8 MiB the server warns but accepts. Guidance (8 M |
| F-SUBJCORE-3 | contradiction | Weighted mapping under 100% — "drops the remainder" vs "remainder stays on the original subject" | Both docs are right for the case they describe, but the talk is wrong as a general rule. Weights summing under 100 do NOT lose messages: the server silently adds the source subject at the missing weight. Loss occurs only when the source subject is itself liste |
| F-SUBJCORE-4 | contradiction | Queue-group distribution — "random per message on one server", "same chance in a cluster", "local first", "lowest RTT" | Within one cluster, for a message published by a client, every member across all servers has an equal chance (remote servers are weighted by member count), so the legacy "same chance" statement holds; "local first" applies only to messages that arrived over a  |

---

# Part 2: Findings by area



<!-- ===== SIZE ===== -->

# Review: SIZE

Reviewer scope: every SIZE-tagged claim (defaults, hard limits, recommended counts, latency/throughput figures, sizing rules) in `review/in/SIZE.md` (1917 lines, 817 claims).

Verification sources used (all local checkouts):
- nats-server `8e54a5954` (VERSION `2.15.0-dev`, server/const.go:69) — primary.
- nats.go `2e0e3d9` (2026-09-07), jsm.go `49d3148` (2026-08-18) — allowed by the confidence rule.
- Client repos OUTSIDE the strict allowlist, cited only where a claim is about that client, and tagged `[client source, outside allowlist]` so the lead can downgrade: natscli `3726a32`, nats.rs `7b0fa6af`, nats.js `1b6b0069`, nats.py `c7896c1`, nats.java `8cb8a91b`, nats.net `24159b4`.
- Maintainer statements: `dump/threads/*.txt` (comment/reply markers verified by hand for every quote used).

Line numbers below are from the checkouts above. Where the input dump cited a line, I re-grepped it; the dump's line numbers were accurate except for the atomic-batch identifiers (dump wrote `MaxAtomicBatchInflightPerStream`; real names are `streamDefaultMaxAtomicBatch…`, values identical).

## Defaults and limits table

| Quantity | Claimed value(s) (source class) | Code value | file:line | Verdict |
|---|---|---|---|---|
| Client port | 4222 (all) | `DEFAULT_PORT = 4222` | server/const.go:78 | RESOLVED |
| Default bind host | 0.0.0.0 (legacy docs) | `DEFAULT_HOST = "0.0.0.0"` | server/const.go:86 | RESOLVED |
| Monitoring port | 8222 (all) | `DEFAULT_HTTP_PORT = 8222` | server/const.go:135 | RESOLVED |
| Leafnode port | 7422 (legacy docs, Learn) | `DEFAULT_LEAFNODE_PORT = 7422` | server/const.go:206 | RESOLVED |
| Route/gateway ports 6222/7222 | Learn Hardening | not constants; conventions in docs/Helm only | — | unverifiable (config-defined, no code default) |
| max_control_line | 4 KB / 4096 (legacy docs, Learn) | `MAX_CONTROL_LINE_SIZE = 4096` | server/const.go:90 | RESOLVED |
| max_payload default | 1 MB / 1 MiB / 1048576 (all) | `MAX_PAYLOAD_SIZE = 1024*1024` | server/const.go:94; applied opts.go:6123-6124 | RESOLVED |
| max_payload "max 64 MB" | 64 MB hard max (legacy docs, FAQ, blog) | no cap; field is `int32`; warning only above 8 MiB | server/opts.go:456 (`MaxPayload int32`); server/server.go:2349-2351 warn; `MAX_PAYLOAD_MAX_SIZE = 8*1024*1024` const.go:99 | RESOLVED — see F-SIZE-5 |
| max_payload <= max_pending | must be <= max_pending (legacy docs, Learn) | startup error `max_payload (%v) cannot be higher than max_pending (%v)` | server/server.go:1163-1166 | RESOLVED |
| max_pending | 64 MB (legacy docs, Learn, wallyqs) | `MAX_PENDING_SIZE = 64*1024*1024` | server/const.go:102 | RESOLVED |
| max_connections | 64K / 65,536 (legacy docs, Learn) | `DEFAULT_MAX_CONNECTIONS = 64*1024` | server/const.go:105 | RESOLVED |
| max_subscriptions | 0 = unlimited (legacy docs, Learn) | option defaults to 0 (no const) | server/opts.go (MaxSubs zero value) | RESOLVED (zero value) |
| ping_interval / ping_max | 2m / 2 (legacy docs, Learn, ADR-40) | `DEFAULT_PING_INTERVAL = 2m`, `DEFAULT_PING_MAX_OUT = 2` | server/const.go:120,123 | RESOLVED |
| Route ping cap | 30s (code dump) | `defaultRouteMaxPingInterval = 30s` | server/route.go:140 | RESOLVED |
| Gateway ping cap | 15s (code dump) | `gwMaxPingInterval = 15s` | server/gateway.go:58 | RESOLVED |
| write_deadline | 2s (legacy /varz sample, slow-consumer page) vs 10s (config ref, Learn, NBE) | `DEFAULT_FLUSH_DEADLINE = 10s` | server/const.go:132 | RESOLVED 10s — F-SIZE-2 |
| tls timeout | 2s (config ref, Learn, NBE) vs 0.5 (legacy /varz sample) | `TLS_TIMEOUT = 2s` | server/const.go:108 | RESOLVED 2s — F-SIZE-3 |
| auth timeout | "1s more than tls_timeout; else 1s" (legacy docs) / 2s (Learn) / `AUTH_TIMEOUT = 2s` (code dump) | no TLS: 2s; with TLS: tls_timeout + 1s | server/const.go:117; server/opts.go:6192-6200 | RESOLVED — F-SIZE-3 |
| handshake_first auto fallback | 50 ms (ADR-40, Learn) | `DEFAULT_TLS_HANDSHAKE_FIRST_FALLBACK_DELAY = 50ms` | server/const.go:114 | RESOLVED |
| lame_duck_duration / grace | 2m, min 30s / 10s (legacy docs, Learn) | `DEFAULT_LAME_DUCK_DURATION = 2m`, `..._GRACE_PERIOD = 10s`; parser rejects `< 30s` | server/const.go:196,200; server/opts.go:1467-1468 | RESOLVED |
| Closed-connection history | 10,000 (legacy docs) | `DEFAULT_MAX_CLOSED_CLIENTS = 10000` | server/const.go:192 | RESOLVED |
| /connz, /subsz page size | 1024 (legacy docs) | `DefaultConnListSize = 1024` | server/monitor.go:170 | RESOLVED |
| Route connect/backoff | 1s, backoff to 30s (legacy docs) | `DEFAULT_ROUTE_CONNECT = 1s`, `DEFAULT_ROUTE_CONNECT_MAX = 30s` | server/const.go:147,150 | RESOLVED |
| Route pool_size | 3 (legacy docs, Learn) | `DEFAULT_ROUTE_POOL_SIZE = 3` (added 105237cba, v2.10.0) | server/const.go:159 | RESOLVED |
| s2_auto RTT thresholds | 10/50/100 ms (legacy docs) | `defaultCompressionS2AutoRTTThresholds = {10ms,50ms,100ms}` | server/server.go:464-472 | RESOLVED |
| Gateway connect delays | 1s → 30s, reconnect 1s (code dump) | gateway.go consts | server/gateway.go:36-41 | RESOLVED |
| Gateway optimistic→interest-only switch | 1000 runsubs (code dump) | `defaultGatewayMaxRUnsubBeforeSwitch = 1000` | server/gateway.go:41 | RESOLVED |
| Leaf first_info_timeout | 1s (legacy docs) | `DEFAULT_LEAFNODE_INFO_WAIT = 1s` | server/const.go:203; opts.go:6109-6110 | RESOLVED |
| Leaf reconnect delays (loop/perm/same-cluster) | 30s (code dump) | leafnode.go consts | server/leafnode.go:49,53,56 | RESOLVED |
| RTT measurement interval | 1h (code dump) | `DEFAULT_RTT_MEASUREMENT_INTERVAL = time.Hour` | server/const.go:224 | RESOLVED |
| allow_responses defaults | 1 msg / 2m (code dump) | const.go:228,232 | server/const.go:228-232 | RESOLVED |
| Account fetch timeout | 1900 ms (code dump) | `DEFAULT_ACCOUNT_FETCH_TIMEOUT = 1900ms` | server/const.go:250 | RESOLVED |
| Full resolver `limit`/`interval` | "limit 1000, interval 2m" (legacy docs, NBE) | those are config EXAMPLES; code defaults: limit 0 → unlimited (`math.MaxInt64`), syncInterval 0 → 1 minute | server/accounts.go:4611-4618 | RESOLVED — F-SIZE-21 |
| Cache resolver `limit` | 1000 (legacy docs) | `limit <= 0 → 1_000` | server/accounts.go:4702-4704 | RESOLVED |
| Permission template expansion cap | 4096 (code dump) | `maxPermTemplateSubjectExpansions = 4096` | server/auth.go:475 | RESOLVED |
| Slow-consumer stall gate | 75% of max_pending; 2/5/10 ms (code dump) | `stallClientMinDuration=2ms`, `Max=5ms`, `stallTotalAllowed=10ms` | server/client.go:125-127 | RESOLVED |
| Client read buffer | 512 B → 64 KiB, min 64 B; readLoop report 2s | client.go:111-116 | server/client.go:111-116 | RESOLVED |
| Perm/result caches | 512/256/128, replyPermLimit 4096 | client.go:472-478 | server/client.go:472-478 | RESOLVED |
| Sublist cache / plist | 1024 / 256 / 256 (code dump) | `slCacheMax=1024`, `slCacheSweep=256`, `plistMin=256` | server/sublist.go:51-55 | RESOLVED |
| Subject token stack array | 32 (blog) | `tsa := [32]string{}` | server/sublist.go:576,662,1343,1441,1449 | RESOLVED |
| Subject tokens/length guidance | 16 tokens / 256 chars (legacy docs, blog, Learn) | no code limit; maintainer: MauriceVanVeen | https://github.com/nats-io/nats-server/discussions/5097 (2024-02-16) | RESOLVED as recommendation — F-SIZE-25 |
| JetStream store_dir default | /tmp/nats/jetstream (legacy docs) | `os.TempDir()/nats/jetstream` + warning | server/jetstream.go:2734-2736 | RESOLVED |
| max_memory_store default | 75% of memory (docs, Learn); fallback 256 MiB (Learn) | `sysMem/4*3` (GOMEMLIMIT if lower); `JetStreamMaxMemDefault = 256 MiB` fallback | server/jetstream.go:2755-2765; :2722 | RESOLVED |
| max_file_store default | 1 TB (legacy docs, Getting Started) vs 75% of available disk, 1 TB fallback (Learn Sizing) | `diskAvailable()` = 75% of `statfs` available; 1 TiB only on Windows/NetBSD/wasm or statfs error | server/disk_avail.go:29-35; server/disk_avail_windows.go:19-21; `JetStreamMaxStoreDefault` server/jetstream.go:2720 | RESOLVED — F-SIZE-4 |
| sync_interval | 2m (legacy docs, Jepsen, Learn); `always` | `defaultSyncInterval = 2m`; `always` → `SyncAlways=true` | server/filestore.go:332; server/opts.go:2698-2699, 6178-6179 | RESOLVED |
| request_queue_limit | 10K "since v2.10.21" (legacy JS config page) vs "2.11.0" (legacy config ref) | `JSDefaultRequestQueueLimit = 10_000`; present in v2.10.21 tag, absent in v2.10.20; main commit 1b7997d23 (2024-09-19) | server/jetstream_api.go:393; `git show v2.10.21:server/jetstream_api.go` line 354 | RESOLVED — F-SIZE-22 |
| API queue overflow behaviour | drops ALL pending (legacy docs, code dump) | `queue.drain()` + advisory `$JS.EVENT.ADVISORY.API.LIMIT_REACHED` | server/jetstream_api.go:928-944 | RESOLVED |
| max_buffered_msgs / max_buffered_size | 10,000 / 128 MB (legacy config ref) | `streamDefaultMaxQueueMsgs = 100_000`, `streamDefaultMaxQueueBytes = 128 MiB` | server/stream.go:459-460; applied stream.go:913-920 | RESOLVED 100,000 — F-SIZE-6 |
| max_outstanding_catchup | 64 MB (legacy docs) | `defaultMaxTotalCatchupOutBytes = 64 MiB` | server/jetstream_cluster.go:12595 | RESOLVED |
| JetStream concurrent disk IOs | "min(16,max(4,cores)) in 2.14.2" (issue 8434) | v2.14.2: exactly that (`nIO := min(16, max(4, mp))`, >32 cores → half); main: `defaultConcurrentIOs = 4096`, min 4, max 8192, config `max_concurrent_io` | `git show v2.14.2:server/filestore.go` :13155-13161; server/dios.go:21-23; server/opts.go:2789-2794 | RESOLVED — F-SIZE-33 |
| Stream replicas max | 5 (all) | `StreamMaxReplicas = 5`; error "maximum replicas is 5"; 0 → 1 | server/stream.go:730, 1730-1734 | RESOLVED |
| Duplicate window default | 2m / 120000000000 ns (all) | `StreamDefaultDuplicatesWindow = 2m`; capped to MaxAge and to `jetstream.limits.duplicate_window` | server/stream.go:1674, 1776-1791 | RESOLVED |
| Stream storage default | file (all) | file when unset | server/stream.go:1723-1724 (dump) / jsm schema default `file` | RESOLVED |
| MaxMsgs/MaxBytes/MaxMsgSize/MaxConsumers 0 → -1 | (legacy docs, schema) | normalization | server/stream.go:1740-1768 | RESOLVED |
| max_msg_size type | int32, -1..2147483647 (ADR-1) | schema `minimum -1`, `maximum 2147483647` | jsm.go schema_source/jetstream/api/v1/definitions.json:26 | RESOLVED |
| Stream max_msg_size fallback | account max payload → 1 MiB (code dump) | `maxMsgSize()` chain; `defaultMaxSubject = 256` | server/stream.go:1397-1427 | RESOLVED |
| Header block max | 65535 (code dump) | `len(hdr) > math.MaxUint16` → `JSStreamHeaderExceedsMaximum` | server/stream.go:6963-6971 | RESOLVED |
| Stream/consumer name max | 255 (ADR-6) | `JSMaxNameLen = 255` | server/jetstream_api.go:389 | RESOLVED |
| Description max | 4096 | `JSMaxDescriptionLen = 4*1024` | server/jetstream_api.go:381 | RESOLVED |
| Metadata max | 128 KB (ADR-33) | `JSMaxMetadataLen = 128*1024` | server/jetstream_api.go:385 | RESOLVED |
| Subject-details listing cap | 100,000 (blog) | `JSMaxSubjectDetails = 100_000` | server/jetstream_api.go:461 | RESOLVED |
| Paged API limit | 1024 (ADR-1) | NAMES 1024, LIST 256 | server/jetstream_api.go:479-480 | RESOLVED — F-SIZE-38 |
| Batch/multi direct get max | 1024 msgs, 413 (ADR-31) vs "64 messages" (talk EP03S3) | `maxAllowedResponses = 1024`; `413 Too Many Results` | server/stream.go:5992, 6034 | RESOLVED 1024 — F-SIZE-13 |
| Direct get max_bytes default | server max_pending (ADR-31) | `mb = int(s.opts.MaxPending)` | server/stream.go:6004-6005, 6143-6144 | RESOLVED |
| Atomic batch: size / inflight per stream / per server / idle | 1000 / 50 / 1000 / 10s (ADR-50, blog, talk, Learn) | stream.go consts; overridable via `jetstream.limits` | server/stream.go:465-469, 7400-7424 | RESOLVED |
| Fast batch: inflight per stream / per server | 1000 / 50,000 (ADR-50) | stream.go consts | server/stream.go:471-472 | RESOLVED |
| Batch ID max length | 64 (ADR-50, talk) | `len(batchId) > 64` → 10179 | server/stream.go:7366-7367 | RESOLVED |
| Batch error codes | 10174-10179, 10199, 10201, 10205-10208 (ADR-50) | all present with matching descriptions | server/errors.json | RESOLVED |
| Per-message TTL min | 1s incl. literal 0 (ADR-43, Learn) | `dur < time.Second` → 10165 | server/stream.go:5530-5534 | RESOLVED |
| SubjectDeleteMarkerTTL min | "> 1 s" (ADR-8) | `< time.Second` rejected (so >= 1s) | server/stream.go:1838-1841 | RESOLVED (>= 1s) |
| Scheduler `@every` minimum | 1s (ADR-51) | `dur.Seconds() < 1` rejected | server/scheduler.go:339-342 | RESOLVED |
| Async persist restrictions | R1 only, file only, no atomic batch (ADR-56, Learn) | three checks | server/stream.go:1870-1879 | RESOLVED |
| Meta rescue timeout / code | 5 min, 10224 (ADR-61) | `rescueQuorumTimeoutDefault = 5m`; 10224 `JSClusterRescueErr` | server/raft.go:308; server/errors.json | RESOLVED |
| JS API level | 0/1/2 for <2.11/2.11/2.12 (ADR-44) | `JSApiLevel int = 5` in 2.15.0-dev | server/jetstream_versioning.go:20 | stale ADR table — F-SIZE-17 |
| AckWait default | 30s (all) | `JsAckWaitDefault = 30s`, applied for explicit/all | server/consumer.go:572, 648-650 | RESOLVED |
| MaxAckPending default | 1,000 (legacy walkthrough, schema, Learn) / 20,000 (2021 legacy leaf page, ADR-13) / 100 (talk) / 65,536 (Grokking blog) | `JsDefaultMaxAckPending = 1000` (lowered from 20_000 in e1c581334, v2.8.0) | server/consumer.go:579, 672-680 | RESOLVED 1000 — F-SIZE-1 |
| MaxDeliver default | -1 (all) | 0 → -1 | server/consumer.go:588-594 | RESOLVED |
| MaxWaiting default | 512 (ADR-13, all) | `JSWaitQueueDefaultMax = 512` | server/jetstream_api.go:756; consumer.go:645-646 | RESOLVED |
| Ephemeral inactive threshold | 5s (NBE, code) | `JsDeleteWaitTimeDefault = 5s` + 100ms + up to 900ms jitter | server/consumer.go:575, 1464-1475 | RESOLVED |
| Ordered consumer inactive threshold | 5 min (Learn) | `InactiveThreshold: 5 * time.Minute` | nats.go jetstream/ordered.go:635 | RESOLVED |
| Pinned TTL default | 2m (ADR-42, Learn, talk) | `JsDefaultPinnedTTL = 2m` | server/consumer.go:582, 690-692 | RESOLVED |
| Priority group name | 1-16 chars (ADR-42) | `^[a-zA-Z0-9/_=-]{1,16}$` | server/consumer.go:49 | RESOLVED |
| Priority groups per consumer | "one only" (ADR-42) / "more accepted, first wins" (Learn) | no count check; every name validated | server/consumer.go:982-989 | REQUIRES RESOLUTION — F-SIZE-23 |
| `failover` pull field | "not implemented in 2.14" (ADR-42) | no `Failover` field in server; only MinPending/MinAckPending | server/consumer.go:3920-3921 | RESOLVED (absent) |
| Flow-control max pending | 32 MiB (code dump) | `JsFlowControlMaxPending = 32 MiB` | server/consumer.go:577 | RESOLVED |
| Ack reply tokens v1/v2 | 9 / 11 | consts | server/consumer.go:6130-6131 | RESOLVED |
| Clustered ephemeral cleanup retry | 30s → 5m | consts | server/consumer.go:2146-2147 | RESOLVED |
| Consume() defaults | max_messages "100-1000", expires 30s, heartbeat = expires/2 (ADR-37) | `DefaultMaxMessages = 500`, `DefaultExpires = 30s`, heartbeat = expires/2 capped 30s (ordered: 5s), thresholds 50% | nats.go jetstream/pull.go:191-192, 1185-1204 | RESOLVED |
| Heartbeat-miss alarm multiplier | 3x (ADR-15) vs 2x (ADR-37) | nats.go resets timer at `2 * Heartbeat` | nats.go jetstream/pull.go:250,265,378 | RESOLVED 2x — F-SIZE-60 |
| Legacy Fetch max wait | 5s (NBE) | `defaultRequestWait = 5s` | nats.go js.go:299,314 | RESOLVED |
| JS publish retry | 250ms, 2 retries (ADR-22) | `DefaultPubRetryWait = 250ms`, `DefaultPubRetryAttempts = 2` | nats.go js.go:233-236; jetstream/publish.go:157-160 | RESOLVED |
| Async pub ack inflight | (not claimed) | `defaultAsyncPubAckInflight = 4000` | nats.go js.go:239 | info |
| KV history max | 64 (ADR-8, legacy docs, Learn) | client-enforced: `KeyValueMaxHistory = 64`; natscli validator 1..64; no server constant | nats.go kv.go:301, jetstream/kv.go:494; natscli cli/kv_command.go:106 | RESOLVED (client limit) — F-SIZE-11 |
| KV history default | 1 | natscli default "1"; nats.go uses 1 when unset | natscli cli/kv_command.go:106 | RESOLVED |
| KV duplicate window rule | min(TTL, 2m) (ADR-8) | `duplicateWindow := 2m; if TTL>0 && TTL<2m → TTL` | nats.go jetstream/kv.go:651-654 | RESOLVED |
| KV key charset | letters, digits, `-/_=.` (Learn) | `^[-/_=\.a-zA-Z0-9]+$` | nats.go jetstream/kv.go:505 | RESOLVED |
| Object store chunk default | 128 KiB (ADR-20, Learn, blog) | `objDefaultChunkSize = 128*1024` | nats.go object.go:236; jetstream/object.go:486 | RESOLVED |
| Snapshot window / chunk / ack timeout | 8 MiB / 128 KiB / ~5s (Learn) | `defaultSnapshotWindowSize = 8 MiB`, `defaultSnapshotAckTimeout = 5s`; chunk 128 KiB set by client | server/jetstream_api.go:4493-4494, 4505; jsm.go snapshots.go:376-377 | RESOLVED |
| max_ha_assets placement | >, `_meta_` counted (code dump) | `ni.stats.HAAssets > maxHaAssets`; `HAAssets = numRaftNodes()` | server/jetstream_cluster.go:9539-9544; server/jetstream.go:2612 | RESOLVED |
| Account reservation R>1 untiered | replicas × bytes (Learn) | `accountReservation`: `tier == "" && replicas > 1 → replicas*bytes` | server/jetstream.go:2500-2508 | RESOLVED |
| Raft election timeout | 4–9s (Learn) | `minElectionTimeoutDefault = 4s`, `max… = 9s` | server/raft.go:298-299 | RESOLVED |
| Raft heartbeat | 1s (Learn) | `hbIntervalDefault = 1s` | server/raft.go:302 | RESOLVED |
| Raft quorum | n/2+1 (legacy docs, Learn) | `qn := n.csz/2 + 1` | server/raft.go:1236 | RESOLVED |
| Lost quorum / signal / observer / peer-remove | 10s / 20s / 48h / 5m | consts | server/raft.go:303-307 | RESOLVED |
| Raft overrun step-down; PAE warn/drop | 100,000; 10,000/20,000 | consts | server/raft.go:4966-4969 | RESOLVED |
| Raft WAL replay pause | 32 MiB | `maxQsz = 32 MiB` | server/raft.go:575 | RESOLVED |
| Stream catch-up timeouts | 5s / 30s | consts | server/jetstream_cluster.go:11894-11895 | RESOLVED |
| Filestore block sizes | 8 / 4 / 4 / 2 MiB, min 32000 B | consts | server/filestore.go:361-381 | RESOLVED |
| Filestore record overhead | 22 B hdr + 8 B checksum (legacy docs "39 bytes for 5-byte hello") | `msgHdrSize = 22`, `checksumSize = 8` | server/filestore.go:1112-1114 | RESOLVED (30 + subject + payload) |
| Filestore timers | cache 10s, FD idle 30s, fss 2m, flush wait 8ms, compact min 2 MiB | consts | server/filestore.go:330-340, 377 | RESOLVED |
| Store perms | 0700/0600 | consts | server/filestore.go:164-165 | RESOLVED |
| Mirror/source retry | "10-20s" (legacy docs, blog, talk); "10s to 60s" (legacy API ref) | `5s * 2 * fails` capped at 2m (10s, 20s, 30s … 120s); HB 1s; health check 10s; throttle 2s | server/stream.go:3443-3454, 3120-3122, 3925 | RESOLVED — F-SIZE-18 |
| Interest-state check | 2m + 30s jitter | consts | server/stream.go:8674-8675 | RESOLVED |
| Replication wire compression threshold | 8 KiB (code dump) | not re-verified in this pass | server/jetstream_cluster.go (dump :11416) | unverified (dump-cited) |
| MQTT ack_wait | 30s (legacy docs, Learn) | `mqttDefaultAckWait = 30s` | server/mqtt.go:147 | RESOLVED |
| MQTT max_ack_pending default / range / session cap | 1024 / 0..65535 / 65535 (Learn, legacy docs) | `mqttDefaultMaxAckPending = 1024`; parser `[0..65535]`; `mqttMaxAckTotalLimit = 0xFFFF` | server/mqtt.go:151,155; server/opts.go:5673-5679 | RESOLVED |
| MQTT max payload | 268435455 | `mqttMaxPayloadSize = 0xFFFFFFF` | server/mqtt.go:96 | RESOLVED |
| MQTT stream replicas derivation | from `routes` count, clamp 1..3 (Learn) | `mqttDetermineReplicas()` | server/mqtt.go:1600-1622 | RESOLVED |
| MQTT timers | transfer retry 5s, retained TTL 2m, transfer 10s, JS API 5s | consts | server/mqtt.go:190-199 | RESOLVED |
| WebSocket frame/compress/max msg | 4096 / 64 B / 8×max_payload capped 64 MiB | consts | server/websocket.go:60-63 | RESOLVED |
| WebSocket ping_interval override | per-listener from 2.12 (Learn) | `opts.Websocket.PingInterval` honoured for ws clients | server/opts.go:5603; server/client.go:5836-5837 | RESOLVED |
| Profile duration cap | 15s (Learn) | `Duration > 15*time.Second` rejected | server/monitor.go:4188-4191 | RESOLVED |
| System events HB / statsz | 30s / 10s / 1s (code dump) | not re-grepped this pass | server/events.go (dump :99-107) | unverified (dump-cited) |
| Go client defaults | Timeout 2s, ping 2m, MaxPingsOut 2, MaxReconnect 60, ReconnectWait 2s, jitter 100ms/1s, ReconnectBufSize 8 MiB, DrainTimeout 30s, Flush 10s, drain-flush 5s | all match | nats.go nats.go:53-66, 6007-6008, 6325 | RESOLVED |
| Go sub pending limits | 65536 msgs / 64 MiB (legacy docs) vs 500,000 / 64 MB (Learn) | `DefaultSubPendingMsgsLimit = 500_000`, bytes 64 MiB; was 65536 until 2020-11-15 (b9917b8), then 512*1024, then 500_000 (ea3ef92, 2025-07-09) | nats.go nats.go:5792-5794 | RESOLVED — F-SIZE-8 |
| Rust client defaults | connect 5s, ping 60s, unlimited reconnects, capacity 65536, no retry-on-initial (Learn) | `connection_timeout 5s`, `ping_interval 60s`, `max_reconnects None`, `subscription_capacity 1024*64` | nats.rs async-nats/src/options.rs:103-117 [client source, outside allowlist] | RESOLVED* |
| JS client defaults | connect 20s, maxReconnect 10, jitter 100ms/1s (Learn) | `timeout || 20000`; `DEFAULT_MAX_RECONNECT_ATTEMPTS = 10`; jitter 100/1000; ping 2m; maxPingOut 2 | nats.js core/src/options.ts:28-36; core/src/protocol.ts:575 [outside allowlist] | RESOLVED* |
| Python client defaults | reconnect buffer 2 MB, max_reconnect 60, connect 2s (Learn) | `DEFAULT_PENDING_SIZE = 2 MiB`, `…MAX_RECONNECT_ATTEMPTS = 60`, `…CONNECT_TIMEOUT = 2`, ping 120s, drain 30s | nats.py nats/src/nats/aio/client.py:89-99 [outside allowlist] | RESOLVED* |
| Java client defaults | maxReconnect 60, wait 2s, jitter 100ms/1s, buffer 8 MB, connect 2s (Learn) | all match; `DEFAULT_RECONNECT_BUF_SIZE = 8_388_608` | nats.java Options.java:91-193 [outside allowlist] | RESOLVED* |
| .NET client defaults | unlimited reconnect, growing wait, jitter 100ms (Learn); "1,024-message channel" (Learn Slow Consumers) | `MaxReconnectRetry = -1`, `ReconnectWaitMin 2s` → `Max 5s`, jitter 100ms ✓; `SubPendingChannelCapacity = 16384` ✗ | nats.net src/NATS.Client.Core/NatsOpts.cs:116-240 [outside allowlist] | F-SIZE-9 |
| natscli reconnect backoff | 500 ms → 20 s (Learn) | `DefaultBackoff` table 500…20000 ms, `MaxReconnects(-1)` | natscli internal/util/backoff.go:31-38; cli/util.go:241-251 [outside allowlist] | RESOLVED* |
| `nats server passwd` | bcrypt cost 11, min 10 chars (Learn) | cost default "11"; `len(c.pass) < 10` rejected | natscli cli/server_mkpasswd_command.go:37,62 [outside allowlist] | RESOLVED* |
| natscli consumer flags | --max-pending -1, backoff 10 steps 1m..20m | match | natscli cli/consumer_command.go:144-164 | RESOLVED* |
| jsm.go audit thresholds | 90% / 1.5x / 1000 HA / 10% lag / 1M subjects / 30d,7d | match | jsm.go audit/*_checks.go (account:36,42; cluster:39,60; jetstream:41,56,71-83; server:53,75,81,110,116) | RESOLVED |
| jsm schema consumer/stream defaults | ack_wait 30s min 1, max_ack_pending 1000, max_waiting 512, replicas 0..5, max_deliver -1 | match | jsm.go schema_source/jetstream/api/v1/definitions.json | RESOLVED |

`RESOLVED*` = verified in a client repo outside the lead's strict allowlist; downgrade to REQUIRES RESOLUTION if the rule is applied literally.

## Findings

### F-SIZE-1: MaxAckPending default — 1,000 vs 20,000 vs 65,536 vs 100
- Type: contradiction
- Severity: high
- Claims: "Max Ack Pending 1,000" (legacy JS walkthrough; jsm schema; Learn Reading back / Delivery / Scaling) vs "20,000" (legacy JetStream-on-leaf-nodes page, 2021 CLI output; ADR-13 example) vs "default max ack pending 65536" (blog Grokking NATS Consumers, both parts) vs "by default this is actually set to 100" (talk "The ONE feature…")
- Verification: `JsDefaultMaxAckPending = 1000` server/consumer.go:579, applied at :672-680 (lowered further by `jetstream.limits.max_ack_pending` / account limit). History: introduced as `20_000` in bb7a8a5f7 (2021-03-30), changed to `1000` in e1c581334 "[CHANGED] JetStream: lower default consumer's maximum ack pending" (2022-03-29), first release tag v2.8.0. No commit in nats-server or nats.go ever set 65536 or 100 (`git log -S` empty).
- Verdict: RESOLVED — default is 1,000 since v2.8.0 (April 2022); 20,000 applied from v2.2.x to v2.7.x. The 65,536 and 100 figures are wrong on every version.

### F-SIZE-2: write_deadline default — 2s vs 10s
- Type: stale
- Severity: medium
- Claims: "write_deadline 2s" (legacy Monitoring /varz sample; legacy Slow Consumers page example) vs "write_deadline default 10s" (legacy config reference; Learn Sizing; NBE `nats server info` 2.10.1)
- Verification: `DEFAULT_FLUSH_DEADLINE = 10 * time.Second` server/const.go:132. History: 500ms (2012) → 2s (eb5c550f1, 2013-12-12) → 10s (06ca58033 "Update write deadline, client processing and slow proxy", 2020-06-30; first release tag containing it v2.2.0).
- Verdict: RESOLVED — 10s since v2.2.0; the 2s figure is pre-2020.

### F-SIZE-3: tls timeout 0.5 vs 2s; auth timeout 1s vs 2s vs tls+1
- Type: stale
- Severity: medium
- Claims: "tls_timeout 0.5, auth_timeout 1" (legacy /varz sample) vs "tls timeout 2 seconds" (legacy TLS page; Learn) vs "auth timeout default is 1 second more than tls_timeout; invalid values default to 1s" (legacy auth page) vs "authorization.timeout default 2 seconds" (Learn Authentication basics)
- Verification: `TLS_TIMEOUT = 2s` server/const.go:108, `AUTH_TIMEOUT = 2s` server/const.go:117; both changed from 500ms / 2×TLS in 9b6385d6e "[CHANGED] Default TLS and Auth timeout" (2020-10-08, v2.2.0). `getDefaultAuthTimeout` server/opts.go:6192-6200: with a TLS config the auth timeout is `tlsTimeout + 1.0`, otherwise `AUTH_TIMEOUT` (2s).
- Verdict: RESOLVED — TLS handshake timeout 2s; auth timeout 2s without TLS, tls_timeout+1s (so 3s by default) with TLS. The legacy "defaults to 1s" and the /varz sample (0.5/1) are pre-v2.2.0. The Learn statement "default 2 seconds" is only right for a non-TLS listener.

### F-SIZE-4: max_file_store default — "1 TB" vs 75% of available disk
- Type: wrong
- Severity: high
- Claims: "`max_file_store 1TB`" (legacy config reference), "`-js` defaults to 1TB of disk" (legacy Getting Started) vs "file storage defaults to 75% of disk space available under store_dir, falling back to 1 TB only when the platform can't report disk size" (Learn Sizing & resources)
- Verification: `dynJetStreamConfig` server/jetstream.go:2748-2752 calls `diskAvailable(jsc.StoreDir)` when max_file_store is unset; server/disk_avail.go:29-35 returns `Bavail*Bsize/4*3` ("Estimate 75% of available storage") and only falls back to `JetStreamMaxStoreDefault` (1 TiB, server/jetstream.go:2720) on `Statfs` error; server/disk_avail_windows.go:19-21 and disk_avail_netbsd.go/wasm always return 1 TiB. Present since fe2b35441 (2020-10-28).
- Verdict: RESOLVED — on Linux/macOS/*BSD/Solaris the default is 75% of the store directory's available space; 1 TiB is only the Windows/NetBSD/wasm/fallback value. The legacy "1TB default" is wrong for the platforms almost everyone runs.

### F-SIZE-5: max_payload "up to 64 MB"
- Type: dubious
- Severity: medium
- Claims: "can be increased up to 64 MB" / "max_payload can be set up to 64MB" (legacy Messages page, config reference, FAQ; blog "Deploying a scalable NATS cluster") vs Learn/Sizing ("must stay <= max_pending")
- Verification: no 64 MB check exists. `MaxPayload int32` server/opts.go:456 (theoretical 2 GiB); the only hard constraint is `max_payload > max_pending → startup error` server/server.go:1163-1166; above `MAX_PAYLOAD_MAX_SIZE` (8 MiB, const.go:96-99, added d1365b741 v2.3.4) the server only logs "Maximum payloads over 8.0 MB are generally discouraged" server/server.go:2349-2351. The 64 MiB figure appears in code only as the WebSocket max message cap `wsMaxMsgPayloadLimit` server/websocket.go:63 and as the default `max_pending`.
- Verdict: RESOLVED — there is no 64 MB hard limit; "64 MB" is the default max_pending (which max_payload may not exceed unless max_pending is raised too) and the WebSocket message cap. Recommendation stays "keep <= 8 MiB" (server warning) and maintainer guidance 2–3 MB (ripienaar, F-SIZE-29 sources).

### F-SIZE-6: max_buffered_msgs default — 10,000 vs 100,000
- Type: wrong
- Severity: medium
- Claims: "`max_buffered_msgs 10.000` and `max_buffered_size 128MB` (2.11.0)" (legacy config reference)
- Verification: `streamDefaultMaxQueueMsgs = 100_000`, `streamDefaultMaxQueueBytes = 128 * 1024 * 1024` server/stream.go:459-460, applied when the option is 0 at server/stream.go:913-920.
- Verdict: RESOLVED — default is 100,000 messages / 128 MiB; the docs' 10,000 is wrong (likely a lost zero).

### F-SIZE-7: Sizing minimums — 4c/8Gi vs 4c/16GB vs 2c/8GiB vs "not below 3GB"
- Type: contradiction
- Severity: high
- Claims: "at least 4 CPU cores and 8 GiB" (legacy Installing page) vs "We recommend 4 cpu and at east 8Gi" (derekcollison, 2022-06-23) vs "at least 4 cores and 16GB of mem (plus SSD volumes)" (wallyqs, 2025-01-22) vs "at least 2 cores, at least 8 GiB RAM, 3000 IOPS" (blog "Deploying a scalable NATS cluster") vs "I wouldn't run nats with below 3GB memory when using Jetstream" and website memory guidance "is definitely wrong" (ripienaar, 2024-08-02) vs "Recommend at least 4 vcpu with that many [5,000 R3] consumers" (wallyqs, 2026-02-22) vs Learn Sizing ("light publisher ~128 MiB", "overprovision CPU 20–30%")
- Verification: derekcollison https://github.com/nats-io/nats-server/discussions/3210 (L50); wallyqs https://github.com/nats-io/nats-server/discussions/6397 (L216) and https://github.com/nats-io/nats-server/discussions/7863 (L41); ripienaar https://github.com/nats-io/nats-server/issues/5739 (L159, L169). No code constant.
- Verdict: REQUIRES RESOLUTION — every figure is a maintainer opinion at a different date; the newest general statement is wallyqs 2025-01 (4 cores / 16 GB / SSD). Publish one baseline and mark the rest as older; ripienaar explicitly calls the current website memory guidance wrong. The blog's "2 cores" and the Learn "128 MiB per light publisher" have no maintainer backing.

### F-SIZE-8: Client pending limits — 65,536 msgs vs 500,000 msgs (Go)
- Type: stale
- Severity: medium
- Claims: "Default subscriber pending limits: 65536 messages and 65536*1024 bytes" (legacy Slow Consumers page) vs "500,000 messages and 64 MB in Go (similar in Python and Java)" (Learn Slow Consumers / Where Next)
- Verification: `DefaultSubPendingMsgsLimit = 500_000`, `DefaultSubPendingBytesLimit = 64 * 1024 * 1024` nats.go nats.go:5792-5794. History: 65536 (2016) → `512 * 1024` (b9917b8, 2020-11-15) → `500_000` (ea3ef92, 2025-07-09).
- Verdict: RESOLVED — Go defaults are 500,000 messages / 64 MiB; the legacy figures are pre-Nov-2020. "similar in Python and Java" is unverified (no matching constants located in nats.py; nats.java uses `DEFAULT_MAX_MESSAGES_IN_OUTGOING_QUEUE = 5000` for outbound, Options.java:245).

### F-SIZE-9: .NET subscription channel capacity — 1,024 vs 16,384
- Type: wrong
- Severity: low
- Claims: "C# to a 1,024-message channel" (Learn Slow Consumers)
- Verification: `SubPendingChannelCapacity { get; init; } = 16384` nats.net src/NATS.Client.Core/NatsOpts.cs:240 [client source, outside allowlist]. Other .NET claims check out: `MaxReconnectRetry = -1` (:218), `ReconnectWaitMin 2s` growing to `ReconnectWaitMax 5s` (:123, :228), `ReconnectJitter 100ms` (:128), `ConnectTimeout 2s` (:130).
- Verdict: RESOLVED (client source) — the default channel is 16,384 messages; fix the Learn page. Downgrade to REQUIRES RESOLUTION if nats.net is not an accepted source.

### F-SIZE-10: Connection defaults across clients — ADR-40 "5s connect, 3 reconnects" vs client code
- Type: contradiction
- Severity: low
- Claims: ADR-40 "connection timeout 5s; max reconnects 3 / none" vs Go 2s/60 (legacy docs, Learn), Rust 5s/unlimited, JS 20s/10, Python 2s/60, Java 2s/60, .NET 2s/unlimited (Learn Connecting / Reconnection)
- Verification: nats.go nats.go:55-59 (`DefaultMaxReconnect = 60`, `DefaultTimeout = 2s`); nats.rs options.rs:103-104 (`max_reconnects: None`, `connection_timeout 5s`); nats.js options.ts:28 (`10`), protocol.ts:575 (`20000`); nats.py client.py:92,98 (`60`, `2`); nats.java Options.java:91,115 (`60`, `2s`); nats.net NatsOpts.cs:130,218 (`2s`, `-1`). Client repos are outside the allowlist.
- Verdict: RESOLVED (client sources) — the Learn per-client table is correct; ADR-40's "5s / 3" are design placeholders no client implements as defaults. Rust also pings every 60s (options.rs:111), matching the Learn "three minutes in Rust" stale-detection figure.

### F-SIZE-11: KV history maximum 64 is a client limit, not a server one
- Type: dubious
- Severity: low
- Claims: "The maximum history size is 64" (legacy KV page; ADR-8; Learn Your first bucket / History)
- Verification: no server constant; `KeyValueMaxHistory = 64` nats.go kv.go:301 and jetstream/kv.go:494; natscli validator `Int64RangeValidator(1, 64)` cli/kv_command.go:106. Server-side `max_msgs_per_subject` is unbounded.
- Verdict: RESOLVED — 64 is enforced by every official client/CLI, not by nats-server; docs should say "clients cap history at 64" (legacy docs already hint that a raw stream has no such cap).

### F-SIZE-12: Direct-get / batch-get response cap — 1024 vs "64 messages"
- Type: wrong
- Severity: low
- Claims: "may only allow matching up to 1024 subjects … `413`" (ADR-31) vs "64 messages I think" (talk EP03S3 NATS 2.11 Release)
- Verification: `const maxAllowedResponses = 1024` server/stream.go:5992; `NATS/1.0 413 Too Many Results` server/stream.go:6034.
- Verdict: RESOLVED — 1024; the talk figure is wrong.

### F-SIZE-13: MaxAckPending "default 100" (talk)
- Type: wrong
- Severity: low
- Claims: "by default this is actually set to 100" (talk "The ONE feature that makes NATS more powerful…")
- Verification: server/consumer.go:579 (`1000`); see F-SIZE-1.
- Verdict: RESOLVED — 1,000.

### F-SIZE-14: API queue limit version — "since v2.10.21" vs "2.11.0"
- Type: contradiction
- Severity: low
- Claims: "Since v2.10.21 the NATS JetStream API has a limit of 10K inflight requests" (legacy Configuring JetStream page) vs "`request_queue_limit 10.000` (2.11.0)" (legacy config reference)
- Verification: `git show v2.10.21:server/jetstream_api.go` contains `JSDefaultRequestQueueLimit = 10_000` (line 354); v2.10.20 does not. Main commit 1b7997d23 (2024-09-19).
- Verdict: RESOLVED — first shipped in v2.10.21 (backport); the config-reference "2.11.0" version tag is wrong.

### F-SIZE-15: HA-asset ceilings — 2k per server (Synadia ops) vs 1000 (jsm.go audit) vs 16k heartbeat math
- Type: contradiction
- Severity: medium
- Claims: "In our global clusters we limit servers, at the moment, to 2k HA Assets. We have customers that have higher and are ok" (derekcollison, discussion 5128, 2024-02-26) vs CLUSTER_003 audit "alert when a server hosts more than 1000 HA assets" (jsm.go) vs "16k R3 consumers … Heartbeats alone would be ~16k msgs/sec" (derekcollison, issue 4831, 2023-11-30)
- Verification: https://github.com/nats-io/nats-server/discussions/5128 L17; jsm.go audit/cluster_checks.go:60 (`Default: 1000`); https://github.com/nats-io/nats-server/issues/4831 L82. Placement enforcement of `jetstream.limits.max_ha_assets` is server/jetstream_cluster.go:9539-9544 (strict `>`, meta group counted, `HAAssets = numRaftNodes()` server/jetstream.go:2612).
- Verdict: RESOLVED — two different thresholds with different purposes: 1000 is the jsm.go audit warning level, 2000 is Synadia's operational cap per server; neither is a server-enforced default (`max_ha_assets` is 0/unset unless configured). Document both with their roles.

### F-SIZE-16: Consumer-count guidance — 20K per stream, 100k+, "few thousand" design point
- Type: unverifiable
- Severity: medium
- Claims: "shard the streams so that you do not have more than 20K consumers or so per stream" (wallyqs, 2026-02-22) vs "Beyond 100,000 consumers, the potential for issues increases significantly" (blog JetStream Anti-Patterns) vs "Over 100k consumers is possible with custom solutions" (derekcollison 5128) vs "designed assuming a few thousand durable consumers, users want 30–40 thousand" (RethinkConn '22 talk) vs "100-1,000 filtered consumers on R1 WorkQueue is fine" (derekcollison 6240)
- Verification: wallyqs https://github.com/nats-io/nats-server/discussions/7863 L17-19 (also: consumer-create rate above ~2K/s per cluster being worked on; monitor raftz WAL size); derekcollison https://github.com/nats-io/nats-server/discussions/5128 L20-44 and https://github.com/nats-io/nats-server/discussions/6240 (reply, "That should be fine.."). The blog's 100,000 has no maintainer attribution in the dump.
- Verdict: REQUIRES RESOLUTION — the maintainer statements (≤20K per stream; ≤10k filtered R1 consumers fine; >100k needs Synadia design help) are consistent with each other; the blog's "100,000" threshold is unsourced and should either be attributed or replaced with the 20K-per-stream figure.

### F-SIZE-17: JetStream API level table stale
- Type: stale
- Severity: low
- Claims: "API Support Level: 0 = < 2.11.0, 1 = 2.11.x, 2 = 2.12.x" (ADR-44)
- Verification: `JSApiLevel int = 5` server/jetstream_versioning.go:20 at VERSION 2.15.0-dev (const.go:69).
- Verdict: RESOLVED — the ADR list stops at 2.12; current dev server advertises level 5. (Mapping of levels 3–4 to 2.13/2.14 is not verified here; only "5 = 2.15-dev" is.)

### F-SIZE-18: Mirror/source retry interval — "10–20 s" vs "10 s to 60 s" vs backoff formula
- Type: contradiction
- Severity: low
- Claims: "Recovery interval after a disconnect is 10-20s" (legacy Source/Mirror page; blog; talk) vs "retries consumer creation every 10s to 60s" (legacy NATS API reference)
- Verification: `calculateRetryBackoff(fails) = 5s * (2*fails)` capped at `retryMaximum = 2m` server/stream.go:3443-3454 (10s, 20s, 30s, … 120s); consumer requests throttled to one per `sourceConsumerRetryThreshold = 2s` server/stream.go:3925; source heartbeat 1s and stall check 10s server/stream.go:3120-3122.
- Verdict: RESOLVED — first retry after 10s, second after 20s, growing linearly by 10s to a 2-minute cap. "10–20s" is right for the first two attempts; "10s to 60s" is wrong on the upper bound.

### F-SIZE-19: Sync-consumer reporting thresholds in nats.go vs ADR-15 (3×) vs ADR-37 (2×)
- Type: contradiction
- Severity: low
- Claims: "time allowed before an alarm is raised should be 3 times the idle heartbeat interval" (ADR-15, marked STALE?) vs "warning if timer reaches 2 * request's idle_heartbeat" (ADR-37)
- Verification: nats.go jetstream/pull.go:250, 265, 293, 378 reset the heartbeat monitor with `2 * consumeOpts.Heartbeat`.
- Verdict: RESOLVED — 2× is what ships (ADR-37); ADR-15's 3× is superseded.

### F-SIZE-20: Priority groups — "one per consumer" vs "multiple accepted, first wins"
- Type: dubious
- Severity: low
- Claims: "limit PriorityGroups to one per consumer only and error should one be made with multiple groups" (ADR-42) vs "naming more than one is accepted but only the first takes effect" (Learn Priority groups)
- Verification: server/consumer.go:978-989 rejects an empty list and validates every name against `validGroupName` (consumer.go:49) but has no `len(...) > 1` check, so multiple groups are accepted. Whether "only the first takes effect" is true was not verified (delivery-path behaviour, CONS area).
- Verdict: REQUIRES RESOLUTION — the ADR's "error on multiple groups" is not implemented; a maintainer statement (MauriceVanVeen/Jarema) or a delivery-path trace is needed to confirm "first wins" before publishing it.

### F-SIZE-21: Full resolver "limit 1000 / interval 2m" are examples, not defaults
- Type: dubious
- Severity: low
- Claims: "`full` resolver: … `interval "2m"` … `limit 1000` JWTs" (legacy resolver page); "Generated full resolver config uses `allow_delete: true`, `interval: "2m"`, `limit: 1000`" (Learn Operator mode)
- Verification: `NewDirAccResolver`: `limit == 0 → math.MaxInt64`, `syncInterval <= 0 → time.Minute` server/accounts.go:4611-4618; cache resolver `limit <= 0 → 1_000` server/accounts.go:4702-4704.
- Verdict: RESOLVED — the code defaults for a full resolver are unlimited JWTs and a 1-minute sync interval; 1000/2m are the values `nsc generate config` emits (Learn wording "generated config uses" is accurate; the legacy page reads as if they were defaults).

### F-SIZE-22: 250k msgs/s per R3 stream
- Type: unverifiable
- Severity: medium
- Claims: "A single stream, even an R3 can run ~250k msgs/sec with proper hardware and setup" (derekcollison) vs NBE partition example numbers / benchmark videos (loopback laptop figures, 84k–139k JS publish)
- Verification: https://github.com/nats-io/nats-server/discussions/3495 L14 (derekcollison, 2022-09-25).
- Verdict: RESOLVED as a maintainer statement (2022, no methodology); publish only with the "proper hardware and setup" qualifier and date.

### F-SIZE-23: ~100 MB RAM per 1M subjects
- Type: unverifiable
- Severity: low
- Claims: "for something around 1 million subjects it would be in the order of 100 megs of RAM (with small subjects)" (jnmoyne) vs legacy docs "more than one million subscribed subjects needs more than 1GB of server memory" (core sublist, different structure)
- Verification: https://github.com/nats-io/nats-server/discussions/8333 L16 (jnmoyne, 2026-06-24). Legacy "1 GB" figure has no maintainer source.
- Verdict: RESOLVED as a maintainer estimate for the JetStream per-stream subject index; the legacy "1 GB per million subscriptions" (core sublist) is a different quantity and unsourced — REQUIRES RESOLUTION for that one.

### F-SIZE-24: Stretch cluster latency bound 100–150 ms
- Type: unverifiable
- Severity: medium
- Claims: "a normal cluster just with long latency connections - max around 100 to 150m" and "a very advanced use case … last resort" (ripienaar) vs Akamai talk (global stretch cluster with 285–350 ms worst-case links)
- Verification: https://github.com/nats-io/nats-server/discussions/5317 L94 (ripienaar, 2024-04-17). Election timeout 4–9s (raft.go:298-299) and 1s heartbeat (raft.go:302) are the code-side constraints.
- Verdict: RESOLVED as maintainer guidance; the Akamai deployment exceeds it and should be presented as a vendor demo, not as a supported bound.

### F-SIZE-25: Subject token/length guidance (16 tokens, 256 chars)
- Type: unverifiable
- Severity: low
- Claims: "maximum of 16 tokens and … less than 256 characters" (legacy docs; blog; Learn Subjects)
- Verification: MauriceVanVeen https://github.com/nats-io/nats-server/discussions/5097 L16 ("keep that at a reasonable value … server can guarantee performance of subjects up to that maximum, although it's probably not strictly enforced"); code: only the 32-slot stack array `tsa [32]string` server/sublist.go:576 (spills to heap beyond 32 tokens, no rejection).
- Verdict: RESOLVED as recommendation — no hard limit; 16 is a performance guideline confirmed by a maintainer; the 32-token allocation cliff is the only code fact.

### F-SIZE-26: max_payload guidance — 8 MB vs 2–3 MB vs "a few MB"
- Type: contradiction
- Severity: low
- Claims: "we recommend keeping the max message size to something more reasonable like 8 MB" (legacy docs) vs "2 or 3MB max is a good rule" (ripienaar) vs "not advised to go beyond some few megabytes" (talk EP05) vs "Just don't come and complain … above the recommendation in the docs" (jnmoyne)
- Verification: ripienaar https://github.com/nats-io/nats-server/discussions/6320 L20 (2025-01-03); jnmoyne https://github.com/nats-io/nats-server/discussions/7068 (thread; the quoted lines are nested under a reply header, author not re-confirmed); server warning threshold 8 MiB server/server.go:2349-2351.
- Verdict: RESOLVED — the server-enforced warning line is 8 MiB; maintainer practical guidance is 2–3 MB. Publish both as "server warns above 8 MiB; keep to a few MB in practice".

### F-SIZE-27: Interior-delete bitmask memory cost
- Type: unverifiable
- Severity: low
- Claims: "at 175-196 million interior deletes this measurably costs memory" (MauriceVanVeen) vs "640M interior deletes made scale-up crawl" (RethinkConn 2024 Q&A)
- Verification: https://github.com/nats-io/nats-server/discussions/6820 L93, L117, L131 (MauriceVanVeen, 2025-04-23).
- Verdict: RESOLVED as maintainer statement (qualitative; no per-delete byte figure).

### F-SIZE-28: Disk-IO semaphore sizing changed between 2.14.2 and main
- Type: stale
- Severity: medium
- Claims: "In 2.14.2 filestore disk-IO concurrency is sized from GOMAXPROCS: min(16, max(4, cores)), or half the cores above 32" (issue 8434) vs code dump "concurrent IOs 4096 (`defaultConcurrentIOs`)" vs wallyqs "try v2.14.6 and tune the disk io setting"
- Verification: `git show v2.14.2:server/filestore.go` lines 13155-13161 (`nIO := min(16, max(4, mp))`, `mp > 32 → max(16, min(mp, mp/2))`) — issue text is accurate for 2.14.2. Main: `defaultConcurrentIOs = 4096`, `minConcurrentIOs = 4`, `maxConcurrentIOs = 8192` server/dios.go:21-23; config key `max_concurrent_io` server/opts.go:2789-2794; commits d0aa1986e (2026-07-01) and a400905b4 "Configurable `max_concurrent_io`, default raised to 4096" (2026-07-02); no release tag in this checkout contains them. wallyqs https://github.com/nats-io/nats-server/discussions/7863 L41.
- Verdict: RESOLVED — two different behaviours: ≤2.14.x derives 4–16 from GOMAXPROCS (so tight CPU cgroups throttle disk IO); main/next release defaults to 4096 with `jetstream { max_concurrent_io }`. Which 2.14.x patch got the configurable setting (wallyqs says 2.14.6) is not verifiable from this checkout — the lead should check the v2.14.6 tag.

### F-SIZE-29: "R3 survives two simultaneous node failures" (blog)
- Type: wrong
- Severity: medium
- Claims: "`replicas: 3` survives two simultaneous node failures" (blog Building Distributed State Stores) vs "R3 tolerates one loss for writes; two losses leave reads only" (legacy docs; Learn; Rethink Ep 10/11)
- Verification: quorum `qn := n.csz/2 + 1` server/raft.go:1236 → 2 of 3 required.
- Verdict: RESOLVED — R3 tolerates one failure for writes; the blog is wrong.

### F-SIZE-30: Consumer/Learn "MaxAckPending 65536 forces serial at 1" (Grokking blogs)
- Type: stale
- Severity: low
- Claims: "MaxAckPending 65536 (1 forces serial)" (blog Grokking NATS Consumers) — see F-SIZE-1
- Verification: no such default ever existed in nats-server or nats.go (`git log -S`).
- Verdict: RESOLVED — wrong; likely confused with the Go client's old 65536 pending-message limit (F-SIZE-8).

### F-SIZE-31: Legacy docs "Auth timeout … invalid values default to 1s"
- Type: stale
- Severity: low
- Claims: legacy Authentication timeout page
- Verification: see F-SIZE-3 (`AUTH_TIMEOUT = 2s` since v2.2.0).
- Verdict: RESOLVED — 2s.

### F-SIZE-32: Learn "JetStream spends roughly two FDs per stream" / `LimitNOFILE=800000`
- Type: unverifiable
- Severity: low
- Claims: Learn Sizing & Hardening
- Verification: none available — no server constant; filestore closes idle FDs after 30s (`closeFDsIdle` server/filestore.go:334), so the per-stream FD count is workload-dependent. 800000 comes from the docs' systemd unit, not code.
- Verdict: REQUIRES RESOLUTION — needs a maintainer statement or a measurement note; present as "raise NOFILE on large clusters" without the "two per stream" figure.

### F-SIZE-33: NBE "fetch blocks up to 5 seconds by default" vs Learn "clients default to about 30 seconds"
- Type: contradiction
- Severity: low
- Claims: NBE Pull Consumers (legacy nats.go API) vs Learn Pull consumers in depth (new `jetstream` API)
- Verification: legacy `defaultRequestWait = 5s` nats.go js.go:299,314 (used by `Fetch`); new API `DefaultExpires = 30s` nats.go jetstream/pull.go:192.
- Verdict: RESOLVED — both correct for their API generation; docs should say which API they mean.

### F-SIZE-34: Paged API limit "1024" applies to NAMES only
- Type: dubious
- Severity: low
- Claims: "default page limit shown is 1024" (ADR-1)
- Verification: `JSApiNamesLimit = 1024`, `JSApiListLimit = 256` server/jetstream_api.go:479-480; used at :1757-1784 and :1909.
- Verdict: RESOLVED — `STREAM.NAMES`/`CONSUMER.NAMES` page at 1024; `STREAM.LIST`/`CONSUMER.LIST` page at 256.

### F-SIZE-35: KV latency figures — "1-5 ms local" (blog) vs "~40 µs in-cache" (Synadia blog) vs 41.7 µs loopback (jnmoyne)
- Type: contradiction
- Severity: low
- Claims: blog "Building Distributed State Stores" (1-5 ms) vs blog "Replace Redis with NATS" (40 µs + RTT) vs jnmoyne M1 Ultra loopback 24,000 ops/s ≈ 41.7 µs
- Verification: jnmoyne https://github.com/nats-io/nats.go/discussions/1507 L71 (2023-12-27). Blogs are not maintainer statements under the rule.
- Verdict: RESOLVED for the loopback figure (maintainer-measured, single machine); the "1-5 ms" third-party blog figure includes network and is not comparable — drop it or label it as a LAN/VM number.

### F-SIZE-36: Throughput/benchmark figures (14.8M msgs/s, 10M/s, 48 Gbit/s, 70 Gbit NICs, 100B msgs/day, etc.)
- Type: unverifiable
- Severity: low
- Claims: nats bench doc (14.8M core pub/s on a laptop, 2.12.1), talks (5–6.3M/s Mac Studio, 8M/s Workiva, 10M/s "if you try very hard", 20M/s headroom, 70 Gbit NIC), Synadia Cloud 20B→100B msgs/day, blog "10M/s sub-ms p99"
- Verification: none available in code; maintainers themselves say "Synadia publishes no official throughput numbers" (jnmoyne office-hours talk) and "three kinds of lies … benchmarks".
- Verdict: REQUIRES RESOLUTION — publish none as a spec; at most cite the nats bench docs example with its hardware and version, and the loopback caveat.

### F-SIZE-37: Restart/recovery timings (2.1 TB stream 15 min → 1.1 s; meta-election 5–10 s; LDM 60 s demo waits)
- Type: unverifiable
- Severity: low
- Claims: 2.10 webinar/blog (15 min → 1.1 s), Learn Rolling upgrades (5–10 s stall), NBE Replace nodes (60 s demo)
- Verification: election window 4–9s server/raft.go:298-299 supports "5–10 s"; the 2.10 recovery figure is a webinar anecdote (derekcollison speaking, but a talk, not a written statement).
- Verdict: REQUIRES RESOLUTION for the 15-min→1.1-s figure (talk only); the 5–10 s meta-election stall is consistent with code timers.

### F-SIZE-38: max_ha_assets / max_ack_pending / duplicate_window server limits have no defaults
- Type: dubious
- Severity: low
- Claims: legacy config reference lists `limits { max_ack_pending, max_ha_assets, max_request_batch, duplicate_window }` with "default for new streams is 120s"
- Verification: `JSLimitOpts` server/opts.go:376-383; all zero unless configured; consumer default lowered only `if lim.MaxAckPending > 0 && lim.MaxAckPending < ackPending` server/consumer.go:673-680; dedup cap only `if lim.Duplicates > 0` server/stream.go:1778.
- Verdict: RESOLVED — these are opt-in caps with no default; the 120s is the stream default (F table), not a limit default.

### F-SIZE-39: `max_consumers` account limit wording "per stream(!)"
- Type: dubious
- Severity: low
- Claims: legacy config reference "`max_consumers` (per stream(!))"
- Verification: server/consumer.go:1121-1136 (dump) and server/jetstream.go:2481-2498 (dump): the account `max_consumers` is applied as the per-stream ceiling ("if account limits is more restrictive than stream config we prefer the account limits"). Not re-read in this pass.
- Verdict: REQUIRES RESOLUTION — dump-cited only; STRM/CONS reviewer should confirm the semantics before the wording is kept.

### F-SIZE-40: WebSocket `handshake_timeout` "example 2s" vs default
- Type: dubious
- Severity: low
- Claims: legacy WebSocket page shows `handshake_timeout: "2s"` as an example including TLS
- Verification: no default constant; `if opts.Websocket.HandshakeTimeout > 0` server/websocket.go:925 — unset means no handshake read deadline beyond the listener's TLS timeout.
- Verdict: RESOLVED — there is no default handshake_timeout; 2s is an example only.

## Summary

Counts by type: contradiction 11, wrong 6, stale 7, unverifiable 9, dubious 7 (40 findings).

Counts by verdict: RESOLVED 31 (of which 3 rest on client repos outside the strict allowlist: F-SIZE-9, F-SIZE-10, and the client rows in the table), REQUIRES RESOLUTION 9.

Table rows: 132 quantities; 121 RESOLVED from code, 6 RESOLVED* from client repos outside the allowlist, 3 unverified (dump-cited only, not re-grepped: replication compress threshold, events HB intervals, `max_consumers` semantics), 2 unverifiable (route/gateway port conventions, FDs per stream).

### REQUIRES RESOLUTION
| ID | Topic | What would settle it |
|---|---|---|
| F-SIZE-7 | Baseline sizing (4c/8Gi vs 4c/16GB vs 2c/8GiB vs ≥3GB) | Pick the newest maintainer statement (wallyqs 2025-01: 4 cores, 16 GB, SSD) and date it; or ask wallyqs/derekcollison for a current baseline |
| F-SIZE-16 | Consumer-count ceilings (20K/stream vs blog 100k) | Attribute the blog's 100k or replace with wallyqs's 20K-per-stream + derek's ">100k needs design help" |
| F-SIZE-20 | Multiple priority groups: error vs first-wins | Maintainer confirmation or delivery-path trace in consumer.go (CONS) |
| F-SIZE-23 (part) | Legacy "1 GB per 1M subscriptions" for core sublist | Maintainer statement; keep jnmoyne's 100 MB/1M JetStream-subject figure only |
| F-SIZE-32 | "Two FDs per stream", NOFILE 800000 | Maintainer statement or measured note |
| F-SIZE-36 | All throughput/benchmark headline numbers | Do not publish as specs; cite nats bench example with hardware+version only |
| F-SIZE-37 | 2.10 recovery "15 min → 1.1 s" | Written maintainer source (release notes cite "less than a second" without the 15-min baseline) |
| F-SIZE-39 | Account `max_consumers` = per-stream ceiling | STRM/CONS reviewer to re-read jetstream.go:2481-2498 |
| F-SIZE-28 (part) | Which 2.14.x patch got `max_concurrent_io` | `git show v2.14.6:server/opts.go` once tags are fetched |

### 10 most important verified numbers
1. MaxAckPending default 1,000 (v2.8.0+; was 20,000 v2.2–v2.7) — server/consumer.go:579.
2. max_file_store default = 75% of available disk on Linux/macOS, 1 TiB only as fallback — server/disk_avail.go:29-35, server/jetstream.go:2720.
3. max_memory_store default = 75% of system RAM or GOMEMLIMIT, 256 MiB fallback — server/jetstream.go:2755-2765.
4. write_deadline 10s (since v2.2.0), tls timeout 2s, auth timeout 2s (tls_timeout+1s with TLS) — server/const.go:132,108,117; opts.go:6192-6200.
5. max_payload 1 MiB default, no 64 MB cap, warn above 8 MiB, must be <= max_pending (64 MiB) — const.go:94,99,102; server.go:1163,2349.
6. Duplicate window 2m (capped to MaxAge and to `jetstream.limits.duplicate_window`), stream replicas max 5 — stream.go:1674,1776-1791,730.
7. AckWait 30s, MaxWaiting 512, ephemeral inactive threshold 5s (+0.1–1s jitter), pinned TTL 2m, MaxDeliver -1 — consumer.go:572,575,582,588-594; jetstream_api.go:756.
8. API request queue limit 10,000 (drains the whole queue, advisory), first shipped v2.10.21 — jetstream_api.go:393,928-944.
9. Atomic batch 1000 msgs / 50 per stream / 1000 per server / 10s idle; fast batch 1000 / 50,000; batch ID ≤ 64 — stream.go:465-472,7366.
10. Raft: election 4–9s, heartbeat 1s, quorum n/2+1, lost-quorum 10s; stream max_buffered 100,000 msgs / 128 MiB — raft.go:298-303,1236; stream.go:459-460.


<!-- ===== STRM ===== -->

# Review: STRM

Server references are to nats-server commit 8e54a5954 (2026-08-17, v2.14-era main) under /Users/tomaszpietrek/coding/new-nats.docs/nats-server. Version boundaries were taken from `git tag --contains <commit>` on that checkout.

### F-STRM-1: Which stream config fields are immutable after creation
- Type: contradiction
- Severity: high
- Claims: "Not editable after creation: Name, Storage, MaxConsumers, Retention, DenyDelete, DenyPurge, FirstSeq, AllowMsgCounter" (Legacy docs — Streams) vs "immutable: name, storage type, retention to/from workqueue ('Can only change retention from limits to interest or back'), unsealing, cancelling deny_delete, cancelling deny_purge, mirror config (except removing it), disabling allow_msg_ttl, changing allow_msg_counter, disabling allow_msg_schedules, persist_mode" (Code — stream validation rules) vs "Set retention at creation and leave it there; the server allows exactly one live change, swapping Limits and Interest" (Learn — Retention policies)
- Verification: server/stream.go:2325-2391 `configUpdateCheckLocked`: rejects name change (2333), storage change (2340), retention change only when either side is WorkQueuePolicy (2344-2348), unseal (2350), cancelling DenyDelete/DenyPurge (2354-2360), any mirror change unless the mirror block is removed (2364-2366, `NewJSStreamMirrorNotUpdatableError`), disabling AllowMsgTTL (2378), any AllowMsgCounter change (2383), disabling AllowMsgSchedules (2388), any PersistMode change (2391). There is no MaxConsumers check in that function (`grep MaxConsumers server/stream.go` hits only create-time normalisation at 1763-1767) and no FirstSeq check. Retention swap effect: server/stream.go:2755-2772 updates every consumer's retention and, when switching to Interest, calls `checkStateForInterestStream` immediately.
- Verdict: RESOLVED — Immutable: name, storage, retention to/from WorkQueue, unseal, turning DenyDelete/DenyPurge back off, mirror block (removal only), turning AllowMsgTTL/AllowMsgSchedules off, any AllowMsgCounter change, persist_mode. Retention Limits<->Interest is editable and applies to stored messages at once; DenyDelete/DenyPurge can be turned on later; MaxConsumers is not rejected on update (the legacy list is wrong on that point); FirstSeq is neither rejected nor re-applied on update.

### F-STRM-2: Mirror configuration editability
- Type: contradiction
- Severity: high
- Claims: "Mirror configuration cannot be changed after creation" (ADR-59) and "A mirror's configuration is fixed at creation: you can't re-point it or add a filter later" (Learn — Mirrors and sources) vs "Mirror became editable in 2.12.0" (Legacy docs — Streams) vs "Mirror promotion (2.12): remove mirror config" (Blog — Mirror Streams; 2.12 Release)
- Verification: server/stream.go:2362-2366: `if cfg.Mirror != nil && !reflect.DeepEqual(cfg.Mirror, old.Mirror) { return NewJSStreamMirrorNotUpdatableError() }` with comment "We will allow removing the mirror config to 'promote' the mirror". Commit 4008ce635 "Allow promoting mirrors" first appears in tag v2.12.0. Error 10055 in server/errors.json.
- Verdict: RESOLVED — Since v2.12.0 the only allowed change to a mirror block is deleting it (promotion). Re-pointing, adding a filter, or changing transforms is rejected with 10055 on every version. "Mirror became editable in 2.12.0" overstates it.

### F-STRM-3: Replica count guidance 1/2/3 vs maximum 5
- Type: contradiction
- Severity: medium
- Claims: "replication 1 (none), 2, or 3 'for Fault Tolerance'" (Legacy docs — JetStream concept overview) vs "R=5 is the replication factor limit" (same page; Streams page) vs "Use replication factors of 3, 5 or 7" (Talk — How to configure NATS JetStream streams Ep 11)
- Verification: server/stream.go:730 `const StreamMaxReplicas = 5`; server/stream.go:1733-1734 rejects `cfg.Replicas > StreamMaxReplicas` with "maximum replicas is 5". server/raft.go:1236 `qn := n.csz/2 + 1` (R2 needs both peers, R4 tolerates one loss like R3).
- Verdict: RESOLVED — Valid replica counts are 1..5; R7 is rejected. Even counts are accepted but give no extra failure tolerance over the next-lower odd count.

### F-STRM-4: `max_buffered_msgs` default
- Type: wrong
- Severity: medium
- Claims: "`max_buffered_msgs 10.000` and `max_buffered_size 128MB` (2.11.0)" (Legacy docs — Configuration) vs "`streamDefaultMaxQueueMsgs = 100_000`, `streamDefaultMaxQueueBytes = 128 * 1024 * 1024`" (Code — stream defaults)
- Verification: server/stream.go:459-460 `streamDefaultMaxQueueMsgs = 100_000`, `streamDefaultMaxQueueBytes = 128 * 1024 * 1024`; server/stream.go:913-920 applies these when `opts.StreamMaxBufferedMsgs/Size` are zero; server/opts.go:2748-2759 only sets the options when configured (no other default).
- Verdict: RESOLVED — The per-stream inbound queue default is 100,000 messages / 128 MiB, not 10,000 messages. The docs number is wrong by 10x.

### F-STRM-5: API level required for fast batch publishing (`allow_batched`)
- Type: contradiction
- Severity: medium
- Claims: "`allow_atomic` (API level 2) and `allow_batched` (API level 3)" (ADR-50) vs "fast batch publishing (2.14) = 4" (Code — API levels)
- Verification: server/jetstream_versioning.go:84-87 "Fast batch publishing was added in v2.14 and requires API level 4. if cfg.AllowBatchPublish { requires(4) }"; atomic/counters/schedules/async persist require(2) at 65-82; TTL requires(1) at 60-63. Durable sourcing also sends `Nats-Required-Api-Level: 4` (server/stream.go:3680-3681).
- Verdict: RESOLVED — `allow_batched` requires API level 4 (2.14). ADR-50's "level 3" is wrong.

### F-STRM-6: Source/mirror reconnect and retry timing
- Type: contradiction
- Severity: low
- Claims: "Recovery interval after a disconnect is 10-20s" (Legacy docs — Source and Mirror Streams; Blog — Mirror Streams; Talk — Mirror Streams Explained) vs "retries consumer creation every 10s to 60s" (Legacy docs — NATS API Reference) vs "Reconnection uses exponential backoff with jitter" (ADR-59)
- Verification: server/stream.go:3118-3123 `sourceHealthHB = 1s`, `sourceHealthCheckInterval = 10s` (stall detection); server/stream.go:3441-3454 `retryBackOff = 5s`, `retryMaximum = 2m`, `calculateRetryBackoff(fails) = 5s * (fails*2)` capped at 2m (linear, not exponential); server/stream.go:3475-3476 and 3960-3961 add 100-200 ms jitter; server/stream.go:3925 `sourceConsumerRetryThreshold = 2s` minimum spacing.
- Verdict: RESOLVED — A stalled source is noticed within ~10 s (1 s heartbeats, 10 s check) and the first re-setup is delayed 10 s (fails=1), giving the observed 10-20 s; later retries back off linearly by 10 s per failure to a 2-minute cap, plus 100-200 ms jitter. "10s to 60s" and "exponential" are both imprecise.

### F-STRM-7: What happens to a message that hits MaxDeliver on WorkQueue/Interest streams
- Type: contradiction
- Severity: medium
- Claims: "A message stays in an interest stream until, for each consumer whose filter overlaps it, a subscription bound to that consumer successfully acks the message, terminates it, or the max redelivery has been reached" (NATS by Example — Interest-based Stream) vs "In WorkQueue streams, messages that hit the consumer's MaxDeliver will remain in the stream and must be manually deleted" (Legacy docs — Streams; Talk — Priority Background Jobs ep 12)
- Verification: server/consumer.go:4853-4866: when `dc > o.maxdc` the sequence is removed from pending, delivered/ack-floor updated, but no stream ack is issued; server/consumer.go:3908-3912 `needAck`: "If the message is not pending, it should be preserved if it reached max delivery. if !needAck { _, needAck = rdc[sseq] }"; server/consumer.go:3306-3309 comment "rdc is kept until the message leaves the stream: needAck relies on rdc to mark messages past MaxDeliver".
- Verdict: RESOLVED — Reaching MaxDeliver does not release interest. On Interest and WorkQueue streams the message stays until acked/termed by the API, deleted, or removed by a limit. The NATS by Example sentence is wrong.

### F-STRM-8: Sourcing or mirroring a WorkQueue/Interest upstream
- Type: contradiction
- Severity: medium
- Claims: "Sourcing from WorkQueue/Interest streams supported since 2.14 with a visible durable consumer; before 2.14 'not supported ... behavior is undefined'" (Legacy docs — Source and Mirror Streams; ADR-60; Blog — 2.14 Release) vs "Work queue streams are not recommended as upstream streams (replication consumers bypass the work queue's subject overlap validation)" and "Interest retention streams are not recommended" (ADR-59) vs "sourcing from a WorkQueue is by design not a supported use" (Discussion — WorkQueue messages not deleted on non-leader, derekcollison) vs "a durable sourcing consumer blocks other overlapping consumers" (ADR-60)
- Verification: server/jetstream_api.go:4835-4847 and server/jetstream_cluster.go:10889-10897: a `Direct && Sourcing` consumer create on a non-Limits stream is rewritten to `Direct=false, Durable=Name, AckPolicy=AckFlowControl, MaxDeliver=0, InactiveThreshold=0`; server/stream.go:3680-3681 sends `Nats-Required-Api-Level: 4`. Overlap validation: server/consumer.go:1140 skips WQ checks when `config.Direct || config.Sourcing`; server/stream.go:8639-8641 `numLimitableConsumers` excludes sourcing consumers; `partitionUnique` (server/stream.go:8885+) skips consumers with `Direct || Sourcing`. Server-created consumers are named `JS_MIRROR_<id>` / `JS_SRC_<id>` (server/stream.go:3562, 4019).
- Verdict: RESOLVED — From 2.14 (API level 4) a WorkQueue/Interest upstream gets a durable AckFlowControl consumer, so messages are no longer lost across disconnects; statements calling it unsupported/undefined are stale for 2.14+. ADR-59's caveat still holds: the server-created sourcing consumer is exempt from WorkQueue overlap validation in both directions, so a worker and the source can both receive a message. ADR-60's "blocks other overlapping consumers" is true only for a user-pre-created consumer (which is a normal consumer).

### F-STRM-9: Does editing `compression` take effect on a running stream
- Type: contradiction
- Severity: high
- Claims: "settable on create and update" and "Changing the algorithm later only affects new blocks" (ADR-35) vs "it will effectively rip through all the message blocks in real time" (Talk — NATS 2.10 Webinar) vs "Editing later is allowed but takes effect only after the stream's store restarts" (Learn — Stream and consumer policies)
- Verification: server/filestore.go:679-800 `fileStore.UpdateConfig` copies `cfg` into `fs.cfg` but never assigns `fs.fcfg.Compression` (`grep 'fcfg.Compression =' server/filestore.go` returns nothing); compression decisions read `fs.fcfg.Compression` (server/filestore.go:7650, 7729, 4845); `fsCfg.Compression` is set only when the store is created (server/stream.go:1008).
- Verdict: RESOLVED — The update is accepted and persisted in the stream config, but the live file store keeps the algorithm it was opened with until the store is re-created (server restart or the stream being re-created on a peer). Existing blocks are never rewritten. The webinar claim is wrong; ADR-35's "affects new blocks" is only true after a restart.

### F-STRM-10: Writes to a mirror
- Type: contradiction
- Severity: high
- Claims: "all reads will be served from this mirror but all writes will actually be forwarded to the source" (Talk — How to configure NATS JetStream streams Ep 11) vs "Publishing to a mirror fails with 'expected stream does not match'" (Learn — Mirrors and sources; Talk — Mirror Streams Explained; Talk — Short break and Q&A)
- Verification: server/stream.go:1909-1953 mirrors may not have subjects (error 10034 `JSMirrorWithSubjectsErr` in server/errors.json); server/errors.json 10060 `JSStreamNotMatchErr` "expected stream does not match". No forwarding code path exists; a publish simply lands in whatever stream owns the subject.
- Verdict: RESOLVED — A mirror captures no subjects. A publish on the origin's subjects is stored by the origin because the origin owns them, not because the mirror forwards anything; publishing "to" the mirror by name fails with 10060.

### F-STRM-11: Reads after losing quorum on an R3 stream
- Type: contradiction
- Severity: medium
- Claims: "losing two still allows reads" (Talk — Replace Kafka, RabbitMQ, Redis Ep 10; Ep 11) vs "If no majority remains (two of three gone), no leader can be elected and writes are blocked" (Learn — Surviving node loss) and "two out of three availability zones go down ... a stream asset is essentially disabled" (Talk — Effective debugging using the NATS CLI)
- Verification: Direct Get subscriptions on a replica are created once it is current or >=90% caught up (server/jetstream_cluster.go:4109-4131) and removed only on stream stop or when `allow_direct` is turned off (server/stream.go:2661-2663, 5178-5181); `processDirectGetRequest` (server/stream.go:5865+) has no leader/quorum check. Consumers require a leader (raft quorum, server/raft.go:1236).
- Verdict: RESOLVED — With one of three replicas left, consumer-based reads and all writes stop; only Direct Get (if `allow_direct` was on and that replica had already caught up) keeps answering. "Still allows reads" is true only for Direct Get.

### F-STRM-12: Direct Get batch/multi result cap
- Type: contradiction
- Severity: low
- Claims: "64 messages I think" (Talk — EP03S3 NATS 2.11 Release) vs "may only allow matching up to 1024 subjects ... 413" (ADR-31) vs "`maxAllowedResponses = 1024`" (Code)
- Verification: server/stream.go:5992 `const maxAllowedResponses = 1024` used only in `getDirectMulti` (6030, `MultiLastSeqs(..., maxAllowedResponses)` → 413 on `ErrTooManyResults`); `getDirectRequest` (server/stream.go:6103+) bounds a sequence batch only by `batch` and `max_bytes`, with `max_bytes` defaulting to `s.opts.MaxPending` (server/stream.go:5998-6003; `MAX_PENDING_SIZE = 64 MiB` server/const.go:102).
- Verdict: RESOLVED — Multi-subject direct get returns at most 1024 messages (413 above that); a sequence-based batch is bounded by the requested `batch` count and `max_bytes` (default 64 MiB), not by 64.

### F-STRM-13: Error 10061 "Replicas configuration can not be updated" is dead
- Type: stale
- Severity: medium
- Claims: "Replicas configuration can not be updated. code=400 err_code=10061 (JSStreamReplicasNotUpdatableErr)" (Code — error catalogue) vs "Replica count can be edited after creation" (Legacy docs — JetStream Administration; Blog — Over-Replicated Inactive Streams; Talk — RethinkConn '22 "R1 to R3 and back")
- Verification: `grep -rln JSStreamReplicasNotUpdatableErr server/*.go` matches only server/jetstream_errors_generated.go; no server code path returns it. Replica changes are handled by the update path (server/stream.go:2325+; 10123 `JSStreamMoveAndScaleErr` only forbids move+scale in one update).
- Verdict: RESOLVED — Replicas are editable in place; 10061 is a leftover constant a page author must not present as current behaviour.

### F-STRM-14: "Odd number of servers required" and "cluster block required" for JetStream
- Type: wrong
- Severity: medium
- Claims: "there needs to be an odd number of servers across the supercluster" and "A requirement of JetStream is to have a cluster block with routes defined, even for single node clusters" (NATS by Example — Supercluster with JetStream; Supercluster Arbiter)
- Verification: server/raft.go:1236 `qn := n.csz/2 + 1` (any group size elects; even sizes just waste a vote); server/server.go:1567-1570 `standAloneMode()` = no cluster port and no gateway port, and JetStream runs in that mode (server/stream.go:771-774 rejects only `replicas > 1` there, error 10074).
- Verdict: RESOLVED — Neither is a hard requirement. An even meta group works with the same tolerance as the next-lower odd size; odd is a recommendation. A single server runs JetStream (R1 only) with no cluster block; a node participating in gateways does need one, which is what the narrative actually observed.

### F-STRM-15: Placement tag matching semantics
- Type: unverifiable
- Severity: low
- Claims: "Tag matching folds case ... spelling is exact" and "NATS does not currently support declaring tags with logical OR" (Learn — Placement; NATS by Example — Regional and Cross Region Streams)
- Verification: server tags are lowercased on load (`o.Tags.Add`, server/opts.go:1796-1808, jwt `TagList.Add` lowercases, jwt/v2 types.go:440-445) and compared with `TagList.Contains`, which lowercases the probe (types.go:429-435). server/jetstream_cluster.go:9340-9346 additionally parses a leading `!` as an exclusion tag, and `unique_tag` is lowercased and prefix-matched (server/opts.go:2741; server/jetstream_cluster.go:9362-9381), so `"az"` and `"az:"` behave the same.
- Verdict: RESOLVED — Case folding is confirmed. Two facts missing from every source: negated tags (`!tag`) are supported, and specifying a tag that starts with the `unique_tag` prefix disables the uniqueness check for that stream.

### F-STRM-16: Unverified performance and sizing numbers
- Type: unverifiable
- Severity: medium
- Claims: "`sync_interval: always` will slow down the throughput to a few hundred msg/s" (Legacy docs — Configuration); hardware minimums "1 core / 32 MiB for 1,000 msg/s ... 3 nodes 1 core / 256 MiB for 100,000 msg/s" (Legacy docs — Installing); "2.9.22 and later patch releases understand the 2.10 storage format" (Talk — NATS 2.10 Webinar); "recovery of a 2.1 TB stream 15 min → 1.1 s" (same)
- Verification: none available in the checked-out server source; the comparable maintainer figures that do have a source are derekcollison "A single stream, even an R3 can run ~250k msgs/sec with proper hardware" (Discussion — Sharding Jetstream) and jnmoyne "~100 MB RAM per 1 million small subjects" (Discussion — high cardinality subjects), both quoted in the dump with their thread.
- Verdict: REQUIRES RESOLUTION — Ask a maintainer (or run `nats bench js` on a 2.14 R3 cluster) for the `sync_interval: always` figure; treat the hardware table as an old doc estimate; the 2.9.22 format-compatibility claim needs the 2.9.22 release notes or the filestore version-check commit.

### F-STRM-17: Counters "work across mirrors"
- Type: contradiction
- Severity: low
- Claims: "counters module ... works across sources and mirrors" (Blog — Orbit.go guide) vs "Incompatible with counters: mirrors ('would replay raw deltas and double-count')" (Blog — Distributed Counters) and "error on Mirror" (ADR-49)
- Verification: server/errors.json 10173 `JSMirrorWithCountersErr` "stream mirrors can not also calculate counters"; server/stream.go:1909-1953 mirror restrictions; ADR-49 text in the dump: a plain mirror "stores the message verbatim".
- Verdict: RESOLVED — A stream cannot be both a mirror and a counter stream. A non-counter mirror of a counter stream stores the origin's messages as-is (a read-only copy of the totals); aggregation across regions needs sources, which rewrite `Nats-Incr` to a delta.

### F-STRM-18: Name length: "keep under 32 characters" vs 255 limit
- Type: contradiction
- Severity: low
- Claims: "keep names under 32 characters" (Legacy docs — Naming Streams, Consumers, and Accounts) vs "maximum 255 characters" (ADR-6; Code `JSMaxNameLen`)
- Verification: server/jetstream_api.go:389 `JSMaxNameLen = 255`; server/stream.go:1695-1696 enforces it; server/jetstream.go:2811-2816 `isValidAssetName` forbids whitespace, `.`, `*`, `>`, `\`, `/`.
- Verdict: RESOLVED — The hard limit is 255; 32 is only a style suggestion and should not be presented as a limit.

### F-STRM-19: "NATS core servers form their own RAFT group" [DUBIOUS]
- Type: dubious
- Severity: medium
- Claims: "NATS core servers form their own RAFT group for cluster synchronization" (Blog — Deploying a scalable NATS cluster part 1)
- Verification: `startRaftNode(` is called only from server/jetstream_cluster.go:1320 (meta group) and :3499 (stream/consumer groups); core routing has no raft caller.
- Verdict: RESOLVED — Wrong. Raft exists only for JetStream (meta, stream, consumer groups); core NATS clustering is a full mesh of routes with no consensus.

### F-STRM-20: ADR-56 wording on scaling an R1 async stream
- Type: contradiction
- Severity: low
- Claims: "Scaling a R1 stream up to greater resiliency levels will fail if the `PersistMode` is not set to `async`" (ADR-56, verbatim) vs "Async persist mode only on file storage, only R1, and not with atomic batch publish" and "persist_mode immutable" (Code — validation rules)
- Verification: server/stream.go:1870-1880 rejects async with `Replicas > 1`, non-file storage, or `AllowAtomicPublish`; server/stream.go:2326 re-runs those checks on update; server/stream.go:2391 rejects any persist_mode change.
- Verdict: RESOLVED — The ADR sentence has the condition inverted: raising replicas on a stream whose persist mode IS async fails, and persist mode cannot be changed afterwards, so an async stream stays R1 for life.

### F-STRM-21: Mirror/source "creates no visible consumer on the origin"
- Type: stale
- Severity: low
- Claims: "Your origin stream ... won't even see a consumer created" (Blog — Mirror Streams; Talk — Mirror Streams Explained; Legacy docs — Source and Mirror Streams "before 2.14") vs "now WorkQueue and Interest retention sources use durable consumers, visible in consumer listings" (Blog — 2.14 Release)
- Verification: server/stream.go:3560-3575 and 4017-4032 create the replication consumer with `Direct: true, Sourcing: true`; `getPublicConsumers` (server/stream.go:8644-8655) hides `Direct` consumers; the non-Limits upgrade clears `Direct` (server/jetstream_api.go:4837-4843), making it a visible durable named `JS_SRC_<id>`/`JS_MIRROR_<id>`.
- Verdict: RESOLVED — For a Limits upstream the consumer is still hidden; for a WorkQueue/Interest upstream on 2.14+ it is a visible durable. Pre-2.14 statements are stale only for the non-Limits case.

### F-STRM-22: Mirror `mirror_direct` participation threshold
- Type: unverifiable
- Severity: low
- Claims: "The mirror only joins the upstream queue group once it has caught up to within a small lag window of the source" (ADR-31; ADR-59)
- Verification: server/jetstream_cluster.go:4109-4131: subscribes when `isCurrent()` or when applied/committed >= 90% (`syncThreshold = 90.0`).
- Verdict: RESOLVED — "Small lag window" means current or at least 90% of committed entries applied; a fresh mirror serves no direct gets until then.

### F-STRM-23: Memory streams and snapshots error text
- Type: wrong
- Severity: low
- Claims: "the backup fails with `memory streams do not support snapshots`" (Learn — Stream backup and restore)
- Verification: server/memstore.go:2384-2386 `memStore.Snapshot` returns `fmt.Errorf("no impl")`; `grep "do not support snapshots" server/*.go` finds nothing.
- Verdict: RESOLVED — Memory streams cannot be snapshotted, but the quoted error string is not the server's (it may be a CLI/client message); a page should not attribute it to the server.

### F-STRM-24: Republish destination constraints
- Type: unverifiable
- Severity: low
- Claims: "Destination MUST have at least 1 non-wildcard token"; "Destination MAY not match or subset the subject filter(s) of the stream" (ADR-28)
- Verification: server/stream.go:2247-2284 checks only that the destination does not collide with any stream subject ("forms a cycle") and that `NewSubjectTransform(src, dest)` is valid; no non-wildcard-token rule is enforced there.
- Verdict: REQUIRES RESOLUTION — The overlap rule is enforced (RESOLVED); the "at least 1 non-wildcard token" rule needs either a check inside `NewSubjectTransform` (server/subject_transform.go) or a maintainer statement before a page presents it as a server rule.

### F-STRM-25: Atomic batch publish and deduplication
- Type: dubious
- Severity: medium
- Claims: "[ANTI] avoid atomic batch when 'message deduplication is required' as it is 'not compatible with batch publishing'" (Blog — Orbit.go guide) vs "Dedup via `Nats-Msg-Id` supported 'Starting from 2.12.1'; duplicates reject the batch" (ADR-50; Blog — Atomic Batch Publishing)
- Verification: server/errors.json 10201 `JSAtomicPublishContainsDuplicateMessageErr` exists at this commit; the "2.12.1" boundary itself was not checked.
- Verdict: RESOLVED — Current servers honour `Nats-Msg-Id` inside atomic batches: a duplicate causes the whole batch to be rejected rather than silently dropping one message. The Orbit statement is stale; only the exact 2.12.1 boundary remains unverified.

### F-STRM-26: Default placement when no cluster is given
- Type: unverifiable
- Severity: low
- Claims: "Default: created in the cluster the client is connected to" (Legacy docs — Streams) vs "random placement when unset" (jsm.go schema)
- Verification: server/jetstream_cluster.go:9655-9665 `createGroupForStream`: `cluster = ci.Cluster` unless `cfg.Placement.Cluster` is set; peers are then chosen within that cluster.
- Verdict: RESOLVED — Replicas are placed in the requesting client's cluster; "random" applies only to which servers inside that cluster are picked.

## Summary

Counts by type: contradiction 14, wrong 3, stale 2, unverifiable 5, dubious 2. Total findings: 26. (F-STRM-7, 9 and 10 are filed as contradictions but each resolves to one source being plainly wrong.)

Counts by verdict: RESOLVED 24, REQUIRES RESOLUTION 2.

| id | title | what would settle it |
|---|---|---|
| F-STRM-16 | Unverified performance and sizing numbers | Maintainer statement or a `nats bench js` run on 2.14 for `sync_interval: always`; 2.9.22 release notes for the storage-format compatibility claim |
| F-STRM-24 | Republish "at least 1 non-wildcard token" rule | Check `NewSubjectTransform` in server/subject_transform.go or ask a maintainer whether the server enforces it |

Ten highest-severity RESOLVED corrections a page author must know:

1. F-STRM-1: MaxConsumers is editable; retention Limits<->Interest is editable and immediately removes already-acked messages; only WorkQueue transitions, storage, name, persist mode, unseal, and turning DenyDelete/DenyPurge/AllowMsgTTL/AllowMsgSchedules back off are locked.
2. F-STRM-2: The only permitted mirror edit (since v2.12.0) is deleting the mirror block to promote it; re-pointing or filtering is rejected with 10055.
3. F-STRM-9: Editing `compression` is accepted but has no effect on the running file store until it is re-created; existing blocks are never rewritten.
4. F-STRM-10: Mirrors never forward writes; they own no subjects and publishing to them by name fails with 10060.
5. F-STRM-4: The stream inbound queue default is 100,000 messages / 128 MiB (`max_buffered_msgs`), not 10,000.
6. F-STRM-5: `allow_batched` (fast batch, 2.14) needs API level 4, not 3.
7. F-STRM-7: Hitting MaxDeliver does not release a message on Interest or WorkQueue streams; it stays until acked/termed via the API, deleted, or limited out.
8. F-STRM-8: 2.14 makes WorkQueue/Interest upstreams safe to source (durable AckFlowControl consumer), but that consumer is still exempt from WorkQueue overlap checks, so a worker and the source can both receive a message.
9. F-STRM-13: Replicas are editable in place; error 10061 is dead code.
10. F-STRM-11 / F-STRM-14: After losing quorum only Direct Get can still answer; an even server count and a missing cluster block are not the hard errors the supercluster narratives claim.


<!-- ===== CONS ===== -->

# Review: CONS

Server source = nats-server @ 8e54a5954 (describes as v2.14.0-410, i.e. main after 2.14.0). Line numbers refer to that commit. jsm.go = /Users/tomaszpietrek/coding/jsm.go. Client sources (nats.go, nats.rs, natscli) are cited where relevant but do not count as RESOLVED under the strict rule; those verdicts say so.

### F-CONS-1: MaxAckPending default (1,000 vs 20,000 vs 65,536 vs 100 vs 500)
- Type: contradiction / stale
- Severity: high
- Claims: "MaxAckPending default is 1000" (Legacy docs — Consumers; Code — consumer defaults; Learn — Reading back the stream) vs "default Max Ack Pending of 20,000" (Legacy docs — JetStream on Leaf Nodes; ADR-13 example) vs "default max ack pending 65536" (Blog — Grokking NATS Consumers intro and queue groups) vs "by default this is actually set to 100" (Talk — The ONE feature) vs "by default it wants to do 500" (Talk — NATS tools and benchmarking)
- Verification: server/consumer.go:579 `JsDefaultMaxAckPending = 1000`, applied at consumer.go:672-680 when `MaxAckPending == 0 && AckPolicy != AckNone`, lowered to server `jetstream.limits.max_ack_pending` or account limit if smaller; stream `consumer_limits.max_ack_pending` applied first (659-663). History: commit e1c581334 (2022-03-29, "[CHANGED] JetStream: lower default consumer's maximum ack pending"), first tag v2.8.0. 65,536: not in server source at any point found; nats.go legacy `js.Subscribe` set MaxAckPending from the subscription's pending limit (nats.go js.go @6b98b3e:1111 `cfg.MaxAckPending = maxMsgs`), i.e. a client-side value. 500 is `nats bench`'s own consumer setting, not a server default.
- Verdict: RESOLVED — Server default is 1,000 since v2.8.0; it was 20,000 before v2.8.0 (2021 CLI output and ADR-13 examples are pre-2.8). 65,536 was a legacy nats.go push-subscribe client default, never a server default. "100" is wrong (likely the speaker's account/server limit, which caps the default per consumer.go:674-679). Authors must state 1,000 and note the limit caps.

### F-CONS-2: AckPolicy default: none vs explicit
- Type: contradiction
- Severity: high
- Claims: "ack_policy default none" (Code — jsm.go schema) vs "AckExplicit default" (Legacy docs — Consumers; Learn — Reading back / Filtering: "Ack Policy Explicit" default output; Talk — The ONE feature "explicit (default)")
- Verification: jsm.go schema_source/jetstream/api/v1/definitions.json:767 `"default": "none"`; server/consumer.go:333-355 AckPolicy zero value is AckNone, and setConsumerConfigDefaults (630-700) sets no ack-policy default. Client/CLI layer: natscli cli/consumer_command.go:1736 `dflt = "explicit"` (interactive prompt), and the CLI output in the Learn pages shows explicit because the CLI sends it. Server forces explicit (or flow_control) only on WorkQueue streams (consumer.go:1140-1146).
- Verdict: RESOLVED — On the wire the server default is `none`. `explicit` is the default the CLI and modern clients send. Pages must say "the CLI/clients default to explicit; a raw API request that omits ack_policy gets none".

### F-CONS-3: Pull consumers "must be explicit ack"
- Type: stale / wrong
- Severity: high
- Claims: "AckExplicit is the only supported option for pull-based Consumers" (Legacy docs — JetStream Model Deep Dive); "since we're using a pull consumer we actually have to choose the explicit policy" (Talk — Move over Kafka) vs "AckAll ... for pull consumers all pending messages for all subscribers" (Legacy docs — Consumers); errors.json 10084 "consumer in pull mode requires explicit ack policy on workqueue stream" (Code — error catalogue)
- Verification: server/consumer.go:811-814 pull mode rejects AckNone only when the stream is WorkQueue (`NewJSConsumerPullRequiresAckError`); consumer.go:1140-1146 additionally requires AckExplicit or AckFlowControl for every non-Direct/non-Sourcing consumer (push or pull) on a WorkQueue stream (`NewJSConsumerWQRequiresExplicitAckError`). No other restriction: pull consumers may be AckNone or AckAll on Limits/Interest streams.
- Verdict: RESOLVED — Pull consumers accept none/all/explicit. Only WorkQueue streams force explicit (or flow_control), and that applies to push consumers too. The Model Deep Dive and the talk are stale.

### F-CONS-4: "All pull subscribers have to be durable"
- Type: stale
- Severity: medium
- Claims: "all pull subscribers have to be durable" (ADR-13); error 10085 "consumer in pull mode requires a durable name" (Code — error catalogue) vs ephemeral pull consumers with InactiveThreshold (Learn — Pull consumers; NATS by Example — Pull Consumers; Code — consumer defaults "pull consumers with an explicit threshold also get jitter")
- Verification: `grep NewJSConsumerPullNotDurableError server/` finds no caller (only the constant in errors.json/jetstream_errors_generated.go); server/consumer.go:1461-1481 `updateInactiveThreshold` has an explicit pull-mode branch for ephemerals. The error constant was last touched by 76ab1b8d1 (2021-08-04) and is dead code.
- Verdict: RESOLVED — Ephemeral (non-durable) pull consumers are supported; error 10085 is unused. ADR-13 is superseded (as the dump notes, by ADR-37).

### F-CONS-5: Does BackOff apply to NAK?
- Type: contradiction / wrong
- Severity: high
- Claims: "backoff: List of durations ... retry time scale for NaK'd messages" (Code — jsm.go schema) vs "not applied to nak (nak = immediate redelivery unless nakWithDelay)" (Legacy docs — Consumers) and "A consumer backoff ... doesn't slow a nak" (Learn — Ack responses and redelivery)
- Verification: server/consumer.go:3163-3236 `processNak`: with no delay argument the sequence is put straight on the redeliver queue (`o.addToRedeliverQueue(sseq)` + `signalNewMessages`); with `-NAK {"delay":..}` or `-NAK 5s` the pending timestamp is set to `now - AckWait + delay` (3215-3217). `BackOff` is consulted only in `checkPending` (6003-6030). Nothing in processNak reads `o.cfg.BackOff`.
- Verdict: RESOLVED — BackOff shapes AckWait-expiry redeliveries only. A plain NAK redelivers immediately; a delayed NAK uses its own delay. The jsm.go schema description is wrong.

### F-CONS-6: BackOff semantics details (overrides MaxDeliver? index alignment? redelivery count in example)
- Type: contradiction / low precision
- Severity: low
- Claims: code comment "If BackOff was specified that will override the AckWait and the MaxDeliver" (Code — consumer defaults) vs "length must be <= MaxDeliver" (Legacy docs — Consumers; Code — validation); Learn "1s before the second delivery, 5s before the third ... server reuses the last entry" vs Legacy example "MaxDeliver=5 backoff=[5s,30s,300s,3600s,84000s] redelivers 5 times over one day"
- Verification: server/consumer.go:653-658 only sets `config.AckWait = config.BackOff[0]`; MaxDeliver is not modified (comment is stale). 782-783 rejects `len(BackOff) > MaxDeliver` when MaxDeliver != -1. 6013-6027: deadline for a pending message = `BackOff[dc]` where dc = current redelivery count (0 for the first delivery), clamped to the last element. So BackOff[0] is the wait before the 2nd delivery, BackOff[1] before the 3rd, and the last entry repeats.
- Verdict: RESOLVED — Learn wording is correct. The code comment about MaxDeliver is stale. The legacy example yields 5 deliveries = 4 redeliveries (the 5th backoff entry is never waited out because MaxDeliver stops at 5); say "delivers up to 5 times" not "redelivers 5 times".

### F-CONS-7: What happens to a message that hits MaxDeliver on WorkQueue/Interest streams
- Type: contradiction / stale
- Severity: high
- Claims: "will remain in the stream and must be manually deleted" (Legacy docs — Streams; JetStream Consumers dev guide; Talk — Rethink Connectivity ep 12; derekcollison issue #4998) vs "for each consumer ... acks the message, terminates it, or the max redelivery has been reached" releases interest (NATS by Example — Interest-based Stream) vs "the original message ... gets removed from the source stream after hitting max_deliver" (asker, GitHub — Automatic Message Payload Preservation, 2025-11) vs "stays ... verified on 2.12.4 R1, suspected loss on R3" (jgriegershs, same thread)
- Verification: server/consumer.go:2358-2387 `hasMaxDeliveries` emits the advisory once, deletes the pending entry, moves the ack floor, and keeps `o.rdc[seq]`; it never calls `mset.ackMsg`. consumer.go:3908-3913 `needAck`: "If the message is not pending, it should be preserved if it reached max delivery" — interest is kept via the rdc entry. That line was added by commit 6caa8580e (2025-02-24, "[FIXED] Preserve max delivered messages"), first tag v2.11.0, fixing nats-server issue #6538 where ripienaar (2025-02-24) confirmed: "The message is retained because this consumer did not satisfy interest but then a new consumer that consumes this message will delete it rather than retain it" (https://github.com/nats-io/nats-server/issues/6538). derekcollison on #4998 (2024-01-25): "This works as designed. We do not remove it so that users can process the exception, e.g DLQ." (https://github.com/nats-io/nats-server/issues/4998)
- Verdict: RESOLVED — Intended and (since v2.11.0) actual behaviour: the message stays in the stream; the consumer's ack floor moves past it, the advisory fires, and the consumer keeps a redelivered marker that preserves interest. Before v2.11.0, on Interest (and by the same code path WorkQueue) streams a later ack from another consumer, `nats stream view`, or an interest-state reconciliation could delete it. The by-example sentence "or the max redelivery has been reached" describing interest release is wrong for ≥2.11 and describes the pre-2.11 bug.

### F-CONS-8: MaxDeliver / advisory processing only when clients fetch
- Type: stale
- Severity: medium
- Claims: "Redelivery/MaxDeliver processing for pull consumers happens when clients fetch; with zero fetchers a message sits in AckPending after AckWait (issue 1716, by design)" (GitHub — AckWait does not publish to DLQ with zero clients, 2024-01) vs "Max-deliveries check moved from getNextMsg to checkPending because pull consumers would require a new pull request to be present" (Code — consumer defaults)
- Verification: server/consumer.go:6053-6060 `checkPending` calls `hasMaxDeliveries(seq)` when AckWait elapses, independent of waiting pull requests; commit bd3be7504 (2024-10-12, "Process max delivery boundaries when expiring vs always putting back on the redelivered queue"), first tag v2.11.0.
- Verdict: RESOLVED — Since v2.11.0 the max-deliveries advisory fires on AckWait expiry even with no client pulling. The 2024-01 thread describes ≤2.10 behaviour.

### F-CONS-9: Default consumer replicas for ephemerals
- Type: contradiction
- Severity: medium
- Claims: "By default consumers have the same replication factor as the stream" (Legacy docs — Consumers; Learn — Surviving node loss; Talk — EP09) vs "ephemerals will default to R1 unless the stream has WorkQueue or Interest retention" (derekcollison, https://github.com/nats-io/nats-server/discussions/3210) vs "Ephemeral consumers are in-memory R1" (Talk — The ONE feature)
- Verification: server/consumer.go:402-411 `replicas()`: if `Replicas == 0` and the consumer is not durable (`Durable == ""`, consumer.go:6362-6364) and the stream is Limits retention → 1; otherwise the stream's replica count. Storage: jetstream_cluster.go:10873-10876 uses the stream's storage unless `MemoryStorage` is set; nothing makes ephemerals memory-backed by default.
- Verdict: RESOLVED — Durables (and any consumer on Interest/WorkQueue streams) inherit the stream's replicas; ephemerals on Limits streams default to R1. Ephemerals are not memory-backed unless `mem_storage` is set. Note that a consumer with `name` but no `durable_name` counts as ephemeral for this rule.

### F-CONS-10: InactiveThreshold default for durables
- Type: wrong
- Severity: medium
- Claims: "`InactiveThreshold` (default five seconds) now also applies to durable consumers" (Blog — NATS Server 2.9 Release) vs "Durable consumers are never removed automatically regardless of InactiveThreshold" / "can be omitted for durable consumers" (NATS by Example — Pull Consumers; Migration)
- Verification: server/consumer.go:1461-1481 `updateInactiveThreshold`: default 5 s (+100 ms..1 s jitter) only when `!o.isDurable() && cfg.InactiveThreshold <= 0`; durables with 0 get `o.dthresh = 0` (never). Jarema (nats.go discussion "Auto deletion of inactive durable consumers", 2024-10-10) confirms durables may set it: "That is correct."
- Verdict: RESOLVED — Durables can set InactiveThreshold since 2.9, but there is no default for them; only ephemerals get the 5 s default. By-example is right; the 2.9 blog sentence is wrong as worded.

### F-CONS-11: Is MemoryStorage editable after creation?
- Type: contradiction
- Severity: medium
- Claims: "Consumer `Replicas`, `MemoryStorage`, `FilterSubject` editable after creation" (Blog — NATS Server 2.9 Release) vs "Not editable: ... MemoryStorage" (Legacy docs — Consumers) and "Immutable on consumer update: ... storage type (memory)" (Code — validation)
- Verification: server/consumer.go:2475-2477 `checkNewConsumerConfig`: "storage type can not be updated". That check was added by commit aa59c80df (2026-07-15, "[FIXED] Reject consumer storage type update"), which is after v2.14.0 (`git describe` = v2.14.0-410). Before it the server did not reject a changed `mem_storage`; whether the change took effect is not verified here. Replicas and filters are updatable (2621 + cluster path; 2626-2670).
- Verdict: RESOLVED — MemoryStorage is immutable; on the next release after 2.14.0 the server rejects the edit with "storage type can not be updated", and on 2.9–2.14 the edit was accepted without being enforced as a storage change. Replicas and FilterSubject(s) are editable as the 2.9 blog says.

### F-CONS-12: Can the priority policy be changed on a live consumer?
- Type: contradiction / stale
- Severity: medium
- Claims: "we cannot support updating a consumer from one with groups to one without and vice versa ... We also cannot switch between different policies. Only `PriorityTimeout` is updatable" (ADR-42) vs "The server lets you switch a live consumer's priority policy (via a full `--config`)" (Learn — Priority groups)
- Verification: server/consumer.go:2467-2525 `checkNewConsumerConfig` lists every immutable field; `PriorityPolicy`, `PriorityGroups`, `PinnedTTL` are not among them, and `updateConfig` copies the new config wholesale (2621). Any pinned state is not reset by updateConfig (no `currentPinId` handling in 2531-2680).
- Verdict: RESOLVED — The server accepts policy/group changes on update (ADR-42 is aspirational). Pages should say it is accepted, and warn that runtime pin state is not explicitly reset by the update (not verified beyond the absence of code).

### F-CONS-13: More than one priority group per consumer
- Type: contradiction
- Severity: medium
- Claims: "limit `PriorityGroups` to one per consumer only and error should one be made with multiple groups" (ADR-42; Talk — 2.11 release "only one group per consumer") vs "naming more than one is accepted but only the first takes effect" (Learn — Priority groups)
- Verification: server/consumer.go:974-989 validates that at least one group exists and each name matches `validGroupName`; there is no `len > 1` check. Pull requests are validated with `slices.Contains(o.cfg.PriorityGroups, priorityGroup.Group)` (4641), so pulls naming any listed group are accepted. Consumer info reports state only for `PriorityGroups[0]` (3477-3479) and there is a single `o.currentPinId` (4333).
- Verdict: RESOLVED — Multiple groups are accepted, not rejected. "Only the first takes effect" is imprecise: pulls for any listed group are served, but the server keeps one pin and reports one group's state. Authors should say "configure exactly one group; behaviour with several is undefined and unreported for groups after the first".

### F-CONS-14: Do priority groups require AckExplicit?
- Type: contradiction
- Severity: medium
- Claims: "Requires `AckPolicy: explicit` (pedantic mode errors otherwise)" (ADR-42); "configuring them ... with any other ack policy is an error" (Talk — Priority Groups video) vs "shipped validation does not currently reject other ack policies" (Blog — Pull Consumer Priority Groups) vs "prioritized needs no acks" (Learn — Priority groups)
- Verification: server/consumer.go:974-998 (priority validation) has no ack-policy condition; no pedantic ack check for priority exists in consumer.go or jetstream_api.go (grep for PriorityPolicy near AckPolicy/pedantic: none). Overflow's `min_ack_pending` (4622) is meaningless without acks but is not enforced.
- Verdict: RESOLVED — The server does not enforce an ack policy for any priority policy. The video is wrong; the ADR describes intent. Docs should recommend explicit ack for overflow/pinned (their thresholds and pin timeouts depend on ack state) rather than claim the server rejects otherwise.

### F-CONS-15: "Every pull must name its group" once a policy is set
- Type: unverifiable nuance
- Severity: low
- Claims: "a pull without one is rejected with `Bad Request - Priority Group missing`" (Learn — Priority groups)
- Verification: server/consumer.go:4636-4639 returns that error only when `priorityGroup != nil`; `nextReqFromMsg` (3935-3969) returns a nil group for an empty payload or a bare integer batch (legacy pull forms), so those bypass the check and are served as unpinned pulls.
- Verdict: RESOLVED — True for JSON pull requests (every modern client); legacy empty/numeric pulls are not rejected. Docs can keep the statement but should not claim raw legacy pulls fail.

### F-CONS-16: Status when MaxWaiting is exceeded: 408 vs 409 vs "ignored"
- Type: stale / contradiction
- Severity: medium
- Claims: "`408 Request Timeout` when too many inflight pull requests" (ADR-13); "pulls received after this is reached are ignored" (Code — jsm.go schema max_waiting) vs "`409 Exceeded MaxWaiting` is transient" (GitHub — ADR issues 112/116) and "Extra concurrent fetches beyond the limit error" (NATS by Example — Applying Limits)
- Verification: server/consumer.go:4699 and 4710 `sendErr(409, "Exceeded MaxWaiting")`, suppressed when the request carries an idle heartbeat (4706-4709). 408 is used for expiry ("Request Timeout", 4449/4999) and for no_wait "Requests Pending" (4680).
- Verdict: RESOLVED — Exceeding MaxWaiting returns `409 Exceeded MaxWaiting` (silently dropped only if the pull set `idle_heartbeat`). ADR-13's 408 and the jsm.go "ignored" wording are stale.

### F-CONS-17: no_wait pulls and MaxAckPending: "409 when MaxAckPending reached"
- Type: wrong
- Severity: low
- Claims: "`{\"batch\": n, \"no_wait\": true}` (404 status when empty, 409 when MaxAckPending reached)" (Legacy docs — NATS API Reference)
- Verification: server/consumer.go:4660-4690: no_wait with nothing pending and no expiry → `404 No Messages`; pending exists but is smaller than what earlier requests already claim → `408 Requests Pending`; otherwise the request is queued as a one-shot. No 409 path keyed on MaxAckPending exists (all 409 strings: 53, 3134, 3151, 4413, 4517, 4594-4617, 4699, 4710).
- Verdict: RESOLVED — There is no MaxAckPending 409 for no_wait pulls; when the consumer is at MaxAckPending the request simply waits (or 404s if nothing is pending at all).

### F-CONS-18: ADR-34 error codes for multiple filters
- Type: wrong
- Severity: low
- Claims: "overlapping subjects, error (10136)"; "only one of filter_subject/filter_subjects (error 10134)"; "old API only (error 10135)" (ADR-34) vs error catalogue (Code — server/errors.json)
- Verification: server/errors.json: 10134 = JSConsumerReplicasShouldMatchStream; 10135 = JSConsumerMetadataLengthErrF; 10136 = JSConsumerDuplicateFilterSubjects (both fields set); 10137 = JSConsumerMultipleFiltersNotAllowed (subject-based create API, still enforced at jetstream_api.go:4797-4800); 10138 = JSConsumerOverlappingSubjectFilters.
- Verdict: RESOLVED — Use 10136 (both fields), 10137 (filter-in-subject API), 10138 (overlap). ADR-34's numbers are wrong.

### F-CONS-19: ReplayPolicy only on push consumers
- Type: wrong / stale
- Severity: medium
- Claims: "You can only set ReplayPolicy on push-based Consumers" (Legacy docs — JetStream Model Deep Dive) vs ReplayPolicy as a general option (Legacy docs — Consumers; Learn — Reading back; Talk — Move over Kafka "pull ... replay policy can be instant or original")
- Verification: server/consumer.go:1831-1833 sets `o.replay = true` for any consumer with `ReplayPolicy != ReplayInstant`; the pacing delay in loopAndGatherMsgs (5421-5432) is not gated on push mode; checkConsumerCfg (700-1005) has no pull/replay restriction.
- Verdict: RESOLVED — ReplayOriginal works on pull consumers too. The Model Deep Dive is stale.

### F-CONS-20: Where consumer info requests are served
- Type: wrong
- Severity: medium
- Claims: "Consumer info requests go to the meta-leader and involve expensive state calculation" (Blog — JetStream Anti-Patterns) vs "Reading from consumers is always done from the leader" (derekcollison, GitHub — Produce from anywhere)
- Verification: server/jetstream_api.go:5150-5260 `jsConsumerInfoRequest`: "We have the consumer assigned and a leader, so only the consumer leader should answer"; the meta leader replies only when the consumer is unknown or all peers are offline.
- Verdict: RESOLVED — Consumer info is answered by the consumer leader, not the meta leader. The blog's cost argument (state calculation per call) stands; its routing claim does not.

### F-CONS-21: Meaning of `num_redelivered`
- Type: contradiction
- Severity: medium
- Claims: "`num_redelivered` (currently tracked as delivered more than once — not a lifetime tally; it drops when the message is finally acked)" (Learn — JetStream health) vs "'Redelivered' counts in consumer info are server-lifetime counters; consumer state persists across restarts but the counter resets" (derekcollison, GitHub — Clarification for Ack Sequence, 2024-08-02: "That reporting is tied to server lifetime but the consumer state is persisted")
- Verification: server/consumer.go:3514 `NumRedelivered: len(o.rdc)` on the leader, 3550 `len(state.Redelivered)` from the persisted store otherwise; entries deleted on ack (3701, and 3722 for AckAll) and kept for max-delivered messages (2383). `rdc` is part of persisted consumer state (`state.Redelivered`).
- Verdict: RESOLVED — `num_redelivered` is the number of messages currently marked redelivered (persisted with consumer state, removed on ack/term), not a lifetime counter. The maintainer's 2024 remark does not match the code at this commit.

### F-CONS-22: Ephemeral consumer state "server memory only"
- Type: wrong
- Severity: low
- Claims: "Ephemeral consumers have no persisted state or fault tolerance (server memory only)" (Legacy docs — Consumers); "Ephemeral consumers are in-memory R1" (Talk — The ONE feature)
- Verification: jetstream_cluster.go:10873-10876 storage = stream storage unless `cfg.MemoryStorage`; the server's own ephemeral mirror consumer config (stream.go:3560-3575) sets no MemoryStorage. R1 default only on Limits streams (consumer.go:402-411).
- Verdict: RESOLVED — Ephemerals use the stream's storage type unless `mem_storage` is set; they are R1 by default only on Limits streams. "Memory only" is wrong.

### F-CONS-23: Direct/sourcing consumers and WorkQueue overlap checks (mirror of a WQ stream)
- Type: contradiction / stale
- Severity: medium
- Claims: "Direct consumers must be push and ephemeral" (Code — validation) vs ADR-60 "upgrade to a durable consumer ... JS_MIRROR_<suffix>" vs "the mirror's hidden internal consumer is a direct consumer that bypasses the work queue's subject-overlap check" (Learn — Mirrors as a DR tool)
- Verification: server/stream.go:3560-3575 mirror consumer = `Name: JS_MIRROR_<id>`, `Direct: true`, `Sourcing: true`, AckNone, MaxDeliver 1, InactiveThreshold set; a `Name` without `Durable` is not "durable" for the server (consumer.go:6362-6364), so `Direct` is legal. consumer.go:1140 skips all WorkQueue checks (ack policy, DeliverAll, uniqueness) for `config.Direct || config.Sourcing`. 2.14 durable sourcing requires AckFlowControl (stream.go:3772; API level 4, 3680).
- Verdict: RESOLVED — Both the classic direct consumer and the 2.14 sourcing/AckFlowControl consumer bypass WorkQueue uniqueness, so the DR warning holds on 2.14. ADR-60's "durable" means a named consumer with retained state, not `durable_name`.

### F-CONS-24: Ordered consumer configuration (ADR-17 push era vs current pull-based)
- Type: stale
- Severity: medium
- Claims: "Forced config: ack_policy none, max_deliver 1, flow_control true, mem_storage true, num_replicas 1; idle_heartbeat 5s, ack_wait 22 hours" and "ordered push subscription" (ADR-17); "Ordered consumers: ... automatic flow control" (Legacy docs — Consumers) vs "AckPolicy none, memory storage, one replica, inactivity threshold of five minutes" pull-based (Learn — Ordered consumers; Talk — EP09 "R1 no acknowledgement")
- Verification: Server has no ordered-consumer concept (client construct; Jarema, nats.go discussion "OrderedConsumer Usage"). Client source nats.go jetstream/ordered.go:634-638 (`AckPolicy: AckNonePolicy, InactiveThreshold: 5*time.Minute, Replicas: 1, MemoryStorage: true`) matches the Learn page; flow control/heartbeat are push-only fields and are rejected on pull consumers (consumer.go:822-826).
- Verdict: REQUIRES RESOLUTION — Client-side fact; nats.go source supports the Learn page and marks ADR-17 as the legacy push design, but under the strict rule a maintainer statement or an ADR update is needed to call ADR-17 superseded. Ask piotrpio/Jarema or cite ADR-37/ordered-consumer ADR revision.

### F-CONS-25: Which clients implement the pinned-client loop
- Type: unverifiable
- Severity: medium
- Claims: "The pinned-client loop ... runs in Go, Java, JavaScript/TypeScript, and .NET; Rust and Python let you set config fields but don't run the client-side pinning loop" (Learn — Priority groups); "pinning ships in Go first" (Talk — 2.11 release)
- Verification: nats.rs @7b0fa6af (2026-08-27): `Nats-Pin-Id`/pin id appears nowhere in async-nats/src/jetstream/consumer (only the `PinnedClient` enum in mod.rs:439-441). nats.py: new layout (nats-jetstream), no `pin_id`/`Nats-Pin` hit. No maintainer statement in the threads.
- Verdict: REQUIRES RESOLUTION — Client repos support the claim as of 2026-08 but this is a moving target; confirm with Jarema (Rust) and the Python maintainer before publishing a support matrix, or phrase as "at time of writing".

### F-CONS-26: Push flow control: "MaxAckPending is the only form of flow control"
- Type: contradiction (internal)
- Severity: low
- Claims: "For push consumers, MaxAckPending is the only form of flow control" (Legacy docs — Consumers; Blog — Streams, Consumers, Durable Messaging) vs "FlowControl is per-subscription sliding-window working with MaxAckPending" (same Legacy page) and ADR-15/ADR-9 flow control
- Verification: server/consumer.go:956-957 (FlowControl requires Heartbeat), 577 `JsFlowControlMaxPending = 32 MiB`, 1793 applied for push consumers; stream.go:662 `Nats-Consumer-Stalled` header.
- Verdict: RESOLVED — Push consumers have MaxAckPending plus the optional FlowControl/Heartbeat byte-window protocol. Delete the "only" sentence.

### F-CONS-27: Ephemeral queue push consumers "not supported as of 2.8.4"
- Type: unverifiable
- Severity: low
- Claims: "As of NATS server v2.8.4, ephemeral queue push consumers are not supported; the server does not track them" (NATS by Example — Queue Push Consumers)
- Verification: server/consumer.go checkConsumerCfg (700-1005) contains no DeliverGroup/durable coupling; the restriction, if any, is in the clients (nats.go js.go:112 "If no optional durable name ... the queue name will be used as a durable name"). No maintainer statement found.
- Verdict: REQUIRES RESOLUTION — The server does not reject an ephemeral push consumer with a deliver group; whether clients refuse it is a client rule. Since push consumers are legacy, recommend dropping the claim rather than resolving it.

### F-CONS-28: Consumer reset (start-sequence reset) availability
- Type: stale
- Severity: medium
- Claims: "Start options are used once at creation; resetting means blowing away consumer state, so delete and recreate" (ripienaar, GitHub — Ability to reset consumer start sequence; neilalexander: a native reset would be safer) vs "`$JS.API.CONSUMER.RESET` resets a consumer to a sequence/timestamp" (Legacy docs — NATS API Reference; ADR-60)
- Verification: server/jetstream_api.go:159 `JSApiConsumerResetT`, 824-836 request/response types; added by eb2ce117d (2025-10-29, "(2.14) Reset consumer to new starting sequence"), first tag v2.14.0. Legacy docs' "timestamp" and "original start" options: the request struct has only `seq` (826); resetting by time is not in the API type.
- Verdict: RESOLVED — Native reset exists from v2.14.0 (API level 4) and takes a sequence only. The delete-and-recreate advice is pre-2.14. The legacy API reference's "timestamp" option is not present in the request type at this commit; treat that part as unverified.

### F-CONS-29: `$JS.ACK` domain awareness
- Type: unverifiable
- Severity: low
- Claims: "ACK and MSG gets ... are not domain aware. We plan to fix for sure." (derekcollison, https://github.com/nats-io/nats-server/discussions/6136, 2024-11-15) vs v2 ack reply subject encodes `<domain>.<account hash>` (ADR-15; Code — expectedNumReplyTokensV2 = 11)
- Verification: server/consumer.go:6130-6149 accepts 9-token (v1) or ≥11-token (v2, domain in token 3) ack subjects. The maintainer statement is about API routing across leaf-node domains, not subject format; no later statement or commit found closing it.
- Verdict: REQUIRES RESOLUTION — Both true at different layers; whether the routing gap was fixed after 2024-11 is unknown. Check discussion 6136 for a follow-up or ask derekcollison before documenting cross-domain acks.

### F-CONS-30: Consumer create on an existing name with a different config
- Type: contradiction (API-dependent)
- Severity: medium
- Claims: "Consumer create is idempotent: ... if configs differ it updates, unless a non-editable field is changed" (Blog — JetStream Anti-Patterns) vs "Create with action=create on an existing consumer with a different config fails with 'consumer already exists'" (Code — validation) and "Reusing a durable name with a different config returns consumer already exists" (Learn — Reading back)
- Verification: server/consumer.go:1088-1112: `action == ActionCreate` with an existing consumer and differing config → `NewJSConsumerAlreadyExistsError` (10148); without the action (legacy create / create-or-update) the server calls `eo.updateConfig(config)` which succeeds unless an immutable field changed (2467-2525).
- Verdict: RESOLVED — Behaviour depends on the request `action`: `create` refuses a differing config, `update` requires existence, no action = create-or-update. Both sources are right for their API; docs must name the action.

### F-CONS-31: MaxWaiting on update: "no-op" vs error
- Type: contradiction (internal to code)
- Severity: low
- Claims: "Allowed but considered no-op, [Description, SampleFrequency, MaxWaiting, HeadersOnly]" (Code — consumer.go:2621 comment) vs "MaxWaiting cannot be updated" (NATS by Example — Applying Limits; Legacy docs — Consumers)
- Verification: server/consumer.go:2510-2512 rejects a changed MaxWaiting with "max waiting can not be updated" before the comment is reached; SampleFrequency is actually applied (2586-2591).
- Verdict: RESOLVED — MaxWaiting is immutable (error on change); the code comment is stale. SampleFrequency is live-updated, not a no-op.

### F-CONS-32: Legacy "not editable" list vs actual immutables
- Type: stale
- Severity: low
- Claims: "Not editable: Durable, AckPolicy, DeliverPolicy, OptStartSeq/Time, ReplayPolicy, MemoryStorage, MaxWaiting, DeliverSubject" (Legacy docs — Consumers) vs code list "deliver policy, storage, start seq/time, ack policy, replay policy, heartbeat, flow control, max waiting; can not switch pull<->push; deliver subject updatable push->push" (Code — validation)
- Verification: server/consumer.go:2467-2512: DeliverSubject may change for push consumers when the new subject has no existing interest (2497-2507); Heartbeat (2488) and FlowControl (2491) are immutable and missing from the legacy list.
- Verdict: RESOLVED — Add Heartbeat and FlowControl to the immutable list; DeliverSubject is editable push→push.

### F-CONS-33: "first-per-subject" replay option
- Type: wrong
- Severity: low
- Claims: "JetStream adds last-per-subject, first-per-subject, by-time ..." (Talk — NATS & Kafka Compared Pt 2)
- Verification: server/consumer.go:296-325 deliver policies: all, last, new, by_start_sequence, by_start_time, last_per_subject. No first-per-subject.
- Verdict: RESOLVED — There is no first-per-subject deliver policy.

### F-CONS-34: NATS Explorer "moved to a dead-letter subject or dropped" after max_deliver
- Type: dubious (confirmed wrong)
- Severity: medium
- Claims: "[DUBIOUS] exceeded messages are moved to a dead-letter subject or dropped" (Blog — NATS Explorer) vs "We do not have automated DLQs" (derekcollison, https://github.com/nats-io/nats-server/discussions/4994)
- Verification: server/consumer.go:2358-2387 only publishes the MAX_DELIVERIES advisory (4775-4789) and drops the message from the consumer's pending set; the stream is untouched (see F-CONS-7).
- Verdict: RESOLVED — Wrong. Nothing is moved; the message stays in the stream and only an advisory is published.

### F-CONS-35: "Prefer AckAll for bulk processing"
- Type: dubious
- Severity: medium
- Claims: "[DUBIOUS] Prefer AckAll acknowledgment strategy for bulk processing" (Blog — Deploying a scalable NATS cluster part 1) vs "AckAll ... only fits a consumer that processes strictly in order (MaxAckPending 1), otherwise acking message 10 also retires a failed message 7 waiting for redelivery. silent data loss" (Learn — Ack responses)
- Verification: server/consumer.go:3706-3740 AckAll branch removes every pending entry with `seq <= sseq`, including entries on the redeliver queue and their `rdc` records. So an AckAll ack after a higher sequence discards earlier unacked/nak'd deliveries.
- Verdict: RESOLVED — Not wrong in the single-ordered-worker case (natscli help text says the same), but dangerous with several workers or any redelivery. Docs should present AckAll as "in-order single consumer only", not a bulk-processing default.

### F-CONS-36: Push-first consumer guidance
- Type: dubious (confirmed stale)
- Severity: low
- Claims: "[DUBIOUS] Push for real-time low-latency; pull when backpressure control or batch processing is needed" (Blog — How to Build NATS Consumers); "Applications typically use ephemeral ordered push consumers" (Legacy docs — Anatomy) vs "new JetStream API is built on pull consumers ... new features (overflow, priority groups, pinning) are pull-only" (Jarema, nats.go discussion — How to create queue group consumer with new jetstream api) and "We recommend pull consumers for new projects" (Legacy docs — Consumers)
- Verification: Jarema statement above; server/consumer.go:974-977 priority groups rejected on push; consumer pause and AckFlowControl aside, no new pull-only feature is available on push.
- Verdict: RESOLVED — Recommend pull; push is legacy. The blog's split is stale, and its "MaxAckPending 1000 for push" example is fine but incidental.

### F-CONS-37: Blog typo in overflow threshold semantics
- Type: wrong (typo)
- Severity: low
- Claims: "num_ack_pending ... is at least min_pending" (Blog — Pull Consumer Priority Groups) vs "num_ack_pending >= min_ack_pending" (ADR-42)
- Verification: server/consumer.go:4622 `priorityGroup.MinPending != 0 || priorityGroup.MinAckPending != 0` — two distinct fields.
- Verdict: RESOLVED — Use `min_ack_pending` for the ack-pending threshold.

### F-CONS-38: ADR-42 `failover` pull field
- Type: stale
- Severity: low
- Claims: "`failover` (seconds; min 5, max 3600 ...)" (ADR-42) vs "As of NATS Server 2.14 the `failover` option is not implemented" (same ADR page note) and Learn checklist "the ADR-42 `failover` timer isn't shipped yet"
- Verification: `grep -n Failover server/consumer.go` → none; PriorityGroup fields used: Group, MinPending, MinAckPending, Id, Priority (4622-4650).
- Verdict: RESOLVED — Not implemented at this commit; keep the Learn wording.

### F-CONS-39: Required API level for the prioritized policy
- Type: unverifiable / inconsistency
- Severity: low
- Claims: "priority groups/policy/pinned TTL (2.11) = level 1" (Code — versioning) vs "Prioritized (2.12+)" (Blog; Talk)
- Verification: server/jetstream_versioning.go:162-164 tags any non-none PriorityPolicy as requiring level 1, including `prioritized`, which a 2.11 server cannot parse (2.12 feature). No maintainer statement.
- Verdict: REQUIRES RESOLUTION — `_nats.req.level` under-reports for prioritized consumers; confirm with the server team whether that is intended before documenting required levels per policy.

### F-CONS-40: MQTT `consumer_replicas: 1` under an R5 stream vs "replicas must match on Interest/WorkQueue"
- Type: unverifiable
- Severity: low
- Claims: "`mqtt { stream_replicas: 5, consumer_replicas: 1 }` lets consumers be R1 under an R5 stream" (kozlovic, GitHub — MQTT support should be horizontally scalable) vs "On Interest or WorkQueue retention streams, consumer replicas MUST equal stream replicas" (Code — validation, consumer.go:728-736)
- Verification: The validation is unconditional for user consumers; whether MQTT's internal streams are Interest retention or whether MQTT creates consumers through a path that bypasses this check was not verified.
- Verdict: REQUIRES RESOLUTION — Inspect server/mqtt.go retention settings for `$MQTT_msgs`/`$MQTT_sess` and the consumer creation path; until then do not generalize the MQTT statement to user consumers.

### F-CONS-41: Grokking "delivery happens on the deliver subject" / "PushBound" and other push-era details
- Type: stale (informational)
- Severity: low
- Claims: Push-consumer defaults and mechanics in "Grokking NATS Consumers" (2021) and by-example "Push Consumers (legacy)"
- Verification: Push consumers still exist in the server (consumer.go:791-809) but all client guidance and new features target pull (F-CONS-36).
- Verdict: RESOLVED — Keep as legacy background only; do not source defaults from these pages (see F-CONS-1).

## Summary

Counts by type: contradiction 15, wrong 8, stale 9, unverifiable 6, dubious 3 (some findings carry two labels; primary label counted).

Counts by verdict: RESOLVED 35, REQUIRES RESOLUTION 6.

| Finding | Topic | What would settle it |
|---|---|---|
| F-CONS-24 | Ordered consumer config is pull-based (nats.go) vs ADR-17 push design | Maintainer statement or ADR revision marking ADR-17 superseded; nats.go jetstream/ordered.go:634-638 already supports the Learn page |
| F-CONS-25 | Which clients run the pinned-client loop (Rust/Python missing) | Maintainer confirmation per client (Jarema for nats.rs, Python maintainer); re-check at publish time |
| F-CONS-27 | "Ephemeral queue push consumers unsupported" | Client-side rule; server does not reject. Recommend dropping the claim (push is legacy) |
| F-CONS-29 | `$JS.ACK` cross-domain routing "will fix" (2024-11) | Follow-up on discussion 6136 or a commit; subject format already carries the domain |
| F-CONS-39 | `prioritized` policy tagged as API level 1 though it is a 2.12 feature | Server-team confirmation (jetstream_versioning.go:162-164) |
| F-CONS-40 | MQTT R1 consumers under R5 Interest stream vs mandatory replica match | Read server/mqtt.go retention + consumer creation path |

Ten highest-severity RESOLVED corrections a page author must know:

1. MaxAckPending default is 1,000 (since v2.8.0), capped by server/account/stream limits; 20,000 is pre-2.8, 65,536 was a legacy nats.go client default, 100 and 500 are not server defaults (F-CONS-1).
2. The wire default ack policy is `none`; `explicit` is what the CLI and clients send. Only WorkQueue streams force explicit/flow_control, for push and pull alike (F-CONS-2, F-CONS-3).
3. BackOff never affects a NAK. Plain NAK redelivers immediately; NAK with delay uses its own delay; BackOff shapes AckWait-expiry redeliveries, indexed by redelivery count and clamped to the last entry (F-CONS-5, F-CONS-6).
4. A message that exhausts MaxDeliver stays in the stream on every retention policy; since v2.11.0 the consumer keeps a redelivered marker so other consumers cannot delete it. Pre-2.11 Interest/WQ streams could lose it (F-CONS-7).
5. Since v2.11.0 the MAX_DELIVERIES advisory fires on AckWait expiry even with no client pulling (F-CONS-8).
6. Ephemerals on Limits streams default to R1 (durables and Interest/WQ consumers inherit the stream's replicas); ephemerals are not memory-backed unless `mem_storage` is set; a `name` without `durable_name` is ephemeral (F-CONS-9, F-CONS-22).
7. Durables have no InactiveThreshold default (0 = never); only ephemerals get 5 s (F-CONS-10).
8. Consumer info is answered by the consumer leader, not the meta leader (F-CONS-20).
9. `num_redelivered` is the count of messages currently marked redelivered (persisted, cleared on ack), not a lifetime counter (F-CONS-21).
10. Priority groups: server accepts multiple groups, accepts any ack policy, and accepts policy changes on update; document one group, recommend explicit ack, and warn that pin state is not reset. Exceeding MaxWaiting is `409 Exceeded MaxWaiting` (F-CONS-12, F-CONS-13, F-CONS-14, F-CONS-16).


<!-- ===== TOPO ===== -->

# Review: TOPO

Server source = nats-server @ 8e54a5954 (paths relative to `server/`). Threads = scratchpad/dump/threads. Line numbers cited were read in this session.

### F-TOPO-1: The JetStream-disabled "arbiter" does not count toward meta-group quorum
- Type: contradiction
- Severity: high
- Claims: "Two clusters with three nodes each plus the arbiter gives 7 servers total (6 JetStream-enabled), an odd count for meta-group quorum" and "a single node cluster that is not JetStream-enabled ... a lighter-weight alternative for satisfying the requirement of an odd number of servers" (NATS by Example — Supercluster Arbiter, natsbyexample.com/examples/topologies/supercluster-arbiter) vs the same page's observed output "it does NOT appear in the RAFT Meta Group table (only the six JetStream-enabled servers are meta-group peers)" vs "3 clusters minimum" (ripienaar, issue 4502, https://github.com/nats-io/nats-server/issues/4502, 2023-09-08)
- Verification: nats-by-example `examples/topologies/supercluster-arbiter/cli/main.sh` lines 14-15 (`gh api`, raw): `jetstream: { enabled: false }`. jetstream_cluster.go:2277-2291 `checkClusterSize()` counts only peers with `nodeInfo.js == true` and calls `n.AdjustClusterSize(totalJS)` ("Adjusting JetStream cluster size from %d to %d"); jetstream_cluster.go:2240-2243 same at cold start via `AdjustBootClusterSize(js)` when `js < total`; raft.go:1236 `qn := n.csz/2 + 1`. A JS-disabled server never runs `enableJetStreamClustering` (jetstream.go:531-535 only when clustered JS is enabled) so it has no meta Raft node.
- Verdict: RESOLVED — A server with `jetstream.enabled: false` is excluded from the meta group's cluster size; the example's meta group is 6 peers with quorum 4, so losing either 3-node cluster loses meta quorum exactly as without the arbiter. The example's own `server report jetstream` output shows this. A tie-breaker must be JetStream-enabled; keeping it out of stream placement is what the `!jetstream` server tag does (jetstream_cluster.go:693 `jsExcludePlacement = "!jetstream"`, used at 9481-9486). No maintainer statement endorsing a JS-enabled `!jetstream` arbiter was found; the only maintainer guidance is "3 clusters minimum".

### F-TOPO-2: "An odd number of servers across the supercluster is required" is not a server rule
- Type: wrong
- Severity: medium
- Claims: "there needs to be an odd number of servers across the supercluster" / "an odd number of servers must exist to support reaching consensus for the meta group leader" (NATS by Example — Supercluster with JetStream) vs "You need an odd number of nodes and so also a odd number of clusters for HA ... 3 clusters minimum" (ripienaar, issue 4502) vs Learn "an even count buys no extra majority" (new docs — Raft and leaders)
- Verification: raft.go:1236 `qn := n.csz/2 + 1`; raft.go:623 logs "(cluster size %d, quorum %d)". No code rejects even sizes; jetstream_cluster.go:2277-2291 sizes the meta group to the number of JS-enabled servers regardless of parity.
- Verdict: RESOLVED — Quorum is floor(N/2)+1 for any N; even counts are allowed and only waste a node. The operative rule for a super-cluster is: after losing any single cluster, the remaining JetStream-enabled servers must still be >= floor(N/2)+1. Two equal clusters can never satisfy that (hence "3 clusters minimum" for symmetric layouts); two unequal clusters (e.g. 5+3) survive loss of the smaller only. "Odd number of clusters" is a rule of thumb, not a requirement.

### F-TOPO-3: `unique_tag` is read from the meta leader's config, so per-cluster differing values are unsafe
- Type: contradiction
- Severity: high
- Claims: "`unique_tag` MUST be the same across all nodes in a cluster AND supercluster" (Legacy docs — Configuration (server config reference), docs.nats.io/running-a-nats-service/configuration) vs regional clusters use `unique_tag: "az:"` while the cross-region cluster `xr` uses `unique_tag: "rg:"` (NATS by Example — Regional and Cross Region Streams (Supercluster), natsbyexample.com/examples/use-cases/cross-region-streams-supercluster)
- Verification: jetstream_cluster.go:9362 in `selectPeerGroup`: `uniqueTagPrefix := s.getOpts().JetStreamUniqueTag` where `s` is `cc.s`, the server running the meta leader; 9376-9388 `checkUniqueTag` rejects peers lacking the prefix ("default requires the unique prefix to be present") and duplicates; 9546-9558 applies it to every candidate in the target cluster.
- Verdict: RESOLVED — The legacy docs are right. Placement enforces the meta leader's `unique_tag`, not the target cluster's. In the NbE layout, whenever the meta leader sits in `xr` (prefix `rg:`), an R3 regional stream on `rg2` (`rg2-az1..3`, all `rg:2`) fails with "server tag not unique"; when the leader sits in a regional cluster (prefix `az:`), `xr` placement only works because the example happens to give its three xr nodes distinct `az:` values. Use one `unique_tag` value everywhere or encode both dimensions in one tag family.

### F-TOPO-4: Quorum written as (N+1)/2
- Type: wrong
- Severity: medium
- Claims: "A candidate becomes leader on a quorum of votes, a majority `(N+1)/2`; for three peers that's two" (new docs — Raft and leaders, docs.nats.io/learn/clustering/raft-and-leaders) vs "an R=4 group commits once three peers hold a write, not two" (new docs — Scaling and peer management) vs "quorum is 1/2 cluster size + 1" (Legacy docs — JetStream Clustering)
- Verification: raft.go:1236 `qn := n.csz/2 + 1` (integer division); jetstream_cluster.go:9566-9578 placement uses `quorum := r/2 + 1`.
- Verdict: RESOLVED — Quorum is floor(N/2)+1. (N+1)/2 agrees only for odd N; for N=4 it yields 2, which would permit two disjoint majorities.

### F-TOPO-5: "R3 with two nodes down still allows reads"
- Type: contradiction
- Severity: medium
- Claims: "losing two still allows reads" (YouTube — Rethink Connectivity Ep 10; Ep 11 "two nodes offline still handles reads"; "JetStream KV: A fascinating alternative to Redis" "take two nodes down and still accept reads") vs "An R3 stream that loses two of its three peers cannot progress" (derekcollison, "has NO quorum, stalled on jetstream consumers") and "Reading from consumers is always done from the leader" (derekcollison, "Produce from anywhere, consume from the same availability zone") vs "If no majority remains ... writes are blocked" (new docs — Surviving node loss)
- Verification: Consumer delivery needs a consumer leader, which needs consumer-group quorum (raft.go:1236) — maintainer statement above. Direct Get is different: jetstream_cluster.go:4109-4131 each replica subscribes to the direct-get subjects once it is current or >= 90% caught up ("enabling direct gets at %.0f%% synchronized") and the subscription is only dropped at stream stop (stream.go:5180), so a lone surviving replica with `allow_direct` keeps answering.
- Verdict: RESOLVED — With 2 of 3 replicas down, consumer-based reads (push/pull/ordered) stop because no consumer leader can be elected; only Direct Get on streams with `allow_direct: true` keeps serving from the survivor, possibly stale. The talks' blanket "reads still work" is wrong for consumers.

### F-TOPO-6: Stretch-cluster latency bound (100-150 ms) vs deployed 285-350 ms
- Type: unverifiable
- Severity: high
- Claims: "a normal cluster just with long latency connections - max around 100 to 150m - ... a very advanced use case ... last resort" (ripienaar, discussion 5317, https://github.com/nats-io/nats-server/discussions/5317, 2024-04-17) vs a global stretched cluster across ~40 Akamai regions with measured US West-Mumbai 285 ms and Sao Paulo-Mumbai 350 ms (YouTube — Partner Talk NATS on Akamai Cloud, RethinkConn 2025) vs "stretch cluster (e.g. 9 or 13 nodes) across regions" presented as a pattern (YouTube — NATS 2.10 Webinar) vs "Stretched clusters 'get chatty and fragile'" (blog — Bridging the Edge)
- Verification: No server constant encodes a latency ceiling. Relevant timers: election timeout 4-9 s (raft.go:298-299), heartbeat 1 s (raft.go:302), lost-quorum after 10 s (raft.go:303), route ping <= 30 s (route.go:141), catch-up inactivity 30 s (jetstream_cluster.go:11893-11896). None is violated by 350 ms RTT, so the 150 ms figure is a maintainer judgment about performance (PubAck latency, catch-up, replication chatter), not an enforced bound.
- Verdict: REQUIRES RESOLUTION — The dump carries 150 ms as a hard limit from one maintainer comment and a 350 ms production deployment from a partner. Needs a maintainer statement on what degrades above ~150 ms (and whether the Akamai layout ran replicated streams at all); until then document 150 ms as guidance, not a limit.

### F-TOPO-7: Gateway "optimistic mode" is legacy; gateways have been interest-only for all accounts since 2.9.0
- Type: stale
- Severity: medium
- Claims: "Interest propagation: interest-only mode (A sends only subjects B has expressed interest in) and queue subscriptions" plus optimistic sends (Legacy docs — Super-cluster with Gateways); "optimistic sends with interest-graph pruning" (YouTube — A New Way of Thinking, NATS 2.0); "leaf nodes are the only network topology that NATS has that is interest only both ways" (YouTube — NATS Connect Live! NATS Leafnodes, 2020) vs "Since 2.9.0 optimistic mode is being phased out" (Code — server/gateway.go)
- Verification: gateway.go:1237-1245 "Starting 2.9.0, we are phasing out the optimistic mode, so change all accounts to interest-only mode" via `switchAccountToInterestMode` for every account on gateway connect; gateway.go:96-110 defines the modes.
- Verdict: RESOLVED — From 2.9.0 every account is interest-only across gateways at connect time; optimistic/transitioning modes survive only as code paths and the `defaultGatewayMaxRUnsubBeforeSwitch = 1000` heuristic (gateway.go:41) is effectively moot. Any text describing gateways as optimistic, or leaf nodes as the only interest-only-both-ways link, is pre-2.9.

### F-TOPO-8: Explicit gateway URLs do not need credentials in the URL (routes do)
- Type: wrong
- Severity: medium
- Claims: "Authorization: single user/password for discovered gateways only; explicit gateways need creds in URL" (Legacy docs — Gateway Configuration, docs.nats.io/running-a-nats-service/configuration/gateways/gateway) vs same rule for routes (Legacy docs — Clustering Configuration)
- Verification: gateway.go:965-971 `if userInfo := url.User; ... else if opts != nil { user = opts.Gateway.Username; pass = opts.Gateway.Password }` — configured gateway credentials are used for solicited gateways without URL userinfo. Routes: route.go:499-505 `sendRouteConnect` takes credentials only from `c.route.url.User`; route.go:1080-1082 adds `opts.Cluster.Username/Password` only to implicit (gossiped) routes.
- Verdict: RESOLVED — The rule is correct for routes and wrong for gateways: a gateway configured with `authorization { user, password }` uses those for every outbound gateway, explicit or discovered.

### F-TOPO-9: "Each server in the cluster must have the same pool size" is pre-2.11
- Type: stale
- Severity: low
- Claims: "It is required that each server in the cluster have the same pool size value" or clustering fails ("Mismatch route pool size") (Legacy docs — v2 Routes) vs "since v2.11.0 remotes may have a different pool size" (Code — server/route.go)
- Verification: route.go:630-636 "Since v2.11.0, we support remotes with a different pool size (for rolling upgrades)"; route.go:2141-2144 "we now allow servers with different pool sizes ... effective pool size ... the max between our configured size and the size we receive".
- Verdict: RESOLVED — Since 2.11.0 differing pool sizes are tolerated (effective size = max of both). Before 2.11.0 the docs statement held.

### F-TOPO-10: Compression defaults: leaf nodes default to `s2_auto`, routes to `accept`
- Type: contradiction
- Severity: low
- Claims: "Route (and leaf node) compression is off by default" (YouTube — NATS 2.10 Webinar) vs "on by default for leaf nodes" (YouTube — EP06 journey of 2.10) vs "Leaf `compression` defaults to `s2_auto` (unlike routes which default to accept)" (Legacy docs — LeafNode Configuration)
- Verification: opts.go:6062-6070 cluster `Compression.Mode` defaults to `CompressionAccept` ("compression is not initiated"); opts.go:6084-6089 and 6101-6106 leafnode listener and each remote default to `CompressionS2Auto`.
- Verdict: RESOLVED — Leaf links compress by default (`s2_auto`); routes only accept if the peer initiates, so route compression is effectively off between two default servers.

### F-TOPO-11: A leaf running JetStream does not "need" a domain to avoid collision with the hub
- Type: contradiction
- Severity: medium
- Claims: "If a leaf runs its own JetStream, it needs a JetStream domain; without distinct domains a leaf's JetStream and its hub's JetStream collide" (new docs — Leaf nodes, Topologies deep dive) vs "the JetStream domain may be left default or named explicitly" for a leaf into NGS (YouTube — Rethink Connectivity Ep 7) and log line `JetStream using domains: local "", remote "ngs"` (Legacy docs — NGS leaf nodes in Docker) vs "Unless you also share the system account, the domain names need to be different" (derekcollison, "Leaf node with standalone Primary NATS server")
- Verification: leafnode.go:2064-2087: when domains differ, or the system account is not shared, `denyAllClientJs` (`$JS.API.>`, `$KV.>`, `$OBJ.>`) is merged into the leaf account's permissions ("If domain names mismatch always deny"); leafnode.go:2109-2114: even when the system account is shared with the same domain, non-system accounts still get `denyAllClientJs`; extension only happens for the system account with identical domain (2088-2103).
- Verdict: RESOLVED — Without sharing the system account, a leaf's JetStream is isolated from the hub's regardless of domain names (both may be empty). A domain is needed (a) to address the other side's JetStream via `$JS.<domain>.API` and (b) to avoid ambiguity when both sides carry a name; with the system account shared, an identical domain means extension, a differing one means two isolated JetStreams. "Needs a domain or it collides" overstates it.

### F-TOPO-12: "A leaf has no `cluster {}` or `gateway {}` block" vs leaf clusters
- Type: contradiction
- Severity: medium
- Claims: "A leaf has no `cluster {}` or `gateway {}` block; it's a standalone server reaching the rest through one outbound link" (new docs — Leaf nodes) vs "a leaf node is a second NATS system (single server, cluster or super cluster)" (YouTube — Rethink Connectivity Ep 7), "If one node in a cluster is configured as leaf node, all nodes need to" (Legacy docs — Leaf Nodes), "each leaf node is a three node cluster of servers" (YouTube — PowerFlex customer story), "One server can take part in several layers at once (cluster, gateway, and leafnodes blocks in one config)" (new docs — Putting it together)
- Verification: leafnode.go:2238-2242 the hub compares the connecting leaf's `proto.Cluster` against its own cluster name (`ErrLeafNodeHasSameClusterName`); leafnode.go:2340 `acc.registerLeafNodeCluster(proto.Cluster)`; client.go:5433-5443 tracks `leafOrigin` cluster for messages arriving from a leaf cluster via routes; opts.go:319-323 `local_isolation`/`request_isolation` exist precisely for east-west interest between leaf clusters.
- Verdict: RESOLVED — Leaf nodes can be clustered (and can carry gateways); the Learn sentence describes the simplest case and is wrong as a general statement. The one cluster-related restriction is that a leaf cluster must not share its cluster name with the hub it connects to (F-TOPO-13).

### F-TOPO-13: "All nodes in a cluster must be leaf nodes / must accept leaf connections"
- Type: contradiction
- Severity: medium
- Claims: "If one node in a cluster is configured as leaf node, all nodes need to. Likewise, if one server in a cluster accepts leaf node connections, all servers need to." (Legacy docs — Leaf Nodes) vs Learn text that treats the remote as a per-server choice (new docs — Leaf nodes)
- Verification: Spoke side: client.go:5341 a message received from a ROUTER is forwarded to a leaf connection only if `sub.client.isHubLeafNode()` (i.e. this server is the hub side) or it is a service reply — a spoke server never relays route-received messages over its own solicited hub link, so a spoke-cluster node without its own `remotes` cannot reach the hub through a peer. Hub side: route.go:2782-2784 only servers with a leafnode listener (and no `no_advertise`) publish `LeafNodeURLs` to routes, and remotes reconnect only to advertised URLs, so a mixed hub cluster works.
- Verdict: RESOLVED — The first sentence is enforced by design (every server in a leaf cluster needs its own remote). The second is a recommendation, not a requirement: a hub cluster may accept leaf connections on a subset of servers; only those are advertised to leaves.

### F-TOPO-14: One-hop rule stated too broadly: route-received messages also reach hub-side leaf spokes
- Type: wrong
- Severity: low
- Claims: "Messages received from a route will only be distributed to local clients" (Legacy docs — Clustering) vs "A message received over a route is delivered to that server's own clients and forwarded no further" (new docs — Your first cluster)
- Verification: client.go:5326-5331 route-received messages are never re-sent to routes (unless `pmrAllowSendFromRouteToRoute`); client.go:5335-5343 they are sent to LEAF connections when `sub.client.isHubLeafNode()` or `isServiceReply`. Gateways: route.go:473-495 `processInboundRoutedMsg` does not call `sendMsgToGateways`; each server sends to gateways itself (client.go:4540-4547).
- Verdict: RESOLVED — The one-hop rule is route-to-route only. A hub server delivers route-received messages to its local clients and to the leaf spokes attached to it; it does not forward them to other routes or to gateways.

### F-TOPO-15: `$JS.ACK` domain awareness: fix exists but is behind a default-off feature flag
- Type: stale
- Severity: low
- Claims: "ACK and MSG gets (both direct and original) are not domain aware. We plan to fix for sure." (derekcollison, discussion 6136, https://github.com/nats-io/nats-server/discussions/6136, 2024-11-15) vs ADR-15 "$JS.ACK.<domain>.<account>.>"
- Verification: consumer.go:1381-1401 builds a v2 ack/flow-control subject `$JS.(ACK|FC).<domain>.<accHash>.<stream>.<consumer>...` (domain `_` when empty) alongside the v1 format; consumer.go:1388 `o.useV2Ack = s.getOpts().getFeatureFlag(FeatureFlagJsAckFormatV2)`; feature_flags.go:23 `FeatureFlagJsAckFormatV2 = "js_ack_fc_v2"`, feature_flags.go:35 default `false`.
- Verdict: RESOLVED — Domain-aware ack subjects are implemented as the opt-in feature flag `js_ack_fc_v2`; the default ack format is still domain-unaware, so the cross-talk workaround (deny `$JS.ACK.>` across the leaf link) remains relevant unless the flag is enabled.

### F-TOPO-16: "Same cluster name for leaf nodes" trick was formalised in 2.12.0, not 2.11
- Type: stale
- Severity: low
- Claims: "will be formalized in the 2.11 release" (blog — NATS for Retail, synadia.com/blog/east-west-vs-north-south-in-nats, 2024-10-29) and "We will formalize this in 2.11" (derekcollison, discussion 5974, https://github.com/nats-io/nats-server/discussions/5974, 2024-10-08)
- Verification: opts.go:228-230 `IsolateLeafnodeInterest` (`isolate_leafnode_interest` / `isolate`, opts.go:2909) and opts.go:319-323 remote `local_isolation` / `request_isolation`; `git tag --contains` on the commit that added `IsolateLeafnodeInterest` returns v2.12.0-RC.1 as the first tag.
- Verdict: RESOLVED — The formal option (`leafnodes { isolate: true }` and per-remote `local_isolation`/`request_isolation`) shipped in 2.12.0. The shared-cluster-name trick still works but is the pre-2.12 workaround.

### F-TOPO-17: Multi-region blog: publishes continue after losing a majority of replica regions
- Type: wrong
- Severity: medium
- Claims: "if two or three [regions] fail, no new consumer/stream creation but publishes and gets still work" (blog — Multi-Region Consistency, synadia.com/blog/multi-cluster-consistency-models, 2024-04-17) vs "At least 2 of 3 nodes must be reachable for RAFT votes" (same page) vs "if no majority remains ... writes are blocked" (new docs — Surviving node loss)
- Verification: raft.go:1236 quorum floor(N/2)+1 applies per stream group; jetstream_cluster.go:9566-9578 placement itself requires quorum online. Stream write acceptance needs a stream leader (Legacy docs and ripienaar 5317 both agree on this point).
- Verdict: RESOLVED — Losing a majority of the regions that hold a stream's replicas removes the stream's quorum; publishes to that stream stop (no PubAck), even though existing consumers on other streams keep working. The sentence is only true while the surviving regions still hold a majority of the stream's replicas.

### F-TOPO-18: Replication factor 7
- Type: wrong
- Severity: low
- Claims: "use multiples of like three five seven" (YouTube — Rethink Connectivity Ep 11) vs "The maximum replication factor per stream is 5" (blog — Deploying a scalable NATS cluster part 1) and "a stream keeps at most five copies" (new docs — JetStream in a cluster)
- Verification: stream.go:730 `const StreamMaxReplicas = 5`; stream.go:1733-1734 rejects `Replicas > StreamMaxReplicas` with "maximum replicas is 5".
- Verdict: RESOLVED — R5 is the maximum; R7 is rejected.

### F-TOPO-19: Stream mirrors do not forward writes to the origin
- Type: wrong
- Severity: medium
- Claims: "all reads will be served from this mirror but all writes will actually be forwarded to the source" (YouTube — Rethink Connectivity Ep 11); "NATS is smart enough to serve up requests from the closest mirror ... all of the writes are going to go through the leader" (YouTube — JetStream KV alternative to Redis) vs "clients cannot write to a mirror directly. It is read-only by design" (blog — Mirror, Merge, or Consume) and ADR-59
- Verification: errors.json:293-296 `JSMirrorWithSubjectsErr` "stream mirrors can not contain subjects"; stream.go:1914, 2173 reject mirror configs with subjects, so a mirror never captures published messages and the server has no write-forwarding path. Transparent write redirection exists only in KV clients (ADR-58 "Writes and Watchers are transparently sent to the origin bucket"), which is client behaviour, not server.
- Verdict: RESOLVED — For streams, a mirror is read-only and a publish to its subjects is simply not stored by the mirror. Only the KV client API redirects `Put` to the origin bucket for KV mirrors; the talks' wording generalises a KV-client feature to all mirrors.

### F-TOPO-20: "Meta Group (all servers)"
- Type: wrong
- Severity: low
- Claims: "Meta Group (all servers; owns the API and server placement)" (Legacy docs — JetStream Clustering) and "the meta group is one cluster-wide RAFT group whose peers are all servers" (new docs — Raft and leaders) vs "every JetStream-enabled server belongs to the meta group" (new docs — JetStream in a cluster)
- Verification: jetstream_cluster.go:2277-2291 non-JS servers are removed from the meta cluster size ("mixed mode"); jetstream.go:531-535 meta controller started only on JS-enabled servers.
- Verdict: RESOLVED — Only JetStream-enabled servers are meta-group peers; core-only servers in a mixed cluster are excluded (see also F-TOPO-1).

### F-TOPO-21: JetStream requires a cluster name and routes, but not an explicit `server_name`
- Type: contradiction
- Severity: low
- Claims: "Unlike core clustering, each JetStream node must specify a server name and cluster name" (Legacy docs — JetStream Clustering) and "Cluster name is recommended for NATS +v2.2" (Legacy docs — Clustering Configuration) vs "A requirement of JetStream is to have a cluster block with routes defined, even for single node clusters" (NATS by Example — Supercluster with JetStream) vs "server_name defaults to server id" (Legacy docs — Configuration)
- Verification: jetstream_cluster.go:1220-1225 `enableJetStreamClustering` errors "JetStream cluster requires cluster name" when the name is dynamic and "JetStream cluster requires configured routes or solicited leafnode for the system account"; server.go:1124-1131 the gateway name becomes the cluster name when `cluster.name` is absent. No check for `ServerName` in jetstream.go; mqtt.go:698 requires it only for MQTT with cluster/gateway.
- Verdict: RESOLVED — Clustered JetStream needs a stable cluster name (or a gateway name) and configured routes (or a system-account leaf remote). `server_name` is not enforced for JetStream (it defaults to the server ID); it is enforced for MQTT once a cluster or gateway block exists. "Recommended" understates the cluster-name requirement for JetStream.

### F-TOPO-22: Glossary: superclusters are formed by leaf nodes / direct links
- Type: dubious
- Severity: medium
- Claims: "Leaf Nodes or direct links connect clusters" and leaf nodes act "as bridges for message routing" between clusters of a supercluster (blog — What is a Multi-Cluster NATS Deployment?, synadia.com/glossary/multi-cluster) vs "Gateways join clusters into a full mesh of clusters (superclusters)" (Legacy docs — Super-cluster with Gateways) and "a leaf cluster must connect once to the super-cluster, not to each member cluster" (derekcollison, "Duplicate messages on a leafnode cluster")
- Verification: gateway.go:668-730 `solicitGateways` forms cluster-to-cluster connections from `gateway.gateways`; leafnode.go:2064-2087 leaf links are account-scoped with JS API denies; derekcollison's statement above distinguishes the two.
- Verdict: RESOLVED — Wrong. Superclusters are formed by gateway connections; a leaf node attaches a separate NATS system to a super-cluster (or cluster) and is not how member clusters are joined.

### F-TOPO-23: "NATS core servers form their own RAFT group"
- Type: dubious
- Severity: low
- Claims: "NATS core servers form their own RAFT group for cluster synchronization" (blog — Deploying a scalable NATS cluster part 1) vs Legacy docs describe routes as gossip + full mesh with no consensus
- Verification: `bootstrapRaftNode`/`startRaftNode` are referenced only from jetstream_cluster.go and raft.go (grep over server/*.go excluding tests); route.go contains no Raft usage.
- Verdict: RESOLVED — Wrong. Raft is used only by JetStream (meta, stream and consumer groups); core routing uses interest gossip over the route mesh with no consensus.

### F-TOPO-24: Cluster port 6222 / gateway port 7222 are conventions, not server defaults
- Type: dubious
- Severity: low
- Claims: "[DUBIOUS] states route port '4248' (default is 6222)" (blog — Global NATS Cluster (Fly.io)); "route port (6222), never the client port (4222)" (new docs — Forming a cluster); "a dedicated cluster port (6222 by convention, any free port works)" (YouTube — Rethink Connectivity Ep 4)
- Verification: const.go:78 `DEFAULT_PORT = 4222`, const.go:206 `DEFAULT_LEAFNODE_PORT = 7422`; no `DEFAULT_CLUSTER_PORT`/`DEFAULT_GATEWAY_PORT` constant exists in const.go or opts.go (grep); routes/gateways only listen when a port is configured.
- Verdict: RESOLVED — The Fly.io guide's 4248 is a valid choice, not an error; 6222 and 7222 are documentation conventions. Only 4222 (client) and 7422 (leaf) are server defaults. The Learn text should say "the configured route port" rather than imply 6222 is built in.

### F-TOPO-25: Learn "three servers = three routes" vs pooled route connections
- Type: contradiction
- Severity: low
- Claims: "With three servers the full mesh is three routes" (new docs — Your first cluster) vs "each link to a peer is a pool of connections (three by default) plus a dedicated system-account route" and "a default three-node cluster shows eight entries on one node" (new docs — Forming a cluster; Monitoring endpoints)
- Verification: const.go:159 `DEFAULT_ROUTE_POOL_SIZE = 3`; route.go:530-540 accounts hashed onto pool indexes; system account pinned to its own route (Legacy docs v2 Routes, consistent with route.go pinned-account handling at 1085-1092).
- Verdict: RESOLVED — Three logical peer links, but 4 TCP route connections per peer by default (3 pooled + 1 system account), i.e. 8 route connections per server in a 3-node cluster and 32 in a 9-node cluster (matches the NbE observed "Routes 32"). The Learn page should not call the mesh "three routes" without qualifying that `nats server list` counts connections.

### F-TOPO-26: Leaf credentials location
- Type: wrong
- Severity: low
- Claims: "A leaf node authenticates to the hub with the same accounts and credentials; the credentials attach in the hub's `leafnodes {}` block" (new docs — Where to go next (Security)) vs "placing a user `.creds` file in `leafnodes.remotes[].credentials`" on the leaf (NATS by Example — Leafnode with JWT Auth)
- Verification: opts.go:259 `RemoteLeafOpts.Credentials`, parsed from `creds`/`credentials` inside a remote (opts.go:3114); the hub's `leafnodes {}` block carries `authorization`/account settings, not the leaf's credentials.
- Verdict: RESOLVED — Credentials go in the leaf server's `leafnodes.remotes[].credentials`; the hub's block configures what it accepts.

### F-TOPO-27: "TLS Mutual Authentication is the only way of securing routes"
- Type: wrong
- Severity: low
- Claims: "TLS Mutual Authentication is the only way of securing routes" (Legacy docs — TLS Authentication in clusters) vs route `authorization { user, password }` (Legacy docs — Clustering Configuration)
- Verification: opts.go:2060-2070 cluster authorization accepts a single user/password (rejects multiple users, tokens, callouts); route.go:2769-2771 sets `info.AuthRequired` when `Cluster.Username` is set; opts.go:3285-3300 cluster/gateway TLS always forces `RequireAndVerifyClientCert`.
- Verdict: RESOLVED — Routes can be secured by username/password, TLS mutual auth, or both; when route TLS is configured, client-cert verification is always on.

### F-TOPO-28: "You can lose 3 nodes" in a 9-node meta group
- Type: unverifiable
- Severity: low
- Claims: "All 9 nodes belong to the meta group. So you can loose 3 nodes before things start breaking." (ripienaar, discussion 5317, 2024-04-18)
- Verification: raft.go:1236 quorum for 9 = 5, so 4 losses are tolerated; the statement is conservative in the context of losing one whole 3-node cluster.
- Verdict: RESOLVED — Meta quorum for 9 JS peers is 5; up to 4 peers can be lost. The "3" is the whole-cluster-loss scenario, not the limit.

### F-TOPO-29: Extension of a hub JetStream via leaf requires the hub to be clustered (known issue)
- Type: unverifiable
- Severity: low
- Claims: "Known issue: extending a central JetStream (leaf without domain) requires the central JetStream to be clustered" and "with more than one JetStream-enabled leaf in a different cluster, the connected cluster also needs JetStream enabled and a domain set" (Legacy docs — JetStream on Leaf Nodes (domains))
- Verification: jetstream.go:516-521 a standalone server with a system-account remote logs "Standalone server started in clustered mode do not support extending domains" and may still enable clustering via `canExtend` (jetstream_cluster.go:1219-1225 accepts "solicited leafnode for the system account" in place of routes). That covers the leaf side; nothing found that requires the hub side to be clustered, and no maintainer statement located.
- Verdict: REQUIRES RESOLUTION — The hub-side clustering requirement and the "more than one JS leaf needs hub JS + domain" note have no code or maintainer backing in the dump; a maintainer confirmation or a reproduction on 2.12+ would settle whether these known issues still hold.

### F-TOPO-30: Domain mismatch inside a cluster is silent, not rejected
- Type: unverifiable
- Severity: low
- Claims: "Every server in a cluster and super cluster needs to have the same domain name" (Legacy docs — JetStream on Leaf Nodes (domains))
- Verification: events.go:1699-1701 `sameDomain` (true if either side is empty or equal); route.go:2344-2356 and events.go:1834 register a remote server as a JetStream peer only when `sameDomain` holds; no error or log is raised for a mismatch.
- Verdict: RESOLVED — The rule is real but enforced by omission: a server with a different non-empty domain is silently excluded from the meta/placement peer set rather than rejected. Worth stating as an operational trap.

## Summary

Counts by type: contradiction 9, wrong 10, stale 4, unverifiable 4, dubious 3. Total findings: 30.

Counts by verdict: RESOLVED 28, REQUIRES RESOLUTION 2.

| ID | Title | What would settle it |
|---|---|---|
| F-TOPO-6 | Stretch-cluster latency bound 100-150 ms vs deployed 350 ms | Maintainer statement on which behaviours degrade above ~150 ms RTT (PubAck latency, catch-up, election stability), and whether replicated streams were run in the Akamai layout |
| F-TOPO-29 | Hub must be clustered to be extended via leaf; multiple JS leaves need hub JS + domain | Maintainer confirmation or reproduction on 2.12+ that these "known issues" still hold |

Ten highest-severity RESOLVED corrections:
1. F-TOPO-1: A JetStream-disabled arbiter is not a meta-group peer; the NbE arbiter layout still loses meta quorum when one 3-node cluster goes down (jetstream_cluster.go:2277-2291).
2. F-TOPO-3: `unique_tag` is applied from the meta leader's config, so mixing `az:` and `rg:` per cluster (NbE cross-region example) makes placement fail depending on where the meta leader sits (jetstream_cluster.go:9362).
3. F-TOPO-2: No odd-server-count requirement exists; quorum is floor(N/2)+1 and the real rule is "surviving JS servers after losing one cluster must still be a majority" (raft.go:1236).
4. F-TOPO-4: Quorum is floor(N/2)+1, not (N+1)/2 (raft.go:1236).
5. F-TOPO-5: With two of three replicas down only Direct Get keeps serving; consumer reads stop (jetstream_cluster.go:4109-4131; derekcollison).
6. F-TOPO-7: Gateways are interest-only for all accounts since 2.9.0; "optimistic mode" text is stale (gateway.go:1237-1245).
7. F-TOPO-8: Explicit gateway URLs fall back to configured gateway credentials; only routes require credentials in explicit URLs (gateway.go:965-971, route.go:499-505).
8. F-TOPO-11: A leaf's JetStream is isolated from the hub whenever the system account is not shared, domain or not; "needs a domain or it collides" overstates it (leafnode.go:2064-2114).
9. F-TOPO-12/13: Leaf nodes can be clustered; every spoke-cluster server needs its own remote (client.go:5341), but hub clusters need not accept leaves on every server (route.go:2782-2784).
10. F-TOPO-17/19: Publishes stop when a majority of a stream's replica regions are lost; stream mirrors never forward writes (KV-client redirect only) (raft.go:1236; errors.json:293-296).


<!-- ===== SEC ===== -->

# Review: SEC

Source tree for all `file:line` citations: `/Users/tomaszpietrek/coding/new-nats.docs/nats-server` at commit 8e54a5954 (`git describe`: v2.14.0-519). Release boundaries were checked by inspecting the tagged file directly (`git show <tag>:server/<file>`), not by `git tag --contains` alone, because several features were back-ported with different hashes. jwt library: `github.com/nats-io/jwt/v2 v2.8.2` (go.mod:12). natscli source: `~/coding/natscli` at v0.4.0-47-g3726a32.

### F-SEC-1: `allow_responses: true` has a 2-minute expiry, not "no time limit"
- Type: wrong
- Severity: high
- Claims: "`allow_responses: true` = `{max: 1}` with no time limit" (Legacy docs — Authorization) vs "`allow_responses` permission defaults: 1 response, 2 minute expiry" (Code — server/const.go)
- Verification: server/opts.go:4859-4881 `case "publish_allow_responses", "allow_responses": rp := &ResponsePermission{MaxMsgs: DEFAULT_ALLOW_RESPONSE_MAX_MSGS, Expires: DEFAULT_ALLOW_RESPONSE_EXPIRATION}` applied for the bool form; server/const.go:228,232 `DEFAULT_ALLOW_RESPONSE_MAX_MSGS = 1`, `DEFAULT_ALLOW_RESPONSE_EXPIRATION = 2 * time.Minute`; server/client.go:4226-4241 `if c.perms.resp.Expires > 0 && time.Since(resp.t) > c.perms.resp.Expires` drops the reply. Map form: `max`/`expires` only override when non-zero, negative = infinite (opts.go:4960-4979).
- Verdict: RESOLVED — `allow_responses: true` permits 1 reply per request and the permission expires 2 minutes after the request was received. A responder that takes longer than 2 minutes gets a publish permission violation. Use `allow_responses: { max: 1, expires: "-1s" }` (negative) for no limit. Note also that `allow_responses` forces an empty publish allow list when none is given (opts.go:4876-4879), which is what "implicitly denies publish to other subjects" means.

### F-SEC-2: Authorization timeout default is 2s without TLS, `tls_timeout + 1s` with TLS
- Type: contradiction
- Severity: medium
- Claims: "Auth `timeout` default is 1 second more than `tls_timeout`; invalid values default to 1s" (Legacy docs — Authentication timeout) vs "`AUTH_TIMEOUT = 2 * time.Second`" (Code — server/const.go) vs "default 2 seconds" (Learn — Authentication basics; Auth callout)
- Verification: server/opts.go:6192-6200 `getDefaultAuthTimeout`: `if tls != nil { authTimeout = tlsTimeout + 1.0 } else { authTimeout = float64(AUTH_TIMEOUT / time.Second) }`, applied only `if opts.AuthTimeout == 0` (opts.go:6025-6027). Parsing at opts.go:4576-4596: wrong type is a config error; `> 60s` only warns. No code raises an explicitly configured auth timeout above the TLS timeout, and no "invalid → 1s" path exists. The auth-callout wait uses the same value: server/auth_callout.go:369 `authTimeout := secondsToDuration(s.getOpts().AuthTimeout)`.
- Verdict: RESOLVED — Default is 2s when no client TLS is configured and `tls.timeout + 1s` (3s with the default 2s TLS timeout) when it is. The "invalid values default to 1s" sentence has no code backing. The auth-callout deadline (Learn: "default two seconds") is therefore 3s on a TLS server.

### F-SEC-3: An empty allow list is unrestricted; only a non-empty allow list implies deny
- Type: contradiction
- Severity: low
- Claims: "Declaring an explicit `sub.allow` list is an implicit deny of everything else" / "The moment you write an `allow` list, every subject not on it is denied" (NbE — Private Inbox; Learn — Authorization) vs "An empty allow list is not a lock-down: `publish: []` parses as no list" (Learn — Authorization)
- Verification: server/opts.go:4905-4934 `parsePermSubjects` appends into a nil slice, so `[]` yields `Allow == nil`; server/client.go:1110-1112 `if perms.Publish.Allow != nil { c.perms.pub.allow = NewSublist(...) }`, client.go:1158-1160 `if len(perms.Subscribe.Allow) > 0 { c.perms.sub.allow = ... }`; client.go:3363 comment "If no allow list that means all are allowed".
- Verdict: RESOLVED — Both statements hold: a non-empty allow list denies everything else; an empty list from config is treated as absent (unrestricted). Asymmetry worth documenting: a non-nil empty publish allow (only produced programmatically or via `allow_responses`) DOES deny all publishes, while subscribe uses `len > 0` and treats it as absent.

### F-SEC-4: Deny overrides allow (allow checked first, then deny)
- Type: contradiction
- Severity: low
- Claims: "In case of overlap deny has priority" (Legacy docs — Authorization) vs "the server checks allow first, then deny, and a match in deny overrides" (Learn — Authorization)
- Verification: server/client.go:4184-4208 `pubAllowedFullCheck`: `if checkAllow && c.perms.pub.allow != nil { allowed = np != 0 }; if allowed && c.perms.pub.deny != nil { allowed = np == 0 }`; server/client.go:3342-3391 `canSubscribeInternal` same shape.
- Verdict: RESOLVED — Not a conflict; both are correct. Deny always wins; publish additionally falls through to `responseAllowed` (client.go:4212-4222) when `allow_responses` is set.

### F-SEC-5: `default_permissions` are whole-struct fallbacks, never merged
- Type: unverifiable
- Severity: low
- Claims: "a user with its own block ignores the defaults entirely — never merged" (Learn — Authorization) vs "`default_permissions` applies to users without explicit permissions" (Legacy docs — Authorization)
- Verification: server/opts.go:4539-4553 `applyDefaultPermissions`: `if user.Permissions == nil { user.Permissions = defaultP }`, called at opts.go:4638 (authorization block) and 3838 (per-account block).
- Verdict: RESOLVED — Confirmed. A user with any `permissions` block, even one containing only a deny, gets none of the defaults.

### F-SEC-6: `no_auth_user` works with an NKey user, fails with a bcrypt password, is not reloadable, and is rejected in operator mode
- Type: wrong
- Severity: medium
- Claims: "`no_auth_user` ... will not work with nkeys or bcrypted passwords" (Legacy docs — Multi Tenancy using Accounts) vs "`no_auth_user` can't be introduced or changed by config reload ... the server rejects `no_auth_user` together with a trusted operator" (Learn — Accounts and multitenancy)
- Verification: NKey path server/auth.go:906-914: when no credentials are sent and `noAuthUser` names an nkey, `c.opts.Nkey = noAuthUser`, and auth.go:1180-1181 skips the signature check `if nkey.Nkey != noAuthUser`. Password path auth.go:986-993 copies `u.Password` (the stored hash) into `c.opts.Password`, then auth.go:1688-1692 `comparePasswords` runs `bcrypt.CompareHashAndPassword(hash, hash)`, which cannot succeed (code trace, not executed). Reload: server/reload.go:1936-1947 `case "noauthuser"` returns `config reload not supported for %s` for any change other than removing the option together with its user. Operator mode: server/auth.go:1775-1777 `return fmt.Errorf("no_auth_user not compatible with Trusted Operator")`.
- Verdict: RESOLVED — Legacy is half wrong: `no_auth_user` DOES work with an nkey user (the signature requirement is waived for that user) and does NOT work with a bcrypt-hashed password user. Reload and operator-mode statements in Learn are correct.

### F-SEC-7: Whether `nats-server -t` catches a `no_auth_user` naming a missing user
- Type: unverifiable
- Severity: low
- Claims: "`nats-server -t` doesn't catch a `no_auth_user` naming a missing user" (Learn — Accounts and multitenancy) vs none
- Verification: The check lives in `validateNoAuthUser` (server/auth.go:1771-1777, error `no_auth_user: %q ... not present as user or nkey`), invoked from `validateAuth` (auth.go:1726) inside `validateOptions` (server/server.go:1158), which `NewServer` calls at server.go:736. Whether the `-t` config-check path reaches `NewServer`/`validateOptions` was not traced.
- Verdict: REQUIRES RESOLUTION — Trace `main.go` `-t`/`configCheck` handling to see if `validateOptions` runs; or run `nats-server -t` with a bogus `no_auth_user` and observe.

### F-SEC-8: `allowed_connection_types` has seven values, not four
- Type: stale
- Severity: low
- Claims: "restricts a user to `STANDARD`, `WEBSOCKET`, `LEAFNODE`, `MQTT`" (Legacy docs — WebSocket Configuration) vs "`STANDARD`, `WEBSOCKET`, `LEAFNODE`, `LEAFNODE_WS`, `MQTT`, `MQTT_WS`, `IN_PROCESS`" (Learn — Auth and clustering (MQTT))
- Verification: server/auth.go:1752-1769 `switch ctuc { case jwt.ConnectionTypeStandard, jwt.ConnectionTypeWebsocket, jwt.ConnectionTypeLeafnode, jwt.ConnectionTypeLeafnodeWS, jwt.ConnectionTypeMqtt, jwt.ConnectionTypeMqttWS, jwt.ConnectionTypeInProcess: default: return fmt.Errorf("unknown connection type %q", ct)`; values are upper-cased before matching. Leaf-over-websocket is typed `LEAFNODE_WS` at server/client.go:6867-6872.
- Verdict: RESOLVED — Seven values, case-insensitive. A WebSocket leaf needs `LEAFNODE_WS`; a browser MQTT client needs `MQTT_WS`.

### F-SEC-9: `verify_and_map` tries email SANs, DNS SANs, URI SANs, then the subject DN
- Type: stale
- Severity: low
- Claims: "searches SAN emails first, then DNS names, then the certificate subject" (Legacy docs — TLS Authentication) vs "email SANs first, then DNS SANs, then URI SANs, then the subject DN (RFC 2253)" (Learn — Encryption & TLS)
- Verification: server/auth.go:1331-1424: `case hasEmailAddresses: ... fallthrough; case hasSANs: cert.DNSNames ... fallthrough; case hasURIs: cert.URIs`, then `ldap.FromRawCertSubject(cert.RawSubject)` with `inputDN.Equal(certDN)` / `inputDN.RDNsMatch(certDN)` (auth.go:964-969) and a string fallback (auth.go:1418). Only the first peer certificate is used.
- Verdict: RESOLVED — Legacy omits URI SANs. DN matching is DN-aware (attribute order and spacing do not matter), with a plain-string fallback; "attribute order matters" in the legacy page is stale.

### F-SEC-10: Cluster `permissions` are honoured (deprecated), gateway `permissions` are ignored; route user/password auth exists
- Type: wrong
- Severity: medium
- Claims: "[cluster] `users` and `token` are not supported and prevent startup; `permissions` is ignored" and "TLS Mutual Authentication is the only way of securing routes" (Legacy docs — Clustering Configuration; TLS Authentication in clusters) vs "Gateway ... `permissions` ignored" (Legacy docs — Gateway Configuration)
- Verification: server/opts.go:2053-2097 `parseCluster`: `"Cluster authorization does not allow multiple users"`, `"Cluster authorization does not support tokens"`, `"Cluster authorization does not support callouts"`, then warning `setting "permissions" within cluster authorization block is deprecated` and `if opts.Cluster.Permissions == nil { setClusterPermissions(&opts.Cluster, auth.defaultPermissions) }`; opts.go:3371-3381 `RoutePermissions{Import: perms.Publish, Export: perms.Subscribe}`. Gateway opts.go:2303-2327: same user/token/callout errors and `auth.defaultPermissions` is never read. Cluster username/password: opts.go:2053+ sets `opts.Cluster.Username/Password`.
- Verdict: RESOLVED — For clusters, `authorization.permissions` is NOT ignored: it is deprecated but still builds route import/export permissions (publish→import, subscribe→export) unless a top-level `cluster { permissions }` exists. For gateways it is silently ignored. Routes can be secured with a single user/password as well as mTLS; "only way" is wrong.

### F-SEC-11: Cluster and gateway TLS is always mutual; leafnode TLS is not
- Type: contradiction
- Severity: low
- Claims: "Cluster and gateway routes force mutual verification whether or not `verify` is set" (Learn — Hardening) vs "Configure TLS on cluster, leafnode, and gateway blocks too" with the implication of the same behaviour (Learn — Where to go next (Security))
- Verification: server/opts.go:3285-3300 `getTLSConfig` (used for cluster at 2107 and gateway at 2328): `config.ClientAuth = tls.RequireAndVerifyClientCert; config.RootCAs = config.ClientCAs` with comment "For clusters/gateways, we will force strict verification". Leafnodes use `parseTLS(tk, true)` + `GenTLSConfig` (opts.go:5862-5864), which sets `ClientAuth` only `if tc.Verify`; server/leafnode.go:1018 reads `tlsVerify` from that.
- Verdict: RESOLVED — Mutual TLS is forced for routes and gateways only. A hub `leafnodes { tls {} }` without `verify: true` accepts any leaf that trusts the hub certificate; leaf identity then rests on `authorization`/credentials.

### F-SEC-12: bcrypt detection needs the `$2a$`/`$2b$`/`$2x$`/`$2y$NN$` shape, not just a leading `$`
- Type: wrong
- Severity: low
- Claims: "The server treats strings starting with `$` as potential hash indicators; don't use plaintext passwords starting with a dollar sign" (Learn — Authentication basics) vs none
- Verification: server/auth.go:1677-1686 `validBcryptPrefix = regexp.MustCompile(`^\$2[abxy]\$\d{2}\$.*`)`; `isBcrypt` checks `HasPrefix("$")` then the regex; used for passwords and tokens (auth.go:1688).
- Verdict: RESOLVED — A plaintext password beginning with `$` that does not match `$2[abxy]$NN$` is compared as plaintext. The advice to avoid leading `$` is safe but the stated mechanism is imprecise; the real hazard is the config parser treating unquoted `$NAME` as a variable (Learn — Config management is right about that).

### F-SEC-13: Wildcard subscriptions overlapping a deny are accepted and filtered silently at delivery
- Type: unverifiable
- Severity: low
- Claims: "a wildcard subscription overlapping the deny is accepted and the server filters denied subjects out at delivery time with no error, no gap marker, and no server-log line" (Learn — Authorization) vs none
- Verification: server/client.go:3394-3419 `canSubscribe` loads a deny filter when `subjectHasWildcard(subject)` collides with `c.darray`; client.go:3770-3775 in `deliverMsg`: `if client.mperms != nil && client.checkDenySub(...) { mt.addEgressEvent(client, sub, errMsgTraceSubDeny); return false }`. No log call on that path; only a message-trace egress event when tracing is active.
- Verdict: RESOLVED — Confirmed. The only observability is message tracing (`errMsgTraceSubDeny`).

### F-SEC-14: Bearer tokens are ALLOWED by default at the account level in the JWT model; `nats auth` sets disallow by default
- Type: wrong
- Severity: high
- Claims: "Accounts disallow bearer tokens by default (`Bearer Tokens Allowed: false`); both account and user must be marked `--bearer`" (Learn — Decentralized authentication; Auth and clustering (MQTT)) vs "Bearer JWTs are an explicit opt-in exception" (Learn — Operator mode) and the jwt data model
- Verification: jwt v2.8.2 `account_claims.go:37` `DisallowBearer bool json:"disallow_bearer,omitempty"`; `NewAccountClaims` (account_claims.go:353) initialises `AccountLimits{NoLimit, NoLimit, true, false, ...}` (DisallowBearer = false). server/auth.go:1050-1053 `if juc.BearerToken && acc.failBearer() { return false }`; server/accounts.go:3222-3226 `failBearer` returns `a.disallowBearer`, set only from the JWT (accounts.go:3747). natscli `cli/auth_account_command.go:124` `f.Flag("bearer", "Allows bearer tokens").Default("false")` and `:930` `limits.DisallowBearer = !c.bearerAllowed`, so `nats auth account add` writes `disallow_bearer: true` unless `--bearer` is passed.
- Verdict: RESOLVED — The server/jwt default permits bearer users; only the user needs `bearer_token: true`. The "accounts disallow by default" statement is a `nats auth` CLI default (and not verified for `nsc add account`, which uses the library default unless it sets the flag). Designers issuing accounts programmatically or with nsc must set `disallow_bearer` themselves if they want the lock.

### F-SEC-15: Changing a scoped signing key's template evicts connected users; it does not update them in place
- Type: contradiction
- Severity: medium
- Claims: "updating the key's permissions will immediately update permissions for users signed with that key" (Legacy docs — nsc signing keys) and "they don't have to reload, they don't have to reconnect, they don't have to get new user JWTs" (Talk — Rethink Connectivity Ep 8) vs "a template change reaches every user signed by that key on the next account push, with no creds re-issued" (Learn — Decentralized authentication)
- Verification: server/accounts.go:3474-3479 builds `alteredScope[k]` when `!reflect.DeepEqual(scope, oldScope)`; accounts.go:3932-3951 `if signersChanged { for _, c := range clients { ... if _, ok := alteredScope[sk]; ok { c.closeConnection(AuthenticationViolation) } else if _, ok := a.hasIssuer(sk); !ok { c.closeConnection(AuthenticationViolation) } } }`. The template is applied only at connect time: server/auth.go:1036-1047 `processUserPermissionsTemplate(uSc.Template, juc, acc)`.
- Verdict: RESOLVED — On push, every client signed by the altered scope key (or by a removed key) is closed with `AuthenticationViolation`; the new permissions apply when the client reconnects (clients reconnect automatically, which is why it looks seamless). No creds are re-issued, but "no reconnect" is false. Also confirmed: a user JWT that carries its own permissions but is signed by a scoped key is rejected (jwt `signingkeys.go:94-105` "scoped users require no permissions or limits set").

### F-SEC-16: An account CAN import its own export
- Type: contradiction
- Severity: medium
- Claims: "Accounts cannot do self-imports" / "Self-imports are not valid" (Legacy docs — Multi Tenancy; nsc) vs "Recent server versions let an account import its own export, so latency tracking also covers requests made inside the same account" (Talk — Service monitoring with Helix and Surveyor)
- Verification: server/accounts.go:2769-2774 `checkStreamImportAuthorizedNoLock` and 3172-3178 `checkServiceImportAuthorizedNoLock` contain no same-account check; jwt `imports.go` Validate only rejects an empty account. Test server/accounts_test.go:3858 `TestAccountImportOwnExport` (A exports service `echo` with latency and imports it from A). Git: `c3adf7870` 2022-10-07 "[FIXED] Stack overflow when account imports its own export", first tag v2.9.3.
- Verdict: RESOLVED — Self-imports work since v2.9.3 (before that they crashed rather than being refused). The legacy/nsc statements are stale.

### F-SEC-17: Service imports support wildcards
- Type: stale
- Severity: medium
- Claims: "Currently, a service import can not make use of wildcards" (Legacy docs — Multi Tenancy using Accounts) vs "Typically an account will export a wildcard service" and ADR-30 rules for wildcard tokens in import transforms (Legacy docs; ADR-30)
- Verification: server/accounts.go:1579-1581 only `IsValidSubject(from) || IsValidSubject(to)`; accounts.go:1590-1594 "If the 'to' has a wildcard make sure we pre-transform the 'from' before we check for cycles"; accounts.go:2087-2097 `if subjectHasWildcard(to) { ... transformUntokenize(to) }`. Introduced by `6faf07d58` 2020-07-03 "Account subject mappings and full wildcard support for exports/imports", first tag v2.2.0. The only wildcard ban is the stream-import `prefix` (accounts.go:2630-2634 `ErrStreamImportBadPrefix`).
- Verdict: RESOLVED — Wildcards in service import `subject`/`to` are supported since v2.2.0; the import transform must be reversible (only `{{Wildcard(n)}}`, all wildcards used: server/subject_transform.go:125-127,157-160, errors.go:229,247).

### F-SEC-18: Stream imports accept `to` (mapped import) as well as `prefix`; `prefix` on a service import is silently ignored
- Type: wrong
- Severity: low
- Claims: "`prefix` remaps stream imports ... `to` remaps service imports" (Legacy docs — Multi Tenancy using Accounts) vs "it may rename on the way in (`prefix:` or `to:`)" (Learn — Cross-account)
- Verification: server/opts.go:4487-4503: `case "prefix": ... curStream.pre = pre` / `case "to": ... curService.to = to; curStream.to = to; if curStream.pre != _EMPTY_ { "Stream import can not have a 'prefix' and a 'to' property" }`; opts.go:3952-3959 stream import uses `addMappedStreamImportWithClaim(..., stream.to, ...)` when no prefix. No error string for `prefix` on a service import exists (NOT FOUND).
- Verdict: RESOLVED — A stream import may use either `prefix` or `to` (not both). A service import only honours `to`; a `prefix` there is dropped without warning.

### F-SEC-19: Account-level `max_consumers` is a per-stream cap, not an account-wide total
- Type: contradiction
- Severity: high
- Claims: "`max_consumers` ("per stream(!)")" (Legacy docs — Configuration reference) vs "account limits (`MaxMemory`, `MaxStore`, `MaxStreams`, `MaxConsumers`) size the tenant" and nsc `--js-consumer 100` presented as a tenant limit (Learn — Sizing & resources; Legacy docs — Configuring JetStream)
- Verification: server/jetstream.go:2487-2491 `checkLimits`: `if config.MaxConsumers > 0 && selected.MaxConsumers > 0 && config.MaxConsumers > selected.MaxConsumers { return NewJSMaximumConsumersLimitError() }` (caps a stream's own `max_consumers` setting); server/consumer.go:1128-1136 `maxc := cfg.MaxConsumers; if maxc <= 0 || (selectedLimits.MaxConsumers > 0 && selectedLimits.MaxConsumers < maxc) { maxc = selectedLimits.MaxConsumers }; if maxc > 0 && mset.numLimitableConsumers() >= maxc { return nil, NewJSMaximumConsumersLimitError() }` where `numLimitableConsumers` is per stream (clustered path jetstream_cluster.go:10968-10988 equivalent). `MaxStreams` IS account-wide: jetstream_api.go:4013 `jsa.countStreams(tier, cfg) >= selectedLimits.MaxStreams`.
- Verdict: RESOLVED — The account JetStream limit `max_consumers` bounds the number of consumers on EACH stream in the account (and clamps each stream's `max_consumers`); it is not a tenant-wide total. `max_streams` is account-wide. Capacity planning that treats `max_consumers` as a tenant budget is wrong.

### F-SEC-20: `$JS.API.>` is denied on every leafnode connection for non-system accounts; the "export `$JS.API.>` into the same account" advice is wrong
- Type: dubious
- Severity: medium
- Claims: "On leaf node connections, the nats server adds in denies for `$JS.API.>`" (ADR-19) vs "In your supercluster account config, you need to export the `$JS.API.>` subjects so the leafnodes can access them. On the leafnode side, import those subjects into the same account" (Discussion 7881 — mg1986jp, non-maintainer, [UNVERIFIED])
- Verification: server/leafnode.go:2063-2064 (`addLeafNodeConnection`, runs on both hub and spoke): `if opts.JetStreamDomain != myRemoteDomain || (!opts.JetStream && ...) || sysAcc == nil || acc == nil || forceSysAccDeny { if acc == sysAcc { c.mergeDenyPermissionsLocked(both, denyAllJs) } else { c.mergeDenyPermissionsLocked(both, denyAllClientJs) } } else if acc == sysAcc { /* Extending JetStream domain */ } else { c.mergeDenyPermissionsLocked(both, denyAllClientJs) }` with `denyAllClientJs = []string{"$JS.API.>", "$KV.>", "$OBJ.>"}` (jetstream_api.go:349); only exception leafnode.go:2050-2053 `default_js_domain` set to `""` for the account. Domain-qualified API is what crosses the link: leafnode.go:2115-2133 adds `$JS.<domain>.API` mappings for non-system accounts. Same-domain extension needs the system account shared: derekcollison, https://github.com/nats-io/nats-server/discussions/7584 "If you are trying to extend a NATS system, and hence a JS domain, yes you should connect the system accounts across the leafnode. If you want separate JS domains, do not." and https://github.com/nats-io/nats-server/discussions/5797 "we only suggest to share the system account if you are truly extended a system through a leafnode vs connecting two systems via a leafnode."
- Verdict: RESOLVED — The `$JS.API.>` deny is unconditional for non-system accounts on both ends of every leaf link (hub or spoke, JetStream enabled locally or not); the domain checks only decide whether the SYSTEM-account link gets the wider `$JSC.>`/`$NRG.>` deny or extends the domain. Cross-domain access goes through `$JS.<domain>.API.>` (`external.api` on the mirror/source, or an explicit export of `$JS.<domain>.API.>` to another account). Exporting/importing plain `$JS.API.>` "into the same account" over a leaf does nothing useful and the same account cannot import from itself across a leaf. The dump's line from the same thread ("`service import not authorized` means the JS API subjects were not exported/imported") is correct: server/errors.go:147 `ErrServiceImportAuthorization`.

### F-SEC-21: A leafnode remote binds exactly one local account; the system account is never connected implicitly
- Type: contradiction
- Severity: low
- Claims: "Leaf nodes appear to the cluster as a single account connection" and "leaf nodes do not multiplex between accounts ... The system account is not connected automatically" (Legacy docs — Adaptive Deployment; In Depth JWT Guide) vs "a leaf can use the global account with its own security domain while the hub side binds the connection to account A/B/C" (Talk — NATS Connect Live! Leafnodes)
- Verification: server/leafnode.go:1298-1300 `lacc := remote.LocalAccount; acc, err = s.LookupAccount(lacc)`; leafnode.go:1329-1335 `c.leaf.remote = remote ... c.acc = acc`; opts.go:216-217 `if r.LocalAccount == _EMPTY_ { r.LocalAccount = globalAccountName }`; leafnode.go:194-198 the system account is shared only when a configured remote's `account` equals the system account name (`addRemote(r, r.LocalAccount == sysAccName)`); `Remotes` comes only from config (opts.go:2869).
- Verdict: RESOLVED — All three statements are consistent: one remote = one local account bound to one hub account (via the credentials' account); several remotes may bind several local accounts; sharing `$SYS` requires its own `remote` entry.

### F-SEC-22: Leaf credentials live in the SPOKE's `leafnodes.remotes[].credentials`, not the hub's `leafnodes {}` block
- Type: contradiction
- Severity: medium
- Claims: "A leaf node authenticates to the hub with the same accounts and credentials; the credentials attach in the hub's `leafnodes {}` block" (Learn — Where to go next (Security)) vs "the `leafnodes.remotes` section of the config defines the main server and provides the credentials" (NbE — Leafnode with JWT Auth) and "In production a remote carries `credentials` ... and `account`" (Learn — Leaf nodes)
- Verification: server/opts.go:3114 `case "creds", "credentials":` is parsed inside the `remotes` entry parser (`parseRemoteLeafNodes`), i.e. on the soliciting side; the hub-side `leafnodes { authorization {} }` (opts.go:2852 and surrounding) defines which users/accounts are accepted, not a credentials file.
- Verdict: RESOLVED — Credentials are configured on the connecting (spoke) side under `leafnodes.remotes[].credentials`; the hub accepts them through its `leafnodes.authorization` or the operator/resolver. The Learn where-next sentence is wrong.

### F-SEC-23: The auth-callout xkey is a per-server key, not "one-time per connection"; replay protection is the per-request user NKey
- Type: wrong
- Severity: high
- Claims: "the server generates a one-time XKey per connection which prevents replay attacks" (Legacy docs — Auth Callout) and "re-encrypts the response with a one-time server key to prevent replay attacks" (Talk — NATS 2.10 Webinar) vs "`user_nkey` (server-generated) ... must be the subject of the response (This assists against replay attacks)" (ADR-26) and "Each request pins a one-time `user_nkey`" (Learn — Auth callout)
- Verification: server/server.go:717-722 `if !fips140.Enabled() { xkp, _ = nkeys.CreateCurveKeys(); xpub, _ = xkp.PublicKey() }` at server construction, exposed as `info.XKey` (server.go:742); server/auth_callout.go:80-81 `// These are only set on creation, so lock not needed. xkp, xkey = s.xkp, s.info.XKey`; auth_callout.go:84-86 `// Create a keypair for the user. We will expect this public user to be in the signed response. // This prevents replay attacks. ukp, _ := nkeys.CreateUser()`; response checks auth_callout.go:126-134 `cr.Subject != pub` → "auth callout response is not for expected user", `cr.Audience != s.info.ID` → "not for server".
- Verdict: RESOLVED — The xkey (x25519) pair is generated once per server process and provides confidentiality only. Replay resistance comes from the fresh user NKey generated per authorization request (which must be the response subject) plus the server-ID audience. The request-signing NKey is also per process (server.go:713-715 `nkeys.CreateServer()`).

### F-SEC-24: "Decentralized Auth: Coming soon!" is stale; operator-mode auth callout exists
- Type: stale
- Severity: medium
- Claims: "Decentralized Auth: Coming soon!" (Legacy docs — Auth Callout) vs "works in both server-config mode and operator mode" (ADR-26) and the full operator-mode walk-through (NbE — Auth Callout Decentralized)
- Verification: server/auth_callout.go:170-183 branches on `isOperatorMode` (`issuer_account` allowed, issuer may be any signing key of the target account); server/auth.go:735-737 `if juc != nil { skip = acc.isExternalAuthUser(userID) }`; account claim `externalAuthXKey()` (auth_callout.go:76). Config-mode callout first shipped in v2.10.0 (`2daf90493` 2022-11-30, first tag v2.10.0).
- Verdict: RESOLVED — Both modes are implemented. In operator mode the callout is declared in the AUTH account JWT (`ExternalAuthorization`: auth users, allowed accounts, xkey) and clients present a sentinel credential from that account.

### F-SEC-25: `auth_callout` accepts both `users` and `auth_users` (and `xkey`/`key`, `account`/`acc`)
- Type: contradiction
- Severity: low
- Claims: "`auth_callout { issuer, auth_users, account (default $G), xkey }`" (Legacy docs — Auth Callout; ADR-26) vs "`users` (the users in the auth account allowed to answer callouts)" (NbE — Auth Callout Centralized)
- Verification: server/opts.go:4774 `case "issuer":`, 4779 `case "account", "acc":`, 4781 `case "auth_users", "users":`, 4790 `case "xkey", "key":`, 4795 `case "allowed_accounts":`; default account opts.go:4812-4815 `if ac.Account == _EMPTY_ { ac.Account = globalAccountName }`; FIPS opts.go:4613-4614 `'auth_callout' cannot be configured in FIPS-140 mode`.
- Verdict: RESOLVED — Aliases; not a conflict. `issuer` and `auth_users` are required, `account` defaults to `$G`.

### F-SEC-26: In config mode the callout also runs for config users that authenticated successfully; unmatched users land in `$G` and are always delegated
- Type: unverifiable
- Severity: low
- Claims: "In centralized mode existing users defined in the config file will be ignored" (Legacy docs — Auth Callout) vs "without [`allowed_accounts`], once `auth_callout` is on every connection except `auth_users` goes through it, including config users with correct passwords. Connections matching no config user land in `$G` and always go through the callout" (Learn — Auth callout)
- Verification: server/auth.go:704-748 (deferred block in `processClientOrLeafAuthentication`): the `allowed_accounts` filter is skipped when `c.acc.Name == globalAccountName` (comment: "users that are not found in the config are implicitly bound to the global account ... should be implicitly delegated"); then `if !skip { authorized, reason = s.processClientOrLeafCallout(...) }` runs regardless of the prior `authorized` result, `skip` being true only for `AuthUsers` (config mode) or `acc.isExternalAuthUser` (operator mode). `allowed_accounts` added in v2.11.0 (`6cac3053d` 2024-07-30; absent in v2.10.22/v2.10.26 opts.go). Publish deny for the callout subject: auth.go:760-762 `c.mergeDenyPermissions(pub, []string{AuthCalloutSubject})` for every client in the callout account.
- Verdict: RESOLVED — Learn is exact. "Existing users will be ignored" is the practical consequence: their config verdict is overwritten by the callout verdict unless they are in `auth_users` or their account is outside `allowed_accounts` (2.11+).

### F-SEC-27: Enabling encryption at rest re-encrypts existing plaintext blocks in place; key rotation exists; a wrong master key skips the stream (block-level key failure deletes the block)
- Type: wrong
- Severity: high
- Claims: "Enabling on existing data encrypts only new blocks; back up and restore to re-encrypt old blocks. Restarting with a different or no key fails decryption ("message authentication failed")" (Legacy docs — Encryption at Rest) and "No key rolling in the initial release" (ADR-12) vs "To rotate the master key, restart once with the new key in `key` and the old in `prev_key`; the server re-wraps per-stream keys" and "A wrong at-rest key hides streams; it doesn't destroy them. `Error decrypting our stream metafile: unable to recover keys`" (Learn — Encryption & TLS)
- Verification: server/filestore.go:1155-1169 `loadEncryptionForMsgBlock`: missing key file → "Could be a plaintext conversion. Create the keys" → filestore.go:1204-1208 `if createdKeys { mb.convertToEncrypted() }`; filestore.go:1502-1543 verifies the block parses as plaintext, then `mb.bek.XORKeyStream(buf, buf)` and rewrites it; jetstream.go:1547-1549 logs "Encrypting stream". `convertToEncrypted` first tag v2.9.0 (`8c04adc00`). Rotation: filestore.go:1435-1443 `convertCipher` tries `fs.prf` and `fs.oldprf`, then filestore.go:1482-1494 regenerates keys under the new prf and rewrites the block; stream meta jetstream.go:292-296/1550-1553 removes the old key file to regenerate; `prev_key`/`prev_ek`/`prev_encryption_key` (opts.go:2722-2730) first tag v2.10.0. Wrong key: jetstream.go:326 `fmt.Errorf("unable to recover keys")`, logged jetstream.go:1451 `Error decrypting our stream metafile` and the stream is skipped; the AEAD "message authentication failed" is swallowed (jetstream.go:322, filestore.go:1460). Per-block path: filestore.go:2535-2544 `(err == errBadKeySize || err == errKeyInvalid) ... // We'll revert to deleting this block until there is peer-based recovery ... mb.dirtyCloseWithRemove(true)`.
- Verdict: RESOLVED — Since v2.9.0 existing plaintext blocks are converted on recovery (lazily, per block as it is loaded); "only new blocks / backup-restore" is stale. Key rotation with `prev_key` exists since v2.10.0; ADR-12's "no key rolling" is stale. The visible wrong-key error is `unable to recover keys`, not `message authentication failed`. Caveat to the Learn "doesn't destroy" claim: with a wholly wrong master key the stream metafile fails first and the stream is skipped intact, but if a stream's meta decrypts and an individual block's key cannot be recovered that block is REMOVED (`dirtyCloseWithRemove`). Conversion is lazy, so `prev_key` must stay configured until every block has been loaded once after the rotation restart.

### F-SEC-28: Revocation disconnects immediately on push; "global within 10 ms" and "11th connection denied anywhere" are eventual, unquantified
- Type: dubious
- Severity: low
- Claims: "Pushing a revocation immediately terminates matching connections" (Legacy docs — nsc revocation) and "a revoked user is disconnected within about 10 ms globally ... an 11th connection against a limit of 10 is denied anywhere in the world" (Talk — A New Way of Thinking, NATS 2.0) vs none
- Verification: Revocation: server/accounts.go:3893-3911 on account update `else if ok := ac.IsClaimRevoked(juc); ok { c.sendErrAndDebug("User Authentication Revoked"); c.closeConnection(Revocation) }`; connect-time check auth.go:1109-1112. Account connection limits count remote clients through system-account updates: server/accounts.go:415-418 `a.nrclients += int32(m.Conns) - prev.conns; mtce := a.mconns != jwt.NoLimit && (len(a.clients)-int(a.sysclients)+int(a.nrclients) > int(a.mconns))`, i.e. derived from periodic per-server connection events, not a global atomic counter. No timing bound exists in code.
- Verdict: REQUIRES RESOLUTION — Revocation on push is confirmed. The "10 ms globally" and "denied anywhere in the world" claims are eventual-consistency behaviours with no stated bound; a maintainer statement or a measurement of `$SYS.ACCOUNT.*.CONNS` propagation (and of `accountConnsUpdate` frequency) would settle how tight the limit enforcement is across a supercluster. Treat account `max_connections` as approximately enforced across servers.

### F-SEC-29: `_SYS.>` is no longer a reserved publish prefix; `$SYS.>` is not blocked for ordinary accounts
- Type: stale
- Severity: low
- Claims: "subjects starting with `_SYS` are reserved and publishes there are rejected" (Talk — Zen of High Performance Messaging, ~2016) vs "`$SYS.>` subjects aren't blocked for other accounts; a subscription from an ordinary account is accepted and simply never receives anything" (Learn — Accounts and multitenancy)
- Verification: `git log -S'_SYS.>' -- server/client.go`: added `7730fac9e` 2016-06-16 ("Disallow publish to _SYS.>, these are reserved for internals"), removed `47963303f` 2018-10-23 "First pass at new cluster design" (first tag v2.0.0). At 8e54a5954 no `$SYS`/`_SYS` deny exists in client.go/auth.go/accounts.go/opts.go; the only reserved publish checks are server/client.go:4345-4381 (`$GNR` prefix, `$NRG.` for non-system accounts, and reserved reply prefixes `_R_.`/`$JS.ACK.`/`_GR_.` via `isReservedReply`).
- Verdict: RESOLVED — Pre-2.0 behaviour. Today isolation of `$SYS.>` is purely by account; an application account can publish and subscribe to `$SYS.>` names harmlessly (no responders there).

### F-SEC-30: Config-file auth changes are applied by reload, not by restarting each node
- Type: wrong
- Severity: medium
- Claims: "File-based auth needs files updated on every node and each node must be restarted" (Blog — NATS and Decentralized Security) vs "Adding or changing the `accounts` block can be applied with `nats-server --signal reload`" (NbE — Configuring the System Account) and "reload with `nats-server --signal reload` without disconnecting clients" (Legacy docs — Authentication)
- Verification: server/reload.go:1680 `case "authorization":`, reload.go:1744 `case "accounts":`, reload.go:1632 (`accounts`/`users` allowed to change), with `authOption.IsAuthChange()` (reload.go:303-308) triggering re-authorization of existing clients; the only auth-related non-reloadable key is `no_auth_user` (reload.go:1936-1947).
- Verdict: RESOLVED — Users, permissions and accounts in config are hot-reloadable via SIGHUP/`--signal reload`; the blog's restart claim is wrong (its "three resolvers: memory, file, URL" is also loose: the third built-in resolver is the NATS `full`/`cache` resolver, which is file-backed).

### F-SEC-31: Full-resolver server defaults are 1 m sync interval and unlimited JWTs; "2m / 1000 / allow_delete" are generated-config values
- Type: contradiction
- Severity: low
- Claims: "`full` resolver: `allow_delete` (default false ...), `interval "2m"` ..., `limit 1000` JWTs" (Legacy docs — Account lookup using Resolver) vs "Generated full resolver config uses `allow_delete: true`, `interval: "2m"`, `limit: 1000`" (Learn — Operator mode)
- Verification: server/opts.go:1565-1571 initial `del := false; limit := int64(0); ttl := time.Duration(0); sync := time.Duration(0)`; server/accounts.go:4611-4617 `NewDirAccResolver`: `if limit == 0 { limit = math.MaxInt64 }; if syncInterval <= 0 { syncInterval = time.Minute }`; cache: accounts.go:4701-4704 `if limit <= 0 { limit = 1_000 }`, ttl passed through (0 = no expiry). `DEFAULT_ACCOUNT_FETCH_TIMEOUT = 1900 * time.Millisecond` (const.go:250).
- Verdict: RESOLVED — Server defaults: full resolver sync every 1 m, no JWT limit, deletes disabled (renamed to `.delete` when `allow_delete` without `hard_delete`); cache resolver limit 1000, no TTL. The 2 m / 1000 figures are what `nsc generate config` / `nats auth` emit, not server defaults.

### F-SEC-32: The new consumer-create subject cannot distinguish durable from named ephemeral; multi-filter consumers must omit the filter token
- Type: dubious
- Severity: low
- Claims: "The API subject alone does not distinguish durable from ephemeral creation (both use `CONSUMER.CREATE.<stream>.<name>`)" (Discussion — 0xeb-bp, [UNVERIFIED]) vs "multiple filters use `$JS.API.CONSUMER.DURABLE.CREATE.{stream}.{consumer}` without the filter token" (Legacy docs — Consumers)
- Verification: server/jetstream_api.go:121-129 subjects (`CONSUMER.CREATE.*`, `CONSUMER.CREATE.*.>`, `CONSUMER.DURABLE.CREATE.*.*`); jetstream_api.go:4780-4788 `if rt == ccNew { if req.Config.Durable != _EMPTY_ { if consumerName != req.Config.Durable { ...mismatch } } req.Config.Name = consumerName }` — durable is optional on the new form; jetstream_api.go:4797-4809 `if filteredSubject != _EMPTY_ && len(req.Config.FilterSubjects) != 0 { NewJSConsumerMultipleFiltersNotAllowedError() }` (errors.json 10137).
- Verdict: RESOLVED — Confirmed: on `$JS.API.CONSUMER.CREATE.<stream>.<name>` durability is decided by the request body, so a subject-only permission cannot block durables without also blocking named ephemerals; only the legacy `DURABLE.CREATE` form is durable-only. Multi-filter consumers must use a subject without the filter token; either `CONSUMER.CREATE.<stream>.<name>` or the legacy `DURABLE.CREATE` works, so the legacy page is incomplete rather than wrong.

### F-SEC-33: Version boundaries for security features (checked against tagged files)
- Type: stale
- Severity: medium
- Claims: "TLS-first handshake (2.10.0)" (Legacy docs — Leaf Nodes) vs "(2.10.4)" (Legacy docs — Enabling TLS; ADR-40); "From server 2.12.3 an MQTT connection is implicitly allowed to subscribe to `$MQTT.sub.` ...; before 2.12.3 (including 2.10 and 2.11) you must allow `$MQTT.sub.>`" (Learn — Auth and clustering (MQTT)); "Encryption at rest: `cipher` `chacha`/`chachapoly` or `aes` (2.3.0)" (Legacy docs — Configuration) vs "AES-GCM added ... in 2.9" (Blog — NATS Server 2.9 Release); "`user_cookie`/`pass_cookie`/`token_cookie` arrived in 2.11" (Learn — Browsers and origins); "`allowed_accounts` (2.11+)" (Learn — Auth callout); ADR-55 proxies
- Verification: `git show v2.10.3:server/opts.go` has 0 occurrences of `o.TLSHandshakeFirst`, v2.10.4 has 2 (client TLS-first = v2.10.4); `git show v2.9.25:server/leafnode.go` 0 vs v2.10.0 5 occurrences of `TLSHandshakeFirst` (leaf TLS-first = v2.10.0). MQTT implicit allow ("implicitly allow anything" in client.go): absent in v2.12.2, present in v2.12.3 (broad `$MQTT.` prefix), first 2.11 patch with it is v2.11.12, absent from every v2.10.x (v2.10.29 = 0); narrowed to `$MQTT.sub.`/`$MQTT.deliver.pubrel.` in v2.12.15/v2.14.0 (server/client.go:3355-3362; deny lists still apply). `"cipher"` absent in v2.3.0 and v2.8.4 opts.go; `827b34a77` 2022-08-15 "Add support for AES cipher" first tag v2.9.0; `key`/`encryption_key` first tag v2.3.0. Cookies: `8721d7483` 2024-02-26 first tag v2.11.0. `allowed_accounts`: absent in v2.10.22/v2.10.26, present in v2.11.0. Proxies: `778987ca9` 2025-08-06 "[ADDED] Trusted proxies support" first tag v2.12.0; `case "proxies"` opts.go:1909, `proxy_required` opts.go:2987, `proxy_sig` client.go:703. TPM (`keys_file`, `encryption_password`, `pcr` default 22 at jetstream.go:409-415): first tag v2.11.0. `connection_rate_limit`: first tag v2.7.0. Auth callout: first tag v2.10.0.
- Verdict: RESOLVED — Leaf TLS-first 2.10.0, client TLS-first 2.10.4 (both legacy statements are right for their own scope). MQTT implicit `$MQTT.sub.` permission: 2.12.3+ AND 2.11.12+ (the Learn "including 2.11" is wrong for 2.11.12 and later; correct for all 2.10). Encryption at rest 2.3.0 with ChaCha20-Poly1305 only; the `cipher` option and AES-GCM are 2.9.0. Cookies 2.11.0, `allowed_accounts` 2.11.0, TPM 2.11.0, proxies 2.12.0, callout 2.10.0, rate limit 2.7.0.

### F-SEC-34: MQTT requires `server_name` only when clustering or gateways are also enabled
- Type: wrong
- Severity: low
- Claims: "MQTT requires a unique `server_name`" (Legacy docs — MQTT) vs none
- Verification: server/mqtt.go:698-700 `if o.ServerName == _EMPTY_ && (o.Cluster.Port != 0 || o.Gateway.Port != 0) { return errMQTTServerNameMustBeSet }`; mqtt.go:229 `"mqtt requires server name to be explicitly set"`.
- Verdict: RESOLVED — A standalone MQTT-enabled server starts without `server_name`; it is mandatory once the server is clustered or has gateways.

### F-SEC-35: Both `$SYS.ACCOUNT.<id>.CLAIMS.UPDATE` and `$SYS.REQ.CLAIMS.UPDATE` exist
- Type: contradiction
- Severity: low
- Claims: "`$SYS.ACCOUNT.<id>.CLAIMS.UPDATE` is how account servers push updated JWT claims" (Legacy docs — System Events) vs "`$SYS.REQ.CLAIMS.UPDATE` to push a JWT" (Legacy docs — Resolver; NbE — Programmatic NKeys and JWTs)
- Verification: server/events.go:46 `accClaimsReqSubj = "$SYS.REQ.CLAIMS.UPDATE"`, :47 `accDeleteReqSubj = "$SYS.REQ.CLAIMS.DELETE"`, :55 `accUpdateEventSubjOld = "$SYS.ACCOUNT.%s.CLAIMS.UPDATE"`, :56 `accUpdateEventSubjNew = "$SYS.REQ.ACCOUNT.%s.CLAIMS.UPDATE"`, :43 `accLookupReqSubj = "$SYS.REQ.ACCOUNT.%s.CLAIMS.LOOKUP"`, :76 `userDirectInfoSubj = "$SYS.REQ.USER.INFO"`. `$JS.API.ACCOUNT.PURGE.*` at jetstream_api.go:218-219.
- Verdict: RESOLVED — Three update subjects are served (old per-account, new per-account, and the generic request form); not a conflict.

### F-SEC-36: The "bearer tokens with RS256" model is a third-party fork, not stock server behaviour
- Type: dubious
- Severity: low
- Claims: "They needed RS256 and ed25519 signing/verification ... a verified token creates an ephemeral in-memory user ... Their fork honored the plain auth token as a fallback" (Talk — NATS Connect Live! Bearer Tokens in NATS, Provide) vs "NATS JWTs must be Ed25519-signed; Issuer and Subject are public NKEYs" (Legacy docs — Decentralized JWT)
- Verification: server/auth.go:1085-1093 the only bearer path is a NATS user JWT (`juc.BearerToken`) decoded with `jwt.DecodeUserClaims`; ADR-14 header is fixed `{"typ":"JWT","alg":"ed25519-nkey"}`; no RSA verification exists in server/auth.go (NOT FOUND for `rsa`/`RS256`).
- Verdict: RESOLVED — The talk describes Provide's fork; stock nats-server accepts only Ed25519/NKey-signed NATS JWTs. Do not cite it as a supported model.

### F-SEC-37: Client-library credential-rotation behaviours and "callout libraries recommend dropping" are outside the server source
- Type: unverifiable
- Severity: low
- Claims: "nats.go, nats.java, and nats.py re-read a `.creds` path on every attempt ...; nats.js, nats.rs, and nats.net load once and need the callback form" (Learn — TLS & Auth) and "The callout libraries recommend dropping requests for bad credentials, because the added delay slows brute-force guessing" (Learn — Auth callout) vs none
- Verification: none available in nats-server or the maintainer threads. Server side confirmed only that the server never re-reads anything for a live connection (identity fixed at connect, client.go:2317-2334 `processConnect`), and that a dropped callout request makes the client wait out `authorization.timeout` (auth_callout.go:443-444).
- Verdict: REQUIRES RESOLUTION — Verify per client repo (`UserCredentials` implementations in nats.go `nats.go`, nats.java `Nats.credentials`, nats.py `nkeys`/`user_credentials`, nats.js `credsAuthenticator`, nats.rs `ConnectOptions::with_credentials_file`, nats.net `NatsAuthOpts`) and the callout helper library README (nats-io/nats-auth-callout or the jwt `auth_callout` helpers) for the "drop" recommendation.

### F-SEC-38: "Known issue: across accounts, push consumers are not supported" (JetStream on leaf nodes) has no current backing
- Type: stale
- Severity: low
- Claims: "Known issue: Currently, across accounts, push consumer are not supported." (Legacy docs — JetStream on Leaf Nodes (domains)) vs the cross-account minimum exports that include a delivery stream `deliver.<acc>.<domain>.>` for push delivery (same page) and ADR-59's cross-account sourcing recipe
- Verification: none available (no maintainer thread in the dump addresses it; no server code path was found that refuses push consumers on imported JS APIs).
- Verdict: REQUIRES RESOLUTION — Test: export `$JS.<domain>.API.>` + a `deliver.>` stream from account A, import into B, create a push consumer from B with a `deliver_subject` under the imported stream subject; or find the issue this note referenced (search nats-server issues for "push consumer" + "import").

### F-SEC-39: Exporting `$SYS.ACCOUNT.*.CONNECT/DISCONNECT` from the system account to another account
- Type: dubious
- Severity: low
- Claims: "Export `$SYS.ACCOUNT.*.CONNECT/DISCONNECT` to another account and capture them in a no-ack stream" (Discussion — borjaetxebarria, non-maintainer, [UNVERIFIED]) vs "System account: It is NOT recommended to use this account to facilitate communication between your own applications" (Legacy docs — In Depth JWT Guide)
- Verification: none available for the specific export. Related facts only: system events are published by the internal system client on `$SYS.ACCOUNT.<acc>.CONNECT` (events.go) inside the system account; stream exports are a generic account feature with no exclusion for `$SYS` in server/accounts.go `checkStreamExportApproved`.
- Verdict: REQUIRES RESOLUTION — Confirm with a two-account config (stream export of `$SYS.ACCOUNT.*.CONNECT` from `$SYS`, import into an app account) that events arrive; it is mechanically plausible but the "no-ack stream avoids duplicate processing" rationale is the poster's, not a maintainer's.

### F-SEC-40: `Nats-Request-Info` on cross-account service requests is gated by the import's `share` flag
- Type: unverifiable
- Severity: low
- Claims: "Every request across an import carries a system-vouched client info header; by default it shares little (location, account), but the importer can opt in to share everything" (Talk — Short break and Q&A, RethinkConn '22) vs none
- Verification: server/accounts.go:163 `const ClientInfoHdr = "Nats-Request-Info"`; accounts.go:1412 `Requestor: requestor.getClientInfo(si.share)`; the flag is parsed at server/opts.go:4505 `case "share":` on a service import (opts.go:4486 `curService.share = share`) and stored on the import (accounts.go:183 `share bool`, 1718 `si.share = allow`).
- Verdict: RESOLVED — The header exists and the amount of client detail is controlled by the importing account's `share: true` on the service import; the server, not the client, produces it.

### F-SEC-41: JetStream on `$G` is automatic only when no non-system accounts exist; the system account can never run JetStream
- Type: contradiction
- Severity: low
- Claims: "Without accounts enabled, all users in the server would have access to JetStream" (Legacy docs — Configuring JetStream) vs "On a server running JetStream, declaring an `accounts` block makes JetStream opt-in per account" (Learn — Accounts and multitenancy) vs "The only requirement to enable JetStream is setting the disk and memory limits to anything other than zero" (NbE — Programmatic NKeys and JWTs)
- Verification: server/jetstream.go:743-752 `if s.globalAccountOnly() { ... gacc.jsLimits = defaultJSAccountTiers ... s.configJetStream(gacc, tq) }`; server.go:2477-2483 also enables `$G` when the only accounts are `$SYS`+`$G` in a non-standalone server; jetstream.go:822-844 accounts without a `jetstream` key get only the INFO service import; jetstream.go:1169 `"jetstream can not be enabled on the system account"`. JWT accounts: jwt `account_claims.go:96-107` `IsJSEnabled` = any tier with `MemoryStorage != 0 || DiskStorage != 0` (so -1 enables), used at accounts.go:3768.
- Verdict: RESOLVED — All three are correct within their mode: config mode enables `$G` implicitly only with no tenant accounts, and otherwise needs `jetstream: enabled` (or a limits map) per account; JWT mode enables on any non-zero memory or disk limit.

## Summary

Findings: 41.

By type: contradiction 13 (F-2, 3, 4, 11, 15, 16, 19, 21, 22, 25, 31, 35, 41), wrong 10 (F-1, 6, 10, 12, 14, 18, 23, 27, 30, 34), stale 7 (F-8, 9, 17, 24, 29, 33, 38), unverifiable 6 (F-5, 7, 13, 26, 37, 40), dubious 5 (F-20, 28, 32, 36, 39).

By verdict: RESOLVED 36, REQUIRES RESOLUTION 5 (F-7, 28, 37, 38, 39).

By severity: high 5 (F-1, 14, 19, 23, 27), medium 11 (F-2, 6, 10, 15, 16, 17, 20, 22, 24, 30, 33), low 25.

### REQUIRES RESOLUTION

| ID | Title | Severity | What would settle it |
|----|-------|----------|----------------------|
| F-SEC-7 | Does `nats-server -t` validate `no_auth_user` existence | low | Trace `main.go` config-check path to `validateOptions`, or run `-t` with a bogus `no_auth_user` |
| F-SEC-28 | "Revoked within 10 ms globally" / "11th connection denied anywhere" | low | Maintainer statement or measurement of `$SYS.ACCOUNT.*.CONNS` propagation; code shows eventual accounting via `nrclients` |
| F-SEC-37 | Client `.creds` re-read behaviour per language; "callout libraries recommend dropping" | low | Read each client's credential loader; read the callout helper library docs |
| F-SEC-38 | "Push consumers not supported across accounts" (JetStream on leaf nodes) | low | Reproduce with an exported `$JS.<domain>.API.>` + `deliver.>` stream; or locate the original issue |
| F-SEC-39 | Exporting `$SYS.ACCOUNT.*.CONNECT` from `$SYS` to an app account | low | Two-account config test; no maintainer backing for the pattern |

### Ten highest-severity RESOLVED corrections

1. F-SEC-1 — `allow_responses: true` expires 2 minutes after the request (const.go:232), not "no time limit"; use a negative `expires` for unlimited.
2. F-SEC-14 — JWT accounts ALLOW bearer users by default (`DisallowBearer` zero value); only `nats auth account add` writes `disallow_bearer: true` by default.
3. F-SEC-19 — Account `max_consumers` is a per-stream cap (consumer.go:1128-1136), not a tenant-wide total; `max_streams` is account-wide.
4. F-SEC-23 — The auth-callout xkey is a per-process key; replay protection is the per-request user NKey that must be the response subject, plus the server-ID audience.
5. F-SEC-27 — Enabling encryption at rest converts existing plaintext blocks in place (since 2.9.0); `prev_key` rotation exists (2.10.0); wrong-key error is `unable to recover keys`; a per-block key failure deletes that block.
6. F-SEC-10 — Cluster `authorization.permissions` are honoured (deprecated) as route import/export permissions; gateway permissions are ignored; routes can use user/password, not only mTLS.
7. F-SEC-15 — Editing a scoped signing key's template closes every connected user signed by it (`AuthenticationViolation`); permissions change on reconnect, not in place.
8. F-SEC-22 — Leaf credentials are configured on the spoke in `leafnodes.remotes[].credentials`, not in the hub's `leafnodes {}` block.
9. F-SEC-20 — `$JS.API.>` is denied on every leaf link for non-system accounts regardless of hub/spoke or local JetStream; cross-domain access uses `$JS.<domain>.API.>`; the thread advice to export/import `$JS.API.>` "into the same account" is wrong.
10. F-SEC-33 — MQTT implicit `$MQTT.sub.` permission exists in 2.12.3+ and 2.11.12+ (not in any 2.10); leaf TLS-first is 2.10.0, client TLS-first 2.10.4; AES cipher is 2.9.0, not 2.3.0.

Also noteworthy (medium): F-SEC-2 (auth timeout is `tls_timeout + 1s` when TLS is on, which also governs the callout deadline), F-SEC-6 (`no_auth_user` works with NKeys, not bcrypt), F-SEC-16/17 (self-imports and wildcard service imports are supported; legacy pages are stale), F-SEC-24 ("Decentralized Auth: Coming soon!" is stale), F-SEC-30 (config auth is hot-reloadable; the blog's "restart each node" is wrong).


<!-- ===== KVOBJ ===== -->

# Review: KVOBJ

Verification bases used: nats-server @ 8e54a5954 (v2.14.0-519), nats.go @ 2e0e3d9 (2026-09-07), nats.rs @ 7b0fa6af, natscli 0.4.1 (nats.go-based), live run against nats-server v2.14.0 (single node, `-js`). jsm.go has no KV/Object code (the pointer to jsm.go/kv.go in the brief is wrong; KV/Object logic lives in nats.go jetstream/kv.go and jetstream/object.go).

### F-KVOBJ-1: KV read consistency — "immediately consistent" / "strong consistency" vs ADR-8 "no read-after-write"
- Type: contradiction
- Severity: high
- Claims: "Buckets are immediately (as opposed to eventually) consistent" and "Monotonic writes/reads guaranteed" (Legacy docs — Key/Value store (concept)); "strong consistency guarantees within clusters" (Blog — Vitrifi, third-party); "read-after-write safety" (Blog — JetStream for KV Tech Preview, 2021) vs "We do not provide read-after-write consistency. Reads are performed directly to any replica, including out of date ones ... multiple reads of the same key can give different values" (ADR-8); "reads through direct get requests may be served by followers or mirrors" (Legacy docs — same page, next paragraph).
- Verification: server/stream.go:5054-5075 `subscribeToDirect` registers the direct-get handlers as a queue subscription (`dgetGroup = sysGroup`, stream.go:647) on every stream member; jetstream_cluster.go:4107-4133 followers join the queue group once ≥90% synced (`syncThreshold = 90.0`) and are never gated again; server/stream.go:5865-5917 `processDirectGetRequest` and :6103 `getDirectRequest` contain no leader/currency check — they answer from local `store.LoadLastMsg`. nats.go jetstream/stream.go:577-591 sends KV gets to `$JS.API.DIRECT.GET...` whenever `AllowDirect` is true; jetstream/kv.go:687 sets `AllowDirect: true` on every bucket. Mirrors with `mirror_direct` join the same queue group for the ORIGIN's subject (stream.go:5091-5119).
- Verdict: RESOLVED — KV `Get` is served by any replica or opted-in mirror that happens to receive the queue-group request; there is no read-after-write and no monotonic-read guarantee across successive gets. The legacy "immediately consistent" and "monotonic reads" sentences, the Vitrifi "strong consistency" line and the 2021 preview's "read-after-write safety" are wrong/stale. Writes are strongly ordered (single leader, Raft), which is the only sense in which "consistent" holds.

### F-KVOBJ-2: "We do not support disabling direct get on any buckets" vs leader reads; "AllowDirect auto-on for KV"
- Type: contradiction
- Severity: medium
- Claims: "we do not support disabling direct get on any buckets" (ADR-8) vs "Send gets to the underlying stream leader for stronger consistency" (Legacy docs — Key/Value store (concept)) and "`allow_direct: true` can be modified out-of-band" (ADR-8); "`AllowDirect` ... auto-on for KV" (Blog — NATS Server 2.9 Release); "the server does not know a stream is a KV bucket" (Talk — EP05).
- Verification: nats.go jetstream/kv.go:1605 `useDirect: info.Config.AllowDirect`; jetstream/stream.go:577-595: if `AllowDirect` is false the client falls back to `$JS.API.STREAM.MSG.GET.<stream>` (leader-only API). server/stream.go:2657-2664 unsubscribes the direct handlers when `allow_direct` is edited to false. Server has no `KV_` special-casing at all: the only `$KV` references are the deny lists in jetstream_api.go:349-372; `AllowDirect` is set by the client (kv.go:687) and back-filled on pre-2.9 buckets by the client (kv.go:548-560). wallyqs's "seeing `$JS.API.STREAM.MSG.GET` means the client is not using allow_direct" (discussion 6397) matches this code path.
- Verdict: RESOLVED — Turning `allow_direct` off on the backing stream is the supported way to force leader reads with nats.go and the CLI (they fall back to the leader-only message-get API). ADR-8's "we do not support disabling" describes client intent, not behaviour. "Auto-on for KV" is client-side, not server-side.

### F-KVOBJ-3: History maximum 64 is a client validation, not a server limit
- Type: dubious
- Severity: low
- Claims: "The maximum history size is 64" (Legacy developer guide; ADR-8; Learn — Your first bucket "no higher"; natscli `--history` 1..64) vs "A bucket's history can be raised after creation by editing the underlying stream — ripienaar" (discussion 3466).
- Verification: nats.go jetstream/kv.go:494 `KeyValueMaxHistory = 64`, :625-626 `ErrHistoryTooLarge` on create only; bind (`KeyValue()`) only checks `MaxMsgsPerSubject < 1` (kv.go:523-525). nats.rs async-nats/src/jetstream/kv/mod.rs:95 `MAX_HISTORY: i64 = 64`. Live CLI: `nats kv add H65 --history 65` → "history: must be less than or equal to 64". Server `MaxMsgsPer` has no such bound (stream.go checkStreamCfg has no 64 check). ripienaar 2022-09 https://github.com/nats-io/nats-server/discussions/3466: "you can just stream edit the history property higher post creation, clients wont fail if they find a bucket with higher history".
- Verdict: RESOLVED — 64 is enforced by clients at create time; the backing stream accepts any `max_msgs_per_subject` and clients bind to it without complaint. Docs should say "clients cap history at 64 on create" rather than "the maximum history is 64".

### F-KVOBJ-4: Per-key TTL version boundary and prerequisites
- Type: stale
- Severity: medium
- Claims: "per-key TTL 'auto expiring of keys'" (Blog — KV Tech Preview 2021, 2.3.2); "TTL is applied at the bucket level to all entries ... create multiple buckets" (Blog — Building Distributed State Stores, third-party, 2026-02); "TTL/expiry currently exists at bucket level only; per-key TTLs are a future server feature" (Talk — JetStream KV alternative to Redis); "a stream or KV bucket has a single TTL" (Talk — RethinkConn 2024 roadmap) vs "Per-key TTL needs nats-server 2.11 or newer ... limit markers on before any key can carry a TTL" (Learn — TTL and limits); ADR-48 "API level >= 1".
- Verification: server commit d517d30de "Initial support for per-message TTLs" is first in tag v2.11.0 (`git tag --contains`); server/stream.go:6514-6517 rejects `Nats-TTL` with `NewJSMessageTTLDisabledError` (errors.json:1645, code 10166) unless `allow_msg_ttl`; nats.go jetstream/kv.go:661-668 sets `allow_msg_ttl` + `subject_delete_marker_ttl` only when `LimitMarkerTTL != 0` and refuses with `ErrLimitMarkerTTLNotSupported` if `AccountInfo().API.Level < 1`; `KeyTTL` is a `KVCreateOpt` only (jetstream/kv_options.go:126). Live (2.14.0): `nats kv purge ORIG color --ttl 5s` on a bucket without limit markers → `err_code=10166 per-message TTL is disabled`.
- Verdict: RESOLVED — Per-key TTL exists only on 2.11+ (API level 1) and only on buckets created/updated with a limit-marker TTL; the 2021 preview's "per key TTL" was the bucket `max_age`; the third-party blog's "bucket-level only" and the two talks are stale. Note that the current server reports API level 5 (server/jetstream_versioning.go:20).

### F-KVOBJ-5: "Since 2.14 PURGE can carry Nats-TTL" is the wrong version; purge TTL has a floor
- Type: wrong
- Severity: medium
- Claims: "since 2.14 PURGE can carry `Nats-TTL` to auto-delete the marker and avoid `nats kv compact`" (Legacy docs — Headers, version context "up to 2.14") vs ADR-48 "Since NATS Server 2.11 ... `Purge()` accept a TTL".
- Verification: TTL parsing on every stored message including rollup markers landed in v2.11.0 (server/stream.go:7092-7112 `getMessageTTL` → `StoreMsg(..., ttl)`; tests "TTL and rollup behaviour" commit 5bbdd87ab is in v2.11.0). nats.go `PurgeTTL` (jetstream/kv_options.go:110) publishes `KV-Operation: PURGE` + `Nats-Rollup: sub` + `Nats-TTL` (jetstream/kv.go:1181-1189). Additionally server/stream.go:7104-7111 (commit c86d27c29, v2.12.0) silently raises a message TTL to at least `subject_delete_marker_ttl` unless `max_msgs_per_subject == 1`.
- Verdict: RESOLVED — Purge-with-TTL is a 2.11+ feature (2.14 is wrong). On buckets with history > 1 and server ≥ 2.12 the purge marker's TTL is floored to the bucket's limit-marker TTL.

### F-KVOBJ-6: Marker reason for per-key TTL expiry is `MaxAge`, mapped to PURGE
- Type: dubious
- Severity: low
- Claims: "When a per-key TTL fires, the server leaves a marker with reason `MaxAge` ... watchers receive it as a purge" (Learn — TTL and limits) vs ADR-43 "Nats-Marker-Reason: MaxAge" only described for MaxAge; blog "expiry creates a short-lived delete marker" (Per-Message TTL blog).
- Verification: server/filestore.go:7024-7067 per-message TTL expiries (timed hash wheel) flow through `handleRemovalOrSdm`, which writes `Nats-Marker-Reason: MaxAge`, `Nats-TTL: <sdmTTL>`, `Nats-Rollup: sub` (filestore.go:7120-7135; memstore.go:1391 same). nats.go jetstream/kv.go:971-977 maps `MaxAge`/`Purge` → `KeyValuePurge`, `Remove` → `KeyValueDelete`.
- Verdict: RESOLVED — Confirmed: both bucket `max_age` and per-key TTL expiry produce a `MaxAge` marker that KV clients surface as a PURGE operation; the marker itself is a rollup, so no history survives an expiry.

### F-KVOBJ-7: "Bucket MaxAge takes precedence over a longer per-key TTL — MauriceVanVeen" is mis-attributed
- Type: dubious
- Severity: low
- Claims: "Bucket MaxAge takes precedence over a longer per-key TTL; set MaxAge longer than any per-key TTL — MauriceVanVeen" (GitHub — Key Value with TTL) vs thread text.
- Verification: https://github.com/nats-io/nats-server/discussions/7264 — the "MaxAge takes precedence" sentence is the asker alberk8's; MauriceVanVeen wrote "This is expected based on the MaxAge of 1m, which removes any message after that TTL. If you'd instead use 10m for the MaxAge, then the message and delete marker don't get removed earlier" and "when a message is removed due to MaxAge or per-message TTL, the limit marker TTL is how long the created delete marker will stay". Server/filestore.go:6970-7030 `expireMsgs` applies `max_age` and per-message TTL independently; whichever fires first removes the message.
- Verdict: RESOLVED — Substance is right (the shorter of bucket `max_age` and key TTL wins, and `max_age` also removes markers), but quote it as a maintainer paraphrase, not a Maurice quote.

### F-KVOBJ-8: Limit-marker TTL minimum: "> 1 s" vs ">= 1 s"
- Type: contradiction
- Severity: low
- Claims: "`subject_delete_marker_ttl` > 1 s" (ADR-8) vs "must larger than or equal to 1 second" (ADR-48).
- Verification: server/stream.go:1839-1841 `if cfg.SubjectDeleteMarkerTTL < time.Second` → "subject delete marker TTL must be at least 1 second".
- Verdict: RESOLVED — Minimum is exactly 1 s (inclusive).

### F-KVOBJ-9: KV latency figures (1-5 ms vs ~40 µs vs "tens of µs")
- Type: unverifiable
- Severity: high
- Claims: "KV operations typically land in the 1-5ms range for local deployments, while Redis serves requests in microseconds" (Blog — Building Distributed State Stores, third-party 2026-02) vs "in-cache get is around 40 microseconds plus the network round trip ... on-disk reads around 1 to 1.5 milliseconds" (Blog — Replace Redis with NATS, Synadia 2026-07) vs "24,000 sync ops/s (~41.7 µs) vs Redis ~18 µs ... uncached block costs a couple of milliseconds" (GitHub — jnmoyne, nats.go discussion 1507) vs "tens of microseconds over loopback" (Talk — Kafka Compared Pt 2).
- Verification: No code can settle a latency number. Maintainer data: jnmoyne 2023-12-27 https://github.com/nats-io/nats.go/discussions/1507 "almost exactly 24,000 synchronous operations per second meaning an average latency of 41.666 micro-seconds per get. The redis benchmark reports an average of 18 micro-seconds" and "NATS could be a few percent faster than Redis on writes, and a few percent slower on reads (assuming ... the block is already cached)".
- Verdict: REQUIRES RESOLUTION — The third-party "1-5 ms" figure contradicts the maintainer's loopback measurement by two orders of magnitude and should not be used; but none of the numbers are guarantees. Docs must either quote the maintainer benchmark with its conditions (loopback, M1 Ultra, cached block or memory storage) or carry no numbers. A reproducible `nats bench kv` run on documented hardware would settle it.

### F-KVOBJ-10: Maintainers disagree on "KV as a cache"
- Type: contradiction
- Severity: medium
- Claims: "I don't really think a cache is what our KV is going to be the best at ... Nats KV isn't optimised as a very fast cache imo" (ripienaar) vs "I disagree with R.I., no reason it can not be very fast IMO. We can be on par with Redis when there is a real network" (derekcollison) — both https://github.com/nats-io/nats.go/discussions/1507, 2023-12-25; also "KV (Redis replacement)" (Talk — We need to talk about Microservices) and "positioned as a Redis alternative" (Blog — Per-Message TTL).
- Verification: Explicit, opposed maintainer statements in one thread; jnmoyne's measurements in the same thread support derekcollison on raw latency. Code: F-KVOBJ-1 (any-replica reads), F-KVOBJ-14 (delete markers are messages), discussion 5334 ripienaar "listing keys is not fast".
- Verdict: RESOLVED — Report both: the design goal is replicated distributed state, not a cache (ripienaar); raw get/put latency is comparable to Redis over a real network (derekcollison, jnmoyne data), with caveats: no value-type ops, key listing/compaction are slow client-side scans, and reads are not read-after-write. Do not write "KV is a Redis replacement" unqualified.

### F-KVOBJ-11: "replicas: 3 survives two simultaneous node failures" [DUBIOUS]
- Type: wrong
- Severity: medium
- Claims: "`replicas: 3` survives two simultaneous node failures" (Blog — Building Distributed State Stores, third-party) vs "with R3 you can lose one node and still accept writes, lose two and still serve reads" (Talk — JetStream KV alternative to Redis).
- Verification: server/raft.go:1236 `qn := n.csz/2 + 1` — R3 needs 2 live members to commit writes. Direct gets are not gated by quorum or leadership: server/stream.go:5865-5917 has no such check; the only gate is the initial ≥90% sync before a follower joins the queue group (jetstream_cluster.go:4111-4133).
- Verdict: RESOLVED — R3 tolerates one failure for writes/consumers; a lone surviving replica keeps answering KV gets (possibly stale). The talk is right; the blog is wrong for writes.

### F-KVOBJ-12: KV mirror buckets — ADR-57 vs ADR-58 vs "transparent read replica" talk; same-domain mirror bucket cannot serve Get
- Type: contradiction
- Severity: high
- Claims: "Prefix the mirror stream name with `KV_` ... Enable `MirrorDirect`" (ADR-57) vs "Mirrors are not called `Bucket` and may not have the `KV_` string name prefix ... we have done this in the leafnode mode and decided it's not a good pattern" (ADR-58) vs "A KV mirror is an automatic read replica: NATS serves reads from the closest mirror and forwards writes to the origin leader with no application change" (Talk — JetStream KV alternative to Redis).
- Verification: nats.go jetstream/kv.go:696-702 `CreateKeyValue` with `Mirror` prefixes the ORIGIN name with `KV_`, sets `MirrorDirect: true`, adds no subject transform; kv.go:1608-1618 `mapStreamToKVS` rewrites the read prefix to the origin's `$KV.<origin>.` ONLY when `Mirror.External.APIPrefix` is set (cross-domain/account); for a same-domain mirror bucket `pre` stays `$KV.<mirror>.` while the store holds `$KV.<origin>.*`. Live on nats-server 2.14.0 with natscli 0.4.1: `nats kv add MIR --mirror ORIG` then `nats kv get MIR color` → "key not found"; `nats stream subjects KV_MIR` shows `$KV.ORIG.color`; `nats kv put MIR color red` succeeds and lands in ORIG (put prefix = origin). The working transparent-replica model is nats.go jetstream/test/kv_test.go:1614-1645 (`TestKeyValueMirrorDirectGet`): a plain stream `MIRROR` with `Mirror: KV_TEST` + `MirrorDirect: true`, client bound to the ORIGIN bucket; the server's mirror joins the origin's direct-get queue group (server/stream.go:5091-5119) and answers with `Nats-Stream: <mirror name>` (stream.go:6188).
- Verdict: RESOLVED — Transparent read replicas = bind to the origin bucket, add mirror streams (any name) with `mirror_direct`; "closest" is queue-group routing (see F-KVOBJ-13). A same-domain bucket created with `KeyValueConfig.Mirror` (ADR-57 model) is write-through but cannot `Get` in nats.go/CLI; only the cross-domain/external form (the leafnode pattern ADR-58 disowns) reads correctly. ADR-57 is "Proposed"; do not document `--mirror` for same-cluster read replicas.

### F-KVOBJ-13: "RTT-nearest replica selection is automatic" / "core NATS routes to the nearest replica"
- Type: dubious
- Severity: medium
- Claims: "Replicas are automatically picked using a RTT-nearest algorithm" (ADR-58, proposed); "KV uses direct gets that core NATS routes to the nearest replica" (GitHub — derekcollison, ObjectStore thread); "`Alternates:` RTT-sorted" (ADR-58).
- Verification: Direct-get handlers are a queue group (`sysGroup`) across all replicas and opted-in mirrors (server/stream.go:647, 5058, 5068, 5101, 5111); within a cluster the server picks one queue member with no RTT knowledge (client.go:4479-4488 queue delivery, gateway only when no local member). `Alternates` ordering comes from the requesting client's server: `ci.Alternates` = outbound gateway names ordered by gateway RTT (server/client.go:6571-6581; gateway.go:1751-1764), then `streamAlternates` sorts by that weight (jetstream_cluster.go:12497-12540).
- Verdict: RESOLVED — "Nearest" is cluster-granular: a request is answered inside the client's own cluster if any replica/mirror lives there, otherwise via the gateway; `Alternates` is sorted by inter-cluster gateway RTT, not per-server RTT. There is no per-server RTT selection in the server or nats.go.

### F-KVOBJ-14: "Mirroring and sourcing propagate only new messages, never deletes" (jnmoyne)
- Type: dubious
- Severity: medium
- Claims: "Mirroring and sourcing propagate only new messages, never deletes — jnmoyne" (GitHub — Aggregate KV, 2026-02-07) vs "KV delete = message with `KV-Operation: DEL`; Purge = `KV-Operation: PURGE` + `Nats-Rollup: sub`" (ADR-8).
- Verification: nats.go jetstream/kv.go:1181-1189 KV delete/purge ARE published messages; server/stream.go:3340 mirror messages go through `processJetStreamMsg(..., sourced=true)`; stream.go:6794-6810 parses `Nats-Rollup` on sourced messages and stream.go:7017-7018 executes the rollup purge when `AllowRollup` is set (kv.go:680 sets `AllowRollup: true` on every bucket including mirror buckets). What does not propagate is the stream-level message-delete/purge API (mirrors replicate the message log, not API calls).
- Verdict: RESOLVED — KV `Delete` and `Purge` markers replicate to mirrors/sources (and a replicated purge marker rolls up history on the destination if it allows rollups); what uli42 saw (deleting in the aggregate not affecting sources) is the direction being wrong, not deletes being dropped. jnmoyne's sentence is true only for `nats stream rmm`/`purge` API operations.

### F-KVOBJ-15: Learn "`a..b` is rejected" — true for nats.go ≥ 1.53 only
- Type: dubious
- Severity: medium
- Claims: "`a..b` is rejected even though `a.b` is fine" and "a colon or double dot is rejected" (Learn — Your first bucket / Under the hood).
- Verification: nats.go jetstream/kv.go:911-916 `keyValid` rejects `..` — added by commit ab4ab2c (2026-05-15, first in v1.53.0). natscli 0.4.1 (older nats.go) live: `nats kv put ORIG 'a..b' x` → "no response from stream" (the server silently drops the publish to an invalid subject; no error, a timeout). nats.rs async-nats/src/jetstream/kv/mod.rs:110-116 `is_valid_key` checks only leading/trailing dot; regex `\A[-/_=\.a-zA-Z0-9]+\z` accepts `a..b`. Colon: rejected by both regexes (live CLI: "invalid key").
- Verdict: RESOLVED — Colon rejection is universal; consecutive-dot rejection is nats.go ≥ 1.53 only; other clients/older CLI send it and hang until timeout. Docs should warn about the timeout, not promise a client error.

### F-KVOBJ-16: Object Store put is async and can leave a metadata record without chunks
- Type: contradiction
- Severity: medium
- Claims: "An interrupted put leaves no gettable object at all because the metadata record is written last; a get reports not-found, not a corrupt file" (Learn — Your first object) vs "an unchecked async put failure can leave an object that fails its digest check" (Learn — Where to go next, Object Store) vs "Object store currently uses async publish underneath and lacks proper flow control" (Blog — 2.14 Release).
- Verification: nats.go jetstream/object.go:678-690 chunks are `PublishMsgAsync` with an error handler; :767-782 the metadata message is published async BEFORE waiting for chunk acks (:789 `PublishAsyncComplete`); on a late chunk-ack error `purgePartial` (:695-702) purges only the chunk subject, the already-stored meta stays; `Put` returns the error. A client-side abort before :779 (ctx timeout, read error) never publishes meta.
- Verdict: RESOLVED — Both Learn sentences are true for different failure modes: client-side interruption → no meta, get = not found; server-side chunk rejection (limits) racing the meta publish → meta present, chunks purged, get fails (missing chunks / digest). The "never a corrupt file" wording in "Your first object" overstates it.

### F-KVOBJ-17: Object Get streams bytes before the digest is checked
- Type: dubious
- Severity: low
- Claims: "Get recomputes the SHA-256 over the reassembled bytes and returns them only if the digest matches; otherwise it returns an error" (Learn — Your first object).
- Verification: nats.go jetstream/object.go:880-955 chunks are written to a `net.Pipe` as they arrive; the digest is compared only at `io.EOF` in the reader (object.go:1489-1500 `ErrDigestMismatch`).
- Verdict: RESOLVED — The caller receives bytes as they stream and gets `ErrDigestMismatch` at the end; "returns them only if the digest matches" is wrong for streaming reads (true only if you buffer the whole object before use, which is what the Learn checklist advises).

### F-KVOBJ-18: `UpdateMeta` fields — ADR-20 vs Learn
- Type: stale
- Severity: low
- Claims: "`UpdateMeta` may change only name, description, headers" (ADR-20) vs "`UpdateMeta` changes name, description, headers, and metadata" (Learn — Metadata and links).
- Verification: nats.go jetstream/object.go:1223-1226 copies Name, Description, Headers, Metadata; Opts (link, chunk size) deliberately not copied (comment :1221-1222); rename onto a deleted name allowed (:1210-1217).
- Verdict: RESOLVED — Learn is right; ADR-20 text predates the metadata map (rev 2, 2023-06).

### F-KVOBJ-19: Object `List` on an empty bucket — "empty result" vs `ErrNoObjectsFound`
- Type: contradiction
- Severity: low
- Claims: "Listing an empty bucket returns an empty result ('no objects found'), not a failure" (Learn — Watching and listing) vs "list returns `ErrNoObjectsFound`" (Learn — Where to go next, Object Store).
- Verification: nats.go jetstream/object.go:1385-1386 `if len(objs) == 0 { return nil, ErrNoObjectsFound }`.
- Verdict: RESOLVED — In Go it is an error value the caller must special-case; the two Learn pages disagree and the first should be reworded.

### F-KVOBJ-20: Metadata subject and digest encoding: "base64" vs "base64url"
- Type: contradiction
- Severity: low
- Claims: "meta subject `$O.<bucket>.M.<name-encoded>` (name base64-encoded)" and digest "`SHA-256=<base64>`" (ADR-20) vs "base64url-encoded object name" and "`SHA-256=<base64url(hash)>`" (Learn — Under the hood).
- Verification: nats.go jetstream/object.go:634 `base64.URLEncoding.EncodeToString([]byte(name))`; :819 digest `base64.URLEncoding`.
- Verdict: RESOLVED — URL-safe base64 in both places (Learn is right; ADR wording is loose).

### F-KVOBJ-21: Object Store "Technology Preview" / "experimental"
- Type: stale
- Severity: low
- Claims: "Object Store ... NOTICE: Technology Preview" (Legacy docs — Anatomy of a NATS Client Application); "object store (still experimental)" (Talk — Migrating from NATS Streaming) vs ADR-20 status Implemented (rev 3 2024-02-05).
- Verification: nats.go jetstream/object.go has no experimental/preview marker (grep); ADR-20 provenance line in the dump: "status: Implemented".
- Verdict: RESOLVED — Stale; drop the preview label. (Object-store-level mirror/source config still does not exist in nats.go `ObjectStoreConfig` — replication must be done on the `OBJ_` stream directly.)

### F-KVOBJ-22: Third-party benchmark claims in "Building Distributed State Stores"
- Type: unverifiable
- Severity: medium
- Claims: "Object Store throughput measured in hundreds of MB/s"; "12ms average latency vs 45-180ms with Redis polling"; "100,000+ flag evaluations per second per instance"; "eliminated 50,000 unnecessary Redis queries per second" (Blog — Building Distributed State Stores, third-party 2026-02-21, version unstated).
- Verification: none available (no maintainer statement, no code). Same source is already wrong on TTL (F-KVOBJ-4), R3 (F-KVOBJ-11) and latency (F-KVOBJ-9). Its correct items: revision 0 = key must not exist (server/stream.go:6539-6540), 1 GB ≈ 8,192 chunks at 128 KiB (object.go:486).
- Verdict: REQUIRES RESOLUTION — Treat all numbers from this source as unusable; only a Synadia/maintainer benchmark or a reproducible run could replace them.

### F-KVOBJ-23: "KV values fitting in RAM is a guarantee" (jgaskins, non-maintainer)
- Type: dubious
- Severity: low
- Claims: "KV values fitting in RAM is a guarantee — jgaskins [UNVERIFIED]" (GitHub — Automatic Chunking).
- Verification: nats.go jetstream/kv.go:641-644 `MaxValueSize` defaults to -1 (unlimited); the only bound is the server `max_payload` / stream `max_msg_size`. Nothing in the client or server sizes values against memory.
- Verdict: RESOLVED — Wrong; values are bounded by max payload (1 MiB default), not by RAM. The rest of that comment (object get = info + ordered consumer subscription; KV get = one request) matches object.go:836-955 and kv.go:937.

### F-KVOBJ-24: Duplicate-window rule "clients must set" vs server defaulting
- Type: dubious
- Severity: low
- Claims: "if `max_age` is greater than 2 minutes, `duplicate_window` must be set to 2 minutes; if ≤ 2 minutes, set the same as `max_age`" (ADR-8) with note "server applies this logic itself if omitted".
- Verification: server/stream.go:1776-1791 applies exactly this when `Duplicates == 0` — but only for streams with no mirror and no sources; nats.go kv.go:650-655 sets it explicitly anyway.
- Verdict: RESOLVED — Both true; the server default is skipped for mirror/sourced streams, so a client that omits it on a mirror bucket gets `duplicate_window: 0`.

### F-KVOBJ-25: "wrong last sequence" error differs on replicated buckets
- Type: dubious
- Severity: low
- Claims: "concurrent creates error 'wrong last sequence ... key exists'"; "a second update with a stale revision fails 'wrong last sequence'" (Legacy docs — KV walkthrough).
- Verification: nats.go jetstream/kv.go:1083-1107 handles two codes: `JSErrCodeStreamWrongLastSequence` (10071, errors.json:65) and `JSErrCodeStreamWrongLastSequenceConstant` (10164, errors.json:1625) with the comment "Replicated (R>1) streams report CAS conflicts as 10164 instead of 10071"; both are mapped to `ErrKeyExists` / `ErrKeyRevisionMismatch`.
- Verdict: RESOLVED — Document the client error (`ErrKeyExists`, `ErrKeyRevisionMismatch`), not the server message text, which varies with replica count.

### F-KVOBJ-26: Cross-client watch end-of-initial-data and missing-key behaviour (Learn)
- Type: dubious
- Severity: low
- Claims: "Go and Python deliver a nil/None entry; JavaScript sets `isUpdate`; Java calls `endOfData()`; C# takes an `OnNoData` option; Rust has no marker" and "CLI, Go, Python, C# fail with key-not-found; JavaScript, Rust, Java return null/None" (Learn — Watching / Your first bucket).
- Verification: Go nil marker jetstream/kv.go:1328-1330, 1375-1378; .NET `OnNoData` NATS.Client.KeyValueStore/NatsKVOpts.cs:51, NatsKVStore.cs:446; Java `endOfData` in impl/NatsKeyValueWatchSubscription.java; JS `isUpdate` in nats.js kv/src/types.ts; Rust: no marker in async-nats/src/jetstream/kv/mod.rs, `get` returns `Option<Bytes>` (mod.rs:903); Go `ErrKeyNotFound` (kv.go:947). Python not checked.
- Verdict: RESOLVED (except Python) — Verified for Go, Rust, JS, Java, .NET; the Python claims remain unverified but are not load-bearing.

### F-KVOBJ-27: Direct-get followers are only enabled after ≥90% sync; "including out of date ones" is bounded at start-up only
- Type: dubious
- Severity: low
- Claims: "Reads are performed directly to any replica, including out of date ones" (ADR-8).
- Verification: server/jetstream_cluster.go:4107-4133 — a non-leader joins the direct-get queue group only once `isCurrent()` or ≥90% of the leader's applied index; after that it stays subscribed regardless of lag (stream.go:2657-2664 only unsubscribes on config change).
- Verdict: RESOLVED — Correct as stated with the nuance that a freshly (re)started replica is excluded until nearly caught up; a replica that falls behind later still serves.

## Summary

Counts by type: contradiction 9 · wrong 2 · stale 3 · unverifiable 2 · dubious 11 (27 findings).
Counts by verdict: RESOLVED 25 · REQUIRES RESOLUTION 2.

| ID | Title | What would settle it |
|---|---|---|
| F-KVOBJ-9 | KV latency figures (1-5 ms vs ~40 µs) | Reproducible `nats bench kv` on documented hardware, or quote jnmoyne's 1507 numbers with conditions and no absolute claim |
| F-KVOBJ-22 | Third-party throughput/latency/QPS numbers in "Building Distributed State Stores" | Maintainer benchmark; otherwise drop every number from that source |

Ten highest-severity RESOLVED corrections:
1. F-1 — KV gets are served by any replica or mirror via a queue group; no read-after-write or monotonic reads. "Immediately consistent" and "monotonic reads" (legacy docs), "strong consistency" (Vitrifi) and "read-after-write safety" (2021 preview) are wrong/stale.
2. F-12 — A same-domain bucket created with `--mirror`/`KeyValueConfig.Mirror` cannot `Get` (live: key not found; store holds `$KV.<origin>.*`). Transparent read replicas = bind to the origin bucket + mirror streams with `mirror_direct`. ADR-57 and ADR-58 contradict; the code and tests follow ADR-58's model.
3. F-11 — R3 tolerates one failure for writes (quorum = 2); direct-get reads continue from a lone replica. Blog's "survives two simultaneous failures" is wrong for writes.
4. F-4 — Per-key TTL is 2.11+ (API level 1) and needs a bucket with limit markers; the third-party "bucket-level only" blog and two talks are stale; the 2021 preview's "per-key TTL" was bucket `max_age`.
5. F-5 — Purge-with-`Nats-TTL` is 2.11+, not 2.14; since 2.12 the server floors it to the bucket's limit-marker TTL when history > 1.
6. F-2 — Disabling `allow_direct` on the backing stream makes nats.go/CLI read via the leader-only API (supported path); "auto-on for KV" and every other KV rule is client-side, the server has no `KV_` special-casing.
7. F-14 — KV delete/purge markers DO replicate to mirrors and sources (they are messages; purge rolls up on the destination); only stream API delete/purge operations do not.
8. F-13 — "Nearest replica" is queue-group routing at cluster granularity (local cluster first, then gateway); `Alternates` is sorted by gateway RTT, not per-server RTT.
9. F-16 — Object put publishes the metadata record asynchronously before chunk acks are confirmed; a late chunk rejection leaves metadata without chunks (get fails), so "an interrupted put never yields a gettable object" holds only for client-side interruption.
10. F-15 — `a..b` key rejection is nats.go ≥ 1.53 only; older CLI and nats.rs send it and hang to timeout (server drops the publish silently). Colon rejection is universal.


<!-- ===== CLNT ===== -->

# Review: CLNT

Source states used for verification (all local checkouts, HEAD at review time 2026-09-07):
- nats.go `2e0e3d9` (v1.53.1-4) — /Users/tomaszpietrek/coding/nats.go
- nats.rs `7b0fa6af` (async-nats v0.50.0-4) — /Users/tomaszpietrek/coding/nats.rs/async-nats/src
- nats-server `8e54a5954` — /Users/tomaszpietrek/coding/new-nats.docs/nats-server
- Outside the prescribed Go/Rust/server set but used as client source where a claim is per-language (flagged inline as "outside prescribed set"): nats.js `1b6b0069` (v3.4.0-25), nats.py `c7896c1` (v2.15.0-24, legacy pkg at nats/src/nats), nats.java `8cb8a91b` (2.26.0-23), nats.net `24159b4` (v3.1.0), nats.c `3d0f5e69` (v3.9.0-272), natscli `3726a32` (v0.4.0-47), orbit.* repos (2026-05..07).
- Maintainer threads: scratchpad/dump/threads/go-1721.txt (Jarema), go-1376.txt (derekcollison), go-1981.txt (wallyqs/derek), 7554.txt (jnmoyne).

### F-CLNT-1: Default subscription pending limits (65536 msgs vs 500,000 msgs)
- Type: contradiction (legacy docs stale)
- Severity: high
- Claims: "Default subscriber pending limits: 65536 messages and 65536*1024 bytes" (Legacy docs — Slow Consumers) vs "500,000 messages and 64 MB in Go (similar in Python and Java); Rust 65,536 messages; C# 1,024-message channel; JavaScript unbounded" (Learn — Slow Consumers / Where Next (Resilient Clients))
- Verification: nats.go nats.go:5792 `DefaultSubPendingMsgsLimit = 500_000`, :5794 `DefaultSubPendingBytesLimit = 64 * 1024 * 1024`. nats.rs options.rs:113 `subscription_capacity: 1024 * 64` (count only). nats.py aio/subscription.py:37-38 `DEFAULT_SUB_PENDING_MSGS_LIMIT = 512 * 1024`, `DEFAULT_SUB_PENDING_BYTES_LIMIT = 128 * 1024 * 1024` (outside prescribed set). nats.java Consumer.java:38 `DEFAULT_MAX_MESSAGES = 512 * 1024`, :43 `DEFAULT_MAX_BYTES = 64 * 1024 * 1024`. nats.js core/src/queued_iterator.ts:83-84 unbounded push, no drop path; `slow` option only dispatches a `slowConsumer` status (core/src/nats.ts:148-156). nats.net NatsOpts.cs:240 `SubPendingChannelCapacity = 16384`, :253 `SubPendingChannelFullMode = DropNewest` (see F-CLNT-2).
- Verdict: RESOLVED — The legacy 65536 / 64 MiB figure is stale for every current client. Go: 500,000 msgs / 64 MiB. Python: 524,288 msgs / 128 MiB. Java: 524,288 msgs / 64 MiB. Rust: 65,536 msgs, no byte cap. .NET: 16,384 msgs (channel), no byte cap. JS: unbounded, never drops.

### F-CLNT-2: .NET subscription channel "1,024 messages, NatsClient wrapper waits instead of dropping"
- Type: stale
- Severity: medium
- Claims: "C# to a 1,024-message channel ... the NatsClient wrapper waits, blocking the read loop instead of dropping" (Learn — Slow Consumers) vs current nats.net source
- Verification: nats.net (outside prescribed set) commit `41fa0d3` 2026-06-12 "core: unify sub channel overflow defaults (#1181)" (in v3.0.0+) changed `SubPendingChannelCapacity` 1024 → 16384 (NatsOpts.cs:240) and removed the `BoundedChannelFullMode.Wait` default from `NatsClient` (NATS.Client.Simplified/NatsClient.cs:32-66 ctors set no full mode); default full mode is `DropNewest` (NatsOpts.cs:253) with the `MessageDropped` event (INatsConnection.cs:26).
- Verdict: RESOLVED — For nats.net v3.0.0+ the default is a 16,384-message channel, DropNewest, for both `NatsConnection` and `NatsClient`. The 1,024 / Wait description is v2-era.

### F-CLNT-3: ".NET has no per-subscription drain"
- Type: wrong (stale at v3.1.0)
- Severity: low
- Claims: "C# has no per-subscription drain; disposing a subscription drops messages still on their way" (Learn — Drain & Shutdown)
- Verification: nats.net (outside prescribed set) NATS.Client.Core/INatsSub.cs:44 `public ValueTask DrainAsync(CancellationToken cancellationToken = default);` (impl NatsSubBase.cs:302). `DrainSubscriptionsOnDispose` default false (NatsOpts.cs:184) and `DrainPingTimeout` 5 s (NatsOpts.cs:210) are confirmed. There is still no connection-level `DrainAsync`.
- Verdict: RESOLVED — nats.net v3.1.0 has `INatsSub.DrainAsync`; only the connection-level drain is missing. The dispose-drops-messages advice and the `DrainSubscriptionsOnDispose` defaults are correct.

### F-CLNT-4: Default max reconnect attempts (ADR-40 "3 / none" vs 60)
- Type: contradiction
- Severity: medium
- Claims: "max reconnects '3 / none'" (ADR-40 — NATS Connection) vs "MaxReconnect 60 (negative = forever)" (Legacy docs — Automatic Reconnections) vs "60 in Go/Java/Python, 10 in JavaScript, unlimited in Rust and C#" (Learn — Reconnection)
- Verification: nats.go nats.go:55 `DefaultMaxReconnect = 60`; per-server gate :2096 `if maxReconnect < 0 || s.Reconnects < maxReconnect`, reset :3514 `cur.Reconnects = 0`. nats.rs options.rs:103 `max_reconnects: None`; note the Rust counter is total attempts across the pool (connector.rs:353-366 `self.attempts += 1 ... if self.attempts > max_reconnects`), reset on success (connector.rs:424). Outside prescribed set: nats.js core/src/options.ts:28 `DEFAULT_MAX_RECONNECT_ATTEMPTS = 10`; nats.py aio/client.py:91 `DEFAULT_MAX_RECONNECT_ATTEMPTS = 60`; nats.java Options.java:91 `DEFAULT_MAX_RECONNECT = 60`; nats.net NatsOpts.cs:218 `MaxReconnectRetry = -1`.
- Verdict: RESOLVED — ADR-40's "3 / none" matches no shipping client. Learn's matrix is correct: Go/Java/Python 60 per server, JS 10 per server, Rust unlimited (and not per-server when bounded), .NET unlimited.

### F-CLNT-5: Default connect timeout (ADR-40 5 s vs 2 s)
- Type: contradiction
- Severity: low
- Claims: "connection timeout 5s" (ADR-40) vs "Timeout 2s dial" (Legacy docs — Automatic Reconnections) vs "two seconds in most clients, five in Rust, twenty in JavaScript" (Learn — Connecting)
- Verification: nats.go nats.go:59 `DefaultTimeout = 2 * time.Second`. nats.rs options.rs:104 `connection_timeout: Duration::from_secs(5)`. Outside prescribed set: nats.js core/src/protocol.ts:575 `timeout(this.options.timeout || 20000)` (fallback, not in defaultOptions); nats.py aio/client.py:98 `DEFAULT_CONNECT_TIMEOUT = 2`; nats.java Options.java:115 `DEFAULT_CONNECTION_TIMEOUT = Duration.ofSeconds(2)`; nats.net NatsOpts.cs:130 `ConnectTimeout = TimeSpan.FromSeconds(2)`.
- Verdict: RESOLVED — Go/Python/Java/.NET 2 s, Rust 5 s, JS 20 s. ADR-40's 5 s is Rust-only.

### F-CLNT-6: "In Go a connection with no async error callback discards these reports"
- Type: wrong
- Severity: medium
- Claims: "In Go a connection with no callback discards these reports; Rust, JS, C# likewise unless wired; Java and Python fall back to a default logger" (Learn — Slow Consumers) and checklist "a nil one drops every overflow message silently" (Learn — Where Next (Resilient Clients))
- Verification: nats.go nats.go:1995-1996 `if nc.Opts.AsyncErrorCB == nil { nc.Opts.AsyncErrorCB = defaultErrHandler }`; :2022 `func defaultErrHandler(...)` prints to stderr. Slow-consumer push path :4031-4037 always has a handler. JS confirmed dropped: core/src/protocol.ts:486-490 `dispatchStatus` only pushes to `status()` listeners. Python confirmed logs: aio/client.py:238-243 `_default_error_callback ... _logger.error`. Java confirmed logs: Options.java:2492-2493 `ErrorListenerLoggerImpl`.
- Verdict: RESOLVED — nats.go installs a default handler that prints every async error (slow consumer, permission violation, …) to stderr; nothing is silently discarded. Messages are still dropped on overflow, but the report is not lost. Go belongs with Java/Python, not with JS/Rust/.NET.

### F-CLNT-7: Auth-error abort matrix (which clients stop reconnecting on a repeated auth error)
- Type: wrong (partially)
- Severity: medium
- Claims: "nats.go, nats.js, nats.net, and nats.java close the connection when the same auth error repeats twice in a row (opt-out IgnoreAuthErrorAbort/ignoreAuthErrorAbort) … nats.py and nats.rs have no abort rule and keep cycling" (Learn — TLS & Auth)
- Verification: nats.go nats.go:4104-4105 `if nc.current.lastErr == err && !nc.Opts.IgnoreAuthErrorAbort { nc.ar = true }`, loop break :3504. nats.rs connector.rs:250-268 `connect()` loops forever, swallowing every `try_connect` error (including AuthorizationViolation returned at :371-373) as `Event::ClientError` — no abort. Outside prescribed set: nats.js protocol.ts:827-834 abort with `ignoreAuthErrorAbort === false` default (options.ts:52). nats.net NatsOpts.cs:234 `IgnoreAuthErrorAbort = false`, NatsConnection.cs:754-757, state `Failed` :1082-1085. nats.java NatsConnection.java:489-490 `if (err.equals(this.serverAuthErrors.get(resolved))) { return; // double auth error` — but no opt-out option exists (grep `ignoreAuth|authErrorAbort` over src/main/java empty). nats.py: handshake-time `-ERR` is a generic `errors.Error` and keeps cycling (aio/client.py:2249-2255, 1713-1718), but an `Authorization Violation` received on an established connection closes for good (aio/client.py:1526-1527, 1540-1544 `self._close(Client.CLOSED, do_cbs)`).
- Verdict: RESOLVED — Go/JS/.NET: abort on repeat, opt-out exists. Java: aborts on repeat, no opt-out. Rust: never aborts. Python: cycles on handshake auth errors but closes permanently on an in-session `Authorization Violation`. Learn's "opt-out" applies to Java wrongly, and Python is not simply "keeps cycling".

### F-CLNT-8: JetStream publish with no stream: "fails immediately with no responders" vs Go retry
- Type: contradiction
- Severity: high
- Claims: "A publish to a subject no stream captures fails immediately with 'no responders' and nothing was stored" (Learn — Publishing) and "Don't build a client that treats a brief 'no leader' as fatal; retry the write" / "let the client retry" (Learn — Raft and leaders / Where to go next (Clustering)) vs "Go default retry: waits 250ms and retries 2 times" (ADR-22)
- Verification: nats.go jetstream/publish.go:157 `DefaultPubRetryWait = 250 * time.Millisecond`, :160 `DefaultPubRetryAttempts = 2`, retry loop :247 `for r := 0; errors.Is(err, nats.ErrNoResponders) && (r < o.retryAttempts || o.retryAttempts < 0); r++`, final error jetstream/errors.go:264 `ErrNoStreamResponse … "no response from stream"`; legacy js.go:233/236/594 identical. nats.rs jetstream/context.rs:1890-1891 `if m.status == Some(StatusCode::NO_RESPONDERS) { return Err(PublishError::new(PublishErrorKind::StreamNotFound)) }` — no retry loop in context.rs. Outside prescribed set: nats.py js/client.py:206-215 immediate `NoStreamResponseError` ("nats: no response from stream"), no retry; nats.js jetstream/src/jsclient.ts:413-437 `retries = retries || 1` → no retry by default, error `JetStreamNotEnabled("jetstream is not enabled")`; nats.java NatsJetStream.java:182-183 immediate `IOException("Error Publishing: …")`.
- Verdict: RESOLVED — Only nats.go (both APIs) retries no-responders by default (2 retries, 250 ms apart, ~500 ms before `no response from stream`). Rust, Python, Java, JS fail immediately (JS opt-in via `retries`). "Fails immediately" is wrong for Go; "let the client retry" across a leader election is Go-only behaviour. The JS error text ("jetstream is not enabled") is misleading for the no-stream case.

### F-CLNT-9: "Clients do not add request retry logic" vs JetStream publish retries
- Type: contradiction (scope)
- Severity: low
- Claims: "The clients deliberately do not add generic request retry logic" (EP01S3 talk) and "clients do not retry a publish that failed mid-reconnect" (derekcollison, go-1376) vs ADR-22 JetStream publish retries
- Verification: nats.go nats.go:4725-4810 core `Request` has no retry; jetstream/publish.go:247 retries only on `nats.ErrNoResponders`. Maintainer: derekcollison https://github.com/nats-io/nats.go/discussions/1376 "Retries are very common" (app-level), thread go-1376.txt lines 34-46.
- Verdict: RESOLVED — Core request/reply: no client retries anywhere. JetStream publish: Go alone retries, and only the no-responders case (not timeouts, not mid-reconnect failures). Both statements are true at their scope.

### F-CLNT-10: Ordered consumer: "short inactivity threshold", naming, and heartbeat-driven recreation
- Type: contradiction / overgeneralisation
- Severity: medium
- Claims: "The library creates a consumer with a short inactivity threshold … on a missing sequence or lost heartbeats throws the consumer away and creates a fresh one … (named prefix_1, prefix_2, …)" (Learn — Ordered consumers) vs ADR-17 (push-based, "recreate on missed heartbeats")
- Verification: nats.go jetstream/ordered.go:635 `InactiveThreshold: 5 * time.Minute`, :629 `name := fmt.Sprintf("%s_%d", c.namePrefix, c.serial)`, :634/636/638 AckNone/Replicas 1/MemoryStorage, reset on `ErrNoHeartbeat` :226-232. nats.rs jetstream/consumer/pull.rs:675 `inactive_threshold: Duration::from_secs(30)`, :676-677 `num_replicas: 1, memory_storage: true`; recreate only on the second consecutive missed heartbeat pull.rs:810-817. Outside prescribed set: nats.js jsmstream_api.ts:271-280 `inactive_threshold: nanos(5 * 60 * 1000)`, name `${prefix}_${serial}` (consumer.ts:1011-1013), missed heartbeats do NOT reset directly — they trigger `consumer.info()` and reset only on "consumer not found" (consumer.ts:389-415, 664-667). nats.java: no client-side inactive threshold for consume (NatsMessageConsumer.java:158 passes null; fetch uses expires*1.1), name `prefix-NUID` (NatsJetStreamUtil.java:26-27), recreate on heartbeat error (PullMessageManager.java:61-64 → NatsMessageConsumer.java:130-137).
- Verdict: RESOLVED — "Short" is wrong for Go and JS (5 minutes); Rust 30 s; Java leaves it to the server. `prefix_N` naming holds for Go and JS only (Java uses `prefix-<NUID>`). Heartbeat-loss recreation is immediate in Go/Java, second-miss in Rust, and conditional on `consumer.info()` in JS. The R1/AckNone/memory-storage bundle (EP09) is confirmed for Go and Rust.

### F-CLNT-11: ADR-17 push-based ordered consumer vs "internally everything is pull-based now"
- Type: stale (API boundary)
- Severity: low
- Claims: "Ordered consumer is an ordered push subscription" (ADR-17) vs "there's no distinction anymore of push vs pull consumer, internally it is all pull-based now" (EP09 talk) vs "The ordered consumer is a client-library construct" (Learn — Ordered consumers)
- Verification: nats.go jetstream/ordered.go:145 `c.currentConsumer.Consume(...)` (pull path, jetstream package); legacy push ordered still in js.go (`hbcThresh`, flow control :2426-2460). nats.py (outside prescribed set) has only the push-mode `ordered_consumer=True` on `subscribe()` (js/client.py:308, 453-460) and no pull ordered consumer.
- Verdict: RESOLVED — ADR-17 describes the legacy push implementation; the new `jetstream` packages (Go, Rust, JS, Java, .NET) implement ordered consumers on pull. "All pull-based" is true of the new API only; nats.py's ordered consumer is still push-based.

### F-CLNT-12: Legacy JetStream API "will be deprecated" vs "not deprecating"
- Type: contradiction
- Severity: low
- Claims: "The legacy functionality will be deprecated" (ADR-37) vs "we're not deprecating the old one. Some new features (Consumer Overflow, Priority Groups, Pinning) will not be ported" (Jarema, go-1721) vs "Old JetStream API is not being deprecated" (dump summary of same thread)
- Verification: Jarema https://github.com/nats-io/nats.go/discussions/1721 (thread go-1721.txt:23, 2024-09): "While we encourage users to adopt the new API, we're not deprecating the old one." nats.go js.go:305-308 "NOTE: JetStreamContext is part of legacy API. Users are encouraged to switch…" — no Go `Deprecated:` marker anywhere in js.go (grep empty); README.md:121 "The current JetStream API replaces the legacy JetStream API".
- Verdict: RESOLVED — As of nats.go v1.53.1 the legacy API is labelled "legacy" and discouraged but not deprecated in the Go sense; ADR-37's future tense has not been executed. New pull-only features are not ported.

### F-CLNT-13: Heartbeat alarm threshold "3× idle heartbeat" (ADR-15) vs 2× in code
- Type: contradiction
- Severity: low
- Claims: "The time allowed before an alarm is raised should be 3 times the idle heartbeat interval" (ADR-15) vs "warning if timer reaches 2 * request's idle_heartbeat" (ADR-37)
- Verification: nats.go js.go:222 `hbcThresh = 2` (legacy push, used :2426/2458); jetstream/pull.go:250,265,293 `hbMonitor.Reset(2 * consumeOpts.Heartbeat)`, fetch :940. nats.js (outside prescribed set) consumer.ts:414 `{ maxOut: 2 }`.
- Verdict: RESOLVED — Both the legacy and new nats.go paths use 2× the heartbeat interval; ADR-15's 3× is not what shipped.

### F-CLNT-14: Client-side pull timeout margin (ADR-13 "100 ms before", PR 1689, per-client reality)
- Type: contradiction / stale
- Severity: low
- Claims: "expires set 100ms before the client side timeout" (ADR-13) vs "the 10 ms margin was too small and was increased (PR 1689)" (piotrpio, FetchBatch bug) vs "Client-side timeout value should always be larger than expiry" (ADR-37)
- Verification: nats.go legacy js.go:3183-3184 and :3464-3465 `expiresDiff := min(time.Duration(float64(ttl)*0.1), 5*time.Second); expires := ttl - expiresDiff`. New API jetstream/pull.go:987 `case <-time.After(req.Expires + 1*time.Second)` (client waits 1 s past `expires`). Outside prescribed set: nats.py js/client.py:1096 `expires = int(timeout * 1_000_000_000) - 100_000` (0.1 ms); nats.js has no client timer for fetch (consumer.ts:398 comment; relies on server 408 + heartbeats).
- Verdict: RESOLVED — Legacy Go: expires = timeout − min(10 %, 5 s). New Go: client deadline = expires + 1 s. Python: 0.1 ms margin. JS: none. ADR-13's 100 ms is obsolete.

### F-CLNT-15: Fetch/consume expiry floor ("floor is a client-library limitation")
- Type: unverifiable → resolved
- Severity: low
- Claims: "Fetch max wait below 1 s is allowed by the server; a floor is a client-library limitation" (jnmoyne, 7554) vs "expires default 30s, minimum 1s" (ADR-37)
- Verification: nats.go jetstream/jetstream_options.go:529-530 `FetchMaxWait` only rejects `timeout <= 0`; :230-231 `PullExpiry … "expires value must be at least 1s"` for Consume/Messages; fetch heartbeat rule pull.go:839-844 (5 s heartbeat only when expires ≥ 10 s) and :846-847 expires ≥ 2×heartbeat. nats.js (outside prescribed set) consumer.ts:792-796 consume rejects `expires < 1000`. jnmoyne https://github.com/nats-io/nats-server/discussions/7554.
- Verdict: RESOLVED — In nats.go a single Fetch may use any positive wait; the 1 s floor applies to Consume/Messages (and JS consume). Also: ADR-37's "heartbeats by default for expires > 30s" is 10 s in nats.go Fetch; ADR-37's "max_messages probably 100–1000" is 500 in Go (pull.go:191) and 100 in JS (consumer.ts:896-899).

### F-CLNT-16: Pull priority-group pinning support per language
- Type: wrong (partially)
- Severity: low
- Claims: "The pinned-client loop runs in Go, Java, JavaScript/TypeScript, and .NET; Rust and Python let you set config fields but don't run the client-side pinning loop" (Learn — Priority groups)
- Verification: nats.go jetstream/pull.go:284,671,959 `msg.Header.Get("Nats-Pin-Id")`, jetstream/message.go:150 `statusPinIdMismatch = "423"`. nats.rs: grep `Nats-Pin-Id|PinId|pin_id` over async-nats/src is empty (priority config exists: commit 7b0fa6af "FetchBuilder::priority"). Outside prescribed set: nats.java PullMessageManager.java:96-97,133-135; nats.js consumer.ts:306-310,330-335,711-713; nats.net NatsJSExtensionsInternal.cs:16-33, NatsJSConsume.cs:303,422-425 — all confirmed. nats.py: grep `pin_id|Nats-Pin-Id|priority_policy|priority_groups|423` over js/ and aio/ empty; `ConsumerConfig` has no priority fields.
- Verdict: RESOLVED — Go/Java/JS/.NET run the loop; Rust has priority config fields but no `Nats-Pin-Id` handling; nats.py (legacy package) has no priority fields at all, so "lets you set config fields" is wrong for Python.

### F-CLNT-17: "Two pull patterns exist in every client library: fetch and consume"
- Type: wrong
- Severity: medium
- Claims: "Two pull patterns exist in every client library: fetch … and consume" (Learn — Pull consumers in depth); "Client libraries set defaults for batch and expires, so a plain consume loop behaves well" (same)
- Verification: nats.py (outside prescribed set) legacy js/client.py:540-549 `pull_subscribe()` exposes `fetch()` only (:1053); grep `def consume` over nats/src and the new nats-jetstream/src package returns nothing at c7896c1. Go/Rust/JS/Java/.NET confirmed to have both (nats.go jetstream/pull.go Consume/Fetch; nats.rs consumer/pull.rs).
- Verdict: RESOLVED — nats.py has no `consume()`; the statement holds for the other tier-1 clients.

### F-CLNT-18: "nats.py has no first-class async publish"
- Type: wrong
- Severity: medium
- Claims: "nats.py has no first-class async publish (approximate with asyncio.gather plus your own concurrency limit)" (Learn — Advanced publishing)
- Verification: nats.py (outside prescribed set) js/client.py:222-230 `async def publish_async(...) -> asyncio.Future[api.PubAck]`, :111 `publish_async_max_pending: int = 4000`, :256-258 `TooManyStalledMsgsError`, :284 `publish_async_pending()`.
- Verdict: RESOLVED — nats.py has `JetStreamContext.publish_async` returning a Future with a bounded outstanding window (4000) and stall handling. The gather workaround advice is obsolete.

### F-CLNT-19: Reconnect-buffer overflow behaviour per language
- Type: wrong (partially)
- Severity: low
- Claims: "When the reconnect buffer overflows, Go/Java/Python fail the next publish (Go: ErrReconnectBufExceeded); Rust blocks under backpressure" (Learn — Reconnection); "default 8 MB in Go and Java, 2 MB in Python" (same)
- Verification: nats.go nats.go:63 `DefaultReconnectBufSize = 8 * 1024 * 1024`, :4611-4613 `if nc.bw.atLimitIfUsingPending() { return ErrReconnectBufExceeded }`. nats.rs: bounded mpsc `sender_capacity: 2048` (options.rs:112); `publish` awaits `self.sender.send(Command::Publish(msg)).await` (client.rs:194-197) so a full channel suspends the publisher; the handler stops draining commands while `handle_reconnect` runs (lib.rs:981-990). Outside prescribed set: nats.py aio/client.py:89 `DEFAULT_PENDING_SIZE = 2 * 1024 * 1024`; raises `OutboundBufferLimitError` only while disconnected (:919-924); while connected an over-limit buffer forces a flush instead (:1371-1373). nats.java Options.java:193 `DEFAULT_RECONNECT_BUF_SIZE = 8_388_608`.
- Verdict: RESOLVED — Sizes confirmed. Python fails the publish only while disconnected; when connected it flushes. Rust: 2048-command bounded queue, publisher suspends (verified for capacity and `send().await`; the exact reconnect-time stall path is inferred from the handler loop, not a unit test).

### F-CLNT-20: Lame-duck INFO "drops the node from each client's server pool"
- Type: wrong (partially)
- Severity: medium
- Claims: "The INFO ldm:true update drops the node from each client's server pool so the next reconnect lands elsewhere; the client takes no other action" (Learn — Rolling upgrades) vs "a client watching for it can stop publishing and reconnect to another server before the link is cut" (Learn — Drain & Shutdown) vs "Currently clients have no automatic support to disconnect while keeping current state" (ADR-5)
- Verification: nats-server server/server.go:4592-4610 `sendLDMToClients` clears the server's own `clientConnectURLs` and rebuilds `info.ClientConnectURLs` from the other nodes' map, so the LDM INFO omits itself. nats.go nats.go:4228-4247 removes a pool entry only when `srv.isImplicit` and absent from the new list ("Keep servers that were set through Options"); :4273-4276 the only LDM-specific action is invoking `LameDuckModeHandler`. derekcollison https://github.com/nats-io/nats.go/discussions/1376 (go-1376.txt:61, 2024-05): intelligent reconnect "not released or started"; nats.go v1.53.1 still has no automatic LDM reconnect.
- Verdict: RESOLVED — Only a *discovered* (implicit) URL is dropped from the nats.go pool on the LDM INFO; a URL the application configured stays and can be re-dialled (the server refuses, the client moves on). The client takes no automatic action beyond the callback; proactive LDM reconnect remains unimplemented in nats.go.

### F-CLNT-21: Stale-connection detection: "after two unanswered PINGs" vs "third unanswered ping, ~six minutes"
- Type: contradiction (internal to Learn)
- Severity: low
- Claims: "the connection is declared dead after two unanswered PINGs" (Learn — Connecting) vs "detection waits for the third unanswered ping, up to about six minutes (three in Rust)" (Learn — Reconnection) vs "Missing two consecutive PONGs" (ADR-40)
- Verification: nats.go nats.go:5935-5938 `nc.pout++; if nc.pout > nc.Opts.MaxPingsOut { … ErrStaleConnection }` with `DefaultMaxPingOut = 2` (:61), `DefaultPingInterval = 2 * time.Minute` (:60); no activity check, PING sent every interval. nats.rs lib.rs:235 `MAX_PENDING_PINGS: usize = 2`, :518-520 `pending_pings > MAX_PENDING_PINGS`, options.rs:111 `ping_interval: 60 s`, lib.rs:709 `self.ping_interval.reset()` on every server op. Server: client.go:5849-5850 delays its PING when client data arrived within the interval.
- Verdict: RESOLVED — Go declares the connection stale at the third ping-timer tick (two PINGs sent and unanswered; the third is never sent): ≈3 × 2 min = 6 min worst case. Rust: same count, 60 s interval, timer reset by any inbound traffic → ≈3 min of silence. Both Learn phrasings are defensible; "after two unanswered PINGs" should add "at the moment the third is due (~6 min)".

### F-CLNT-22: ADR-40 "Exponential backoff with jitter" as the reconnect rule
- Type: contradiction
- Severity: medium
- Claims: "Reconnect rules: … then 'Exponential backoff with jitter'" (ADR-40) vs "Go, Java, Python, JS use the same wait every sweep by default; Rust and .NET grow the wait each attempt … Python and Rust add no jitter" (Learn — Reconnection)
- Verification: nats.go nats.go:3342-3352 fixed `ReconnectWait` + `ReconnectJitter`/`ReconnectJitterTLS` (defaults :56-58 2 s / 100 ms / 1 s), no growth; :3342 custom `CustomReconnectDelayCB` replaces the whole computation (no jitter added). nats.rs connector.rs:173-181 `reconnect_delay_callback_default`: 0 for first attempt, then `min(2^(attempts-1) ms, 4 s)`, no jitter. Outside prescribed set: nats.java NatsConnection.java:2268-2276 fixed wait + jitter; nats.js options.ts:127-137 fixed wait + jitter, custom handler used verbatim (protocol.ts:659-661); nats.py: no jitter (grep empty), flat sleep aio/client.py:1502-1504; nats.net NatsConnection.cs:1068-1069 doubling capped at `ReconnectWaitMax` 5 s, jitter 100 ms (NatsOpts.cs:123,128,228).
- Verdict: RESOLVED — Exponential growth exists only in Rust (cap 4 s, no jitter) and .NET (cap 5 s, jitter). Go/Java/JS/Python use a fixed wait; Go/Java/JS jitter, Python doesn't. ADR-40 describes an intent, not shipped behaviour.

### F-CLNT-23: "Current clients hardcode headers: true in CONNECT"
- Type: wrong (partially)
- Severity: low
- Claims: "Current clients hardcode `headers: true`" and "`headers` connect option shouldn't be exposed" (ADR-40)
- Verification: nats.go nats.go:3118 `hdrs := nc.info.Headers` feeding both `Headers` and `NoResponders` in `connectInfo` (:3119-3122). nats.rs connector.rs:638-639 `headers: true, no_responders: true` (hardcoded). Outside prescribed set: nats.js protocol.ts:874-877 set only `if (info.headers)`; nats.py aio/client.py:1741-1743 mirrors `server_info["headers"]`.
- Verdict: RESOLVED — Go, JS and Python mirror the server's `headers` flag; only Rust hardcodes true. The practical consequence (no user-facing option, `no responders requires headers support` cannot occur) holds either way.

### F-CLNT-24: ADR-15 "pull subscription with ack policy none is an error"
- Type: stale
- Severity: low
- Claims: "For pull subscriptions ack policy of 'none' or 'all' is an error" (ADR-15) vs CLI/Learn usage of AckNone pull consumers
- Verification: nats-server server/consumer.go:811-814 pull mode: `if config.AckPolicy == AckNone && cfg.Retention == WorkQueuePolicy { return NewJSConsumerPullRequiresAckError() }` — the only pull/AckNone rejection. nats.go jetstream package has no client-side check (grep AckNone in jetstream/consumer.go options: none rejecting pull).
- Verdict: RESOLVED — The server rejects AckNone pull consumers only on work-queue streams; on limits/interest streams they are valid and the new client APIs allow them. ADR-15's rule is legacy-API era.

### F-CLNT-25: Server-side slow consumer: only "write deadline" named
- Type: contradiction (incomplete)
- Severity: low
- Claims: "a server-side slow consumer is the server closing the whole connection because the client reads its socket too slowly to meet the server's per-client write deadline" (Learn — Slow Consumers) vs "builds a server-side backlog; past a threshold the server logs Slow Consumer Detected" (Learn — Publish-subscribe) vs "MaxPending 64 MiB" (Code — server/const.go)
- Verification: nats-server server/const.go:102 `MAX_PENDING_SIZE = (64 * 1024 * 1024)`, :132 `DEFAULT_FLUSH_DEADLINE = 10 * time.Second`; server/client.go:2597 `if c.kind == CLIENT && c.out.pb > c.out.mp` → :2610 "Slow Consumer Detected: MaxPending of %d Exceeded"; :1944-1985 `handleWriteTimeout` marks slow consumer on write deadline; stall gate :2619 `c.out.pb > c.out.mp/4*3`, stall constants :124-127; monitor.go:1277 `slow_consumers` in Varz.
- Verdict: RESOLVED — Two independent server triggers: outbound pending > 64 MiB (`max_pending`), or a flush exceeding `write_deadline` (10 s). The Learn Slow Consumers page should name both; the pub-sub page's "threshold" is the 64 MiB one.

### F-CLNT-26: "Go and Python reset a server's reconnect count on success" (implying others don't)
- Type: wrong (by implication)
- Severity: low
- Claims: "MaxReconnect is tracked per server, not per outage (Go, Java, JS, Python) … Go and Python reset a server's count on successful connect" (Learn — Reconnection)
- Verification: nats.go nats.go:3514 `cur.Reconnects = 0`. Outside prescribed set: nats.js protocol.ts:599 `this.server.reconnects = 0`; nats.java NatsServerPool.java:238 `entry.failedAttempts = 0`; nats.py aio/client.py:1669-1671; nats.rs connector.rs:424 `self.attempts = 0` (total counter).
- Verdict: RESOLVED — All of Go, Java, JS and Python reset the per-server count on a successful connect; Rust resets its pool-wide counter.

### F-CLNT-27: nats.js credentials "load once and need the callback form"
- Type: wrong (partially)
- Severity: low
- Claims: "nats.js, nats.rs, and nats.net load once and need the callback form for a rotation to reach a reconnect at all" (Learn — TLS & Auth)
- Verification: nats.rs options.rs:452-455 `credentials_file` reads the file when the option is built; callback path connector.rs:681-700 invoked per CONNECT. Outside prescribed set: nats.js authenticator.ts:125-128 `credsAuthenticator(creds: Uint8Array | (() => Uint8Array))` — the function form is re-read on every CONNECT (protocol.ts:112-114, 859-870); the byte form is fixed. nats.net UserCredentials.cs:20-22 reads the file once in the constructor; `AuthCredCallback` per connect (:63-74).
- Verdict: RESOLVED — Rust and .NET load once. nats.js has a lighter option than a full authenticator: pass `() => Uint8Array` to `credsAuthenticator` and the file is re-read per connect.

### F-CLNT-28: JS KV watch end-of-initial-data flag timing
- Type: wrong (detail)
- Severity: low
- Claims: "JavaScript sets an isUpdate flag" (Learn — Watching); "After the last snapshot entry and before the first live change, the watch delivers one end-of-initial-data signal" (same)
- Verification: nats.js (outside prescribed set) kv/src/kv.ts:919-931 `let isUpdate = … count === 0; … if (!isUpdate) { i++; isUpdate = i >= count; } const e = this.jmToWatchEntry(m, isUpdate);` — the flag flips on the last snapshot entry, not on the first live one; no separate marker. nats.go jetstream/kv.go:1371-1383 nil marker; nats.rs kv/mod.rs:1403-1405 internal `seen_current` only, no marker.
- Verdict: RESOLVED — In nats.js the *last* initial entry already carries `isUpdate: true`; there is no separate boundary event. Go/Python nil/None marker, Java `endOfData()`, .NET `OnNoData`, Rust none — all confirmed.

### F-CLNT-29: Client-side batch publishing support matrix (atomic and fast-ingest)
- Type: wrong (partially) / stale
- Severity: low
- Claims: "Atomic batch client support: CLI and nats.js in the core client; Go, Java, Rust, .NET via Synadia Orbit; nats.py via raw headers. Fast-ingest … client support: CLI benchmark only, Go/Rust/nats.js via Synadia Orbit, Python/Java/.NET only the stream flag so far" (Learn — Advanced publishing)
- Verification (outside prescribed set): nats.js jetstream/src/jsclient.ts:369-385 `startBatch`, :480/482/545 `Nats-Batch-Id/-Sequence/-Commit` (core, atomic); fast-ingest is in nats.js core as an internal export (jsclient.ts:75-80 "exposed via @nats-io/jetstream/internal … Not part of the public API") wrapped by orbit.js/fastingest (v1.0.0). orbit.go/jetstreamext/publishbatch.go (atomic); no `$FI`/fast-ingest code in orbit.go at 383ab6a. orbit.rs/jetstream-extra/src/batch_publish.rs and batch_publish_fast.rs (both). orbit.java/batch-publish BatchPublisher.java:230-234 (atomic). orbit.net Synadia.Orbit.JetStream.Publisher: NatsJSBatchHeaders.cs:25 (atomic) and NatsJSFastPublisher.cs:233 `".$FI"` (fast-ingest).
- Verdict: RESOLVED — Atomic: nats.js core; Go/Rust/Java/.NET via Orbit (confirmed). Fast-ingest: Rust and .NET via Orbit, JS via orbit.js over a nats.js-internal API, and **not** in orbit.go (Go has no fast-ingest client at 2026-06-30). Learn's "Go via Orbit" and ".NET only the stream flag" are wrong at these checkouts.

### F-CLNT-30: TLS-first availability and legacy "minimum client versions" for the proxy case
- Type: unverifiable (rationale) / confirmed (versions)
- Severity: low
- Claims: "TLS First … available since NATS Server 2.10.4" (ADR-40) and "Behind a TLS-terminating reverse proxy configure tls {} plus allow_non_tls: true; minimum client versions: nats.go v1.31.0, nats.js 2024.1.2, nats.java 2.18.0, nats.rs 0.33, …" (Legacy docs — Enabling TLS)
- Verification: nats-server commit `ce96de2ed` 2023-10-09 "[ADDED] TLS: Handshake First for client connections" first tag v2.10.4 (leafnode variant `0a02f2121` in v2.10.0). nats.go commit `1941a1a4` adding `TLSHandshakeFirst` first tag v1.31.0. The legacy page (nats.docs tls.md:255-272) ties the version table to the `allow_non_tls` proxy recipe without saying why; the versions coincide with each client's TLS-first support, but no code or maintainer statement links `allow_non_tls` to a client version.
- Verdict: REQUIRES RESOLUTION — 2.10.4 and nats.go v1.31.0 are confirmed as TLS-first versions. Why the proxy/`allow_non_tls` recipe needs those client versions is unbacked; a maintainer statement (kozlovic authored both commits) or a reproduction against nats.go v1.30 would settle it.

### F-CLNT-31: Java latency benchmark "55–86 ns median per message"
- Type: dubious
- Severity: low
- Claims: "medians of 55-86 nanoseconds … minimum 35 nanoseconds per message" (Blog — NATS Java Client Latency Benchmarking) [DUBIOUS]
- Verification: none available (blog only; no benchmark source or maintainer statement in the dump; nanosecond figures are physically impossible for a network round trip and can only be in-process timings).
- Verdict: REQUIRES RESOLUTION — Treat as client-internal instrumentation, not end-to-end latency; needs the benchmark harness or an author (scottf) statement to be quotable.

### F-CLNT-32: Client-library counts ("40+", "45+", "46+ clients") and "reconnect in 10–15 ms"
- Type: unverifiable
- Severity: low
- Claims: "more than 45 languages" (Blog — NATS for Retail); "40+ languages" (NATS Connect Live JetStream talk); "46+ clients" (RethinkConn '22 Q&A); "reconnect speed is usually about ten fifteen milliseconds" (SCaLE 13x)
- Verification: none available (marketing/talk figures; the reconnect timing predates jitter/backoff defaults — with today's nats.go defaults a reconnect after a full sweep waits 2 s + jitter, nats.go:56-58, though the first attempt is immediate).
- Verdict: REQUIRES RESOLUTION — Do not quote a number; "10–15 ms" contradicts current default reconnect waits except for the immediate first attempt.

### F-CLNT-33: scottf "old-style Java fetch blocks until the batch is collected"
- Type: unverifiable (per-language, maintainer-backed)
- Severity: low
- Claims: "Old-style Java fetch blocks until the batch is collected, skewing ack-wait timing; the simplified API delivers as messages arrive" (scottf, GitHub discussion)
- Verification: maintainer statement (scottf) in the dump; not checked against nats.java source in this review.
- Verdict: RESOLVED (maintainer) — acceptable as a maintainer statement; verified for Java only by attribution, not by code.

## Summary

Counts by type: contradiction 13, wrong 9 (incl. partial), stale 4, unverifiable 3, dubious 1 (some findings carry two types; primary type counted). Total findings: 33.

Counts by verdict: RESOLVED 30, REQUIRES RESOLUTION 3.

Claims checked and found correct as stated (no finding raised): Go `Drain()` returns immediately / 30 s default / 5 s pub-flush bound / `ErrDrainTimeout` (nats.go:66, 6316, 6325, 6341-6358); Go `Flush()` = 10 s (nats.go:6008); Go publish checks `ErrHeadersNotSupported`, `ErrConnectionDraining`, `ErrMaxPayload`, `ErrReconnectBufExceeded` (nats.go:4587-4613); Go status enums incl. DRAINING_SUBS/PUBS and `SubscriptionSlowConsumer` (nats.go:189-195, 775-778); slow-consumer callback once per episode (nats.go:4021-4037, reset :3994); resub-then-flush-pending order on reconnect (nats.go:3520-3523); `RetryOnFailedConnect` returns immediately in RECONNECTING (nats.go:2970-2975); Rust `flush()` resolves on socket write, not PONG (lib.rs:651-660, client.rs:881-891); Rust no discovered-servers event (lib.rs:1134-1143); Rust `retain_servers_order`/`ignore_discovered_servers`/`with_auth_callback`/`retry_on_initial_connect` names; Rust KV `get` → `Option` (kv/mod.rs:903), `double_ack` (message.rs:427); Go KV `ErrKeyNotFound`, `ErrMsgAlreadyAckd` text, IncludeHistory/UpdatesOnly mutual rejection (kv_options.go:32,44); Go legacy helper-created durables deleted on Unsubscribe/Drain (js.go:2021-2023); Go micro `Stop()` drains and returns before handlers finish (micro/service.go:711-745); server verbose default on (client.go:706), `maximum subscriptions exceeded` non-terminal (client.go:2546), server delays PING under inbound activity (client.go:5849); no WebSocket in nats.c; natscli unlimited reconnects + `IgnoreAuthErrorAbort` + 500 ms→20 s backoff with 0.5–1.5× jitter (cli/util.go:241-244, internal/util/backoff.go:31-45,97-102), `nats reply` `Drain()` then `log.Fatalf` (reply_command.go:223-228), `consumer next --count` = N single pulls (consumer_command.go:2449-2453), `--allow-direct` default true (stream_command.go:236), no retry-on-first-connect flag; nats-core (python) `requires-python >= 3.13` with a `websocket` extra (nats-core/pyproject.toml:10,29).

### REQUIRES RESOLUTION

| ID | Title | What would settle it |
|---|---|---|
| F-CLNT-30 | Why the `allow_non_tls` proxy recipe needs nats.go ≥ v1.31.0 etc. | Maintainer statement (kozlovic) or a repro with nats.go v1.30 against `tls {}` + `allow_non_tls` behind a TLS proxy |
| F-CLNT-31 | Java "55–86 ns median latency" | Benchmark harness source or author statement clarifying what was timed |
| F-CLNT-32 | "40+/45+/46+ client languages", "reconnect in 10–15 ms" | Drop the numbers or cite a maintained client list; re-measure reconnect with current defaults |

### Top 10 RESOLVED corrections (by severity)

1. F-CLNT-1 — Default pending limits are 500,000 msgs / 64 MiB (Go), 512 Ki / 128 MiB (Py), 512 Ki / 64 MiB (Java), 65,536 msgs (Rust), 16,384 msgs (.NET), unbounded (JS); the legacy 65536 figure is dead.
2. F-CLNT-8 — Only nats.go retries a JetStream publish on no-responders (2 × 250 ms, then `no response from stream`); Rust/Python/Java/JS fail immediately. "Fails immediately" and "let the client retry through an election" are each true for only some clients.
3. F-CLNT-6 — nats.go installs a default async error handler that prints to stderr; a nil callback does not silence slow-consumer or permission errors.
4. F-CLNT-7 — Java aborts on repeated auth errors with no opt-out; Python closes permanently on an in-session `Authorization Violation`; Rust never aborts.
5. F-CLNT-20 — The LDM INFO removes only *discovered* URLs from the nats.go pool; configured URLs stay and may be re-dialled; no automatic LDM reconnect exists in nats.go v1.53.1.
6. F-CLNT-22 — Exponential reconnect backoff exists only in Rust (no jitter, cap 4 s) and .NET (jitter, cap 5 s); Go/Java/JS/Python use a fixed wait. ADR-40's rule is aspirational.
7. F-CLNT-4 / F-CLNT-5 — ADR-40 defaults (max reconnects "3/none", connect timeout 5 s) match no client except Rust's 5 s; use the per-language matrix.
8. F-CLNT-10 — Ordered-consumer inactivity threshold is 5 min in Go and JS, 30 s in Rust, server default in Java; `prefix_N` naming is Go/JS only; heartbeat-loss recreation differs per client.
9. F-CLNT-18 / F-CLNT-17 — nats.py has a first-class `publish_async` (Future, 4000 in flight) but no `consume()`.
10. F-CLNT-2 / F-CLNT-3 — nats.net v3: 16,384-message DropNewest channel for both `NatsConnection` and `NatsClient`; `INatsSub.DrainAsync` exists (no connection-level drain).


<!-- ===== OPS ===== -->

# Review: OPS

Source tree verified: nats-server at commit 8e54a5954 (server/const.go:69 `VERSION = "2.15.0-dev"`; newest release tag in repo v2.14.5). "current source" below means that commit. Version boundaries come from `git tag --contains` on the introducing commit.

### F-OPS-1: sync_interval default, `always`, and what a PubAck guarantees
- Type: contradiction (resolved as consistent)
- Severity: high
- Claims: "`sync_interval` default is 2 minutes; fsync-ed no later than this interval" (legacy docs — JetStream concept overview; Jepsen 2.12.1 blog; Learn — Replication and R=3) vs "`sync: always` fsyncs after every message before ack, server-wide impact" (legacy docs — Configuration) vs "stream-level `async` overrides server `sync: always`" (ADR-56) vs "The filestore sync interval is configurable via `jetstream { sync: 1s }`" (derekcollison, discussion 6683)
- Verification: server/filestore.go:332 `defaultSyncInterval = 2 * time.Minute`; server/opts.go:6178-6179 applies it when unset; server/opts.go:2696-2699 (`sync`/`sync_interval` key; the literal `always` sets `SyncAlways = true` and keeps the 2m interval); server/filestore.go:13960-13963 (SyncAlways → O_SYNC writes); server/filestore.go:11754-11757 (first background sync fires between interval/2 and interval, so "no later than the interval" holds); server/filestore.go:764-773 (`PersistMode == AsyncPersistMode` forces `SyncAlways = false` on that stream, confirming ADR-56). derekcollison, https://github.com/nats-io/nats-server/discussions/6683 ("You can set the sync interval by adding the property under the jetstream configuration block … `sync: 1s`").
- Verdict: RESOLVED — All sources agree: default background sync every 2 minutes (with jitter, never later than 2m), `sync: always` fsyncs each write before the ack, and a stream created with async persist mode ignores `sync: always`. A PubAck on a replicated stream proves quorum commit, not fsync; on an R1 stream it proves the write reached the OS page cache only. The legacy-docs figure "`always` slows throughput to a few hundred msg/s" has no code or maintainer basis (see F-OPS-31).

### F-OPS-2: write_deadline default 2s vs 10s
- Type: stale
- Severity: medium
- Claims: "write_deadline 2s" (legacy docs — Monitoring endpoints sample `/varz`; legacy docs — Slow Consumers example) vs "write_deadline 10s" (legacy docs — Configuration reference; code — server/opts.go baseline; NBE `nats server info` 2.10.1 output; derekcollison, discussion 4314)
- Verification: server/const.go:131-132 `DEFAULT_FLUSH_DEADLINE = 10 * time.Second`; introducing commit 06ca58033 ("Update write deadline, client processing and slow proxy") first released in v2.2.0. derekcollison, https://github.com/nats-io/nats-server/discussions/4314 ("only due to system call to pwrite() taking more that 10s (you can configure this)").
- Verdict: RESOLVED — Default `write_deadline` is 10s since v2.2.0. The 2s value in the sample `/varz` output is pre-2.2 and stale; the Slow Consumers page's "raise it to 2s" example is below the default and misleading.

### F-OPS-3: tls_timeout 0.5s / auth_timeout 1s in sample varz
- Type: stale
- Severity: low
- Claims: "tls_timeout 0.5, auth_timeout 1" (legacy docs — Monitoring endpoints sample `/varz`) vs "tls timeout 2s; auth_timeout = tls timeout + 1s when TLS is configured else 2s" (code — server/opts.go setBaselineOptions; NBE 2.10.1 output "TLS Timeout 2.00s")
- Verification: server/const.go:107-108 `TLS_TIMEOUT = 2 * time.Second` (since v2.0.2, commit 8147adc1b); server/const.go:116-117 `AUTH_TIMEOUT = 2 * time.Second`; server/opts.go:6192-6200 `getDefaultAuthTimeout` returns `tlsTimeout + 1.0` when a TLS config exists, else 2.
- Verdict: RESOLVED — TLS timeout default is 2s; auth timeout default is 2s without TLS and tls_timeout+1s (3s by default) with TLS. The sample `/varz` block predates 2.0.2.

### F-OPS-4: Lame duck mode mechanics (grace, minimum, spread, what happens to JetStream and SIGTERM)
- Type: contradiction / stale
- Severity: high
- Claims: "LDM: stop accepting new connections, 10 second grace period, then evict clients over `lame_duck_duration` (default 2 minutes)" (legacy docs — Lame Duck Mode; ADR-5) vs "the node closes its client listener, transfers any Raft leadership it holds, shuts JetStream assets down cleanly, broadcasts INFO ldm:true, then after a grace period closes remaining clients; the server ignores SIGTERM while draining; grace must be shorter than duration; minimum 30s" (Learn — Rolling upgrades) vs "Set `lame_duck_duration` to cover … how long JetStream needs to move leadership off the node" (Learn — Rolling upgrades) vs "LDM moves leadership away but a new peer is only chosen when the node is removed from the Raft group" (ripienaar, discussion 2730)
- Verification: server/server.go:4446-4560 `lameDuckMode()`: closes listener (4457), calls `s.transferRaftLeaders()` and waits 1s (4471-4479), then `s.shutdownJetStream()` (4482) and `s.shutdownRaftNodes()` (4485) BEFORE sending LDM INFO to routes/clients (4539-4540), then waits the grace period (4543-4552) and closes clients spread over `LameDuckDuration - LameDuckGracePeriod` (4503-4505, `dur -= int64(gp)`). server/opts.go:1468 rejects `lame_duck_duration` under 30s; server/server.go:1159-1161 rejects grace ≥ duration; server/const.go:196-200 defaults 2m / 10s; server/signal.go:64-74 SIGTERM is ignored when `s.ldm` is set.
- Verdict: RESOLVED — Learn's sequence is correct, with two corrections to the rest of the material: (1) client eviction is spread over `duration − grace` (1m50s by default), not over the full duration; (2) JetStream on the node is already shut down before the first client is evicted, so `lame_duck_duration` does not need to "cover JetStream leadership movement": leadership transfer completes (with a fixed 1s wait) before the client drain starts, and the duration only governs how client reconnects are spread. ripienaar's statement (LDM moves leadership, replacement peer only on peer-remove) is consistent with the code.

### F-OPS-5: Upgrade order rule (meta-leader last) and the metadata election stall
- Type: contradiction
- Severity: medium
- Claims: "Rolling upgrade, one node at a time: enter LDM, replace binary, restart, wait for /healthz 200" with no ordering rule (legacy docs — Upgrading a Cluster) vs "upgrade the non-leaders first and the meta-leader last … typically about 5 to 10 seconds with default timeouts if killed outright, or roughly a second if it handed leadership off first" (Learn — Rolling upgrades) vs "When a JetStream server is lost the meta leader moves to another node almost instantaneously" (talk — Effective debugging using the NATS CLI)
- Verification: server/raft.go:298-299 `minElectionTimeoutDefault = 4s`, `maxElectionTimeoutDefault = 9s`; raft.go:2564-2565 election timeout drawn uniformly in [4s, 9s); raft.go:303 `lostQuorumIntervalDefault = 10s`. server/server.go:4471-4479: LDM transfers Raft leadership (meta group included) before anything else.
- Verdict: RESOLVED — With LDM every node hands leadership off before restart, so "meta-leader last" is a harmless preference, not a requirement, and the legacy procedure is complete as written. An outright kill of the meta leader leaves the meta group leaderless for the election timeout, which is 4–9s (Learn's "5 to 10" is an approximation; the talk's "almost instantaneously" is wrong for a kill). The "roughly a second" after hand-off matches the fixed 1s wait at server.go:4474 but the transfer's own latency is not measured anywhere in the source.

### F-OPS-6: JetStream API request queue limit (`request_queue_limit`)
- Type: stale check (resolved as correct)
- Severity: medium
- Claims: "Since v2.10.21 the JetStream API has a limit of 10K inflight requests … When the request limit is reached, all pending requests are dropped" (legacy docs — Configuring JetStream) vs "when the routed API request queue reaches `request_queue_limit` (default 10,000) the server … DRAINS THE ENTIRE QUEUE" (code — server/jetstream_api.go:916-944)
- Verification: server/jetstream_api.go:393 `JSDefaultRequestQueueLimit = 10_000`; jetstream_api.go:930-933 `queue.drain()` and advisory `JSAdvisoryAPILimitReached`; `git grep JSDefaultRequestQueueLimit v2.10.20` = 0 hits, `v2.10.21` = 2 hits (introduced in 2.10.21). server/opts.go:6181-6185: a separate info-request queue (`JetStreamInfoQueueLimit`) defaults to the same limit.
- Verdict: RESOLVED — Both sources are correct and agree: 10,000 default since 2.10.21, entire queue dropped on overflow, advisory `$JS.EVENT.ADVISORY.API.LIMIT_REACHED`. Note (absent from all sources): since the current source, INFO-type requests sit in their own queue with the same limit.

### F-OPS-7: `/healthz?js-server-only` semantics and the readiness-probe advice
- Type: stale (version boundary)
- Severity: high
- Claims: "Readiness (`js-server-only=true`) deliberately skips stream, consumer, and meta-assignment checks, so a pod catching replicas up still reports ready" (Learn — Kubernetes) vs "On 2.10 change the readiness probe from `js-server-only` to `/` or `js-enabled-only` so the k8s service does not detach under heavy meta activity; 2.11 made the probe less sensitive" (wallyqs, issue 5976) vs "`js-server-only` skips account/stream/consumer checks; `js-enabled-only` errors if JetStream is disabled" (legacy docs — Monitoring)
- Verification: current server/monitor.go:3689-3691 `if opts.JSServerOnly { return health }` sits before any JetStream check (3696 onward), i.e. it only verifies the server accepts connections; monitor.go:3718-3720 `JSEnabledOnly` returns after the "JS enabled" check and before meta/asset checks; monitor.go:3934-3936 `JSMetaOnly` returns after the meta-leader check. Ordering by tag: v2.10.26 monitor.go has `JSEnabledOnly` return at line 3398 and `JSServerOnly` return at line 3569 (after the meta-leader currency check); v2.11.0 has `JSServerOnly` at 3395 before `JSEnabledOnly` at 3423. `js-meta-only` introduced by commit 2252052 (v2.11.0). wallyqs, https://github.com/nats-io/nats-server/issues/5976 ("On v2.10, should be fixed by changing the readiness the probe from being `js-server-only` to `/` or `js-enabled-only`. In v2.11, using `js-server-only` this is now avoided too.")
- Verdict: RESOLVED — In 2.10.x, `js-server-only` still failed while the node was "not current with the meta leader"; from 2.11.0 it returns before every JetStream check and is the least strict JetStream probe. Learn's description is correct for 2.11+; wallyqs's advice is correct for 2.10 only. `js-enabled-only` returns 200 regardless of quorum (it never reaches the meta check), and `js-meta-only` (2.11+) is the quorum probe, as Learn states.

### F-OPS-8: Consumer info requests "go to the meta-leader"
- Type: wrong
- Severity: medium
- Claims: "Consumer info requests go to the meta-leader and involve expensive state calculation" (blog — JetStream Anti-Patterns) vs "Stream/consumer info calls have server-side cost; do not poll them often" (neilalexander, discussion "Some questions about NATS")
- Verification: server/jetstream_api.go:5171 comment "If we are in clustered mode we need to be the consumer leader to proceed"; 5210 `isConsumerLeader := cc.isConsumerLeader(...)`; the meta leader answers only when no consumer assignment exists (5219-5236, returns not-found errors) or delays an error when leaderless.
- Verdict: RESOLVED — CONSUMER.INFO is answered by the consumer's Raft leader (or the single server when not clustered), not by the meta leader. The cost warning stands; the routing claim is wrong.

### F-OPS-9: Minimum RAM and CPU for a JetStream server
- Type: contradiction / unverifiable
- Severity: high
- Claims: "start with at least 4 CPU cores and 8 GiB" and minimum tables "1 core / 32 MiB for 1,000 msg/s … 3 nodes 1 core / 256 MiB for 100,000 msg/s" (legacy docs — Installing) vs "at least 2 cores, at least 8 GiB RAM, SSD ≥3000 IOPS" (blog — Deploying a scalable NATS cluster part 1) vs "We recommend 4 cpu and at east 8Gi for JetStream enabled servers" (derekcollison, discussion 3210, 2022-06) vs "general recommendation is to use at least 4 cores and 16GB of mem … (plus SSD volumes)" (wallyqs, discussion 6397, 2025-01) vs "I wouldn't run nats with below 3GB memory when using Jetstream" and "there's some guidance on the website about memory usage but its definitely wrong" (ripienaar, issue 5739, 2024-08) vs "2–4 CPUs and 8 GB per server" (talk — F1 Arcade) vs "Recommend at least 4 vcpu with that many consumers" (wallyqs, discussion 7863, 2026)
- Verification: no code basis exists (the server has no minimum-resource check). Maintainer statements with URLs: https://github.com/nats-io/nats-server/discussions/3210 (derekcollison, quoted above); https://github.com/nats-io/nats-server/discussions/6397 (wallyqs, quoted above); https://github.com/nats-io/nats-server/issues/5739 (ripienaar, quoted above); https://github.com/nats-io/nats-server/discussions/7863 (wallyqs).
- Verdict: REQUIRES RESOLUTION — The maintainers' floor rose from 4 CPU / 8 GiB (2022) to 4 cores / 16 GB (2025) and a maintainer called the website memory tables wrong. The legacy 32–256 MiB tables must not be reproduced. Settling it needs a current maintainer statement on the intended published minimum (4c/8 GiB vs 4c/16 GB) and whether the blog's "2 cores" is acceptable for anything but dev.

### F-OPS-10: GOMEMLIMIT percentage and name
- Type: contradiction / unverifiable
- Severity: medium
- Claims: "GOMEMLIMIT at 90%" (legacy docs — Installing minimum tables) vs "`GOMEMLIMIT` at 80-90% of the instance's memory limit (8 GiB → 6GiB)" (blog — Deploying a scalable NATS cluster) vs "set the env GOMEMLIMIT to ~75% of actual limit" (derekcollison, issue 5739) vs "`GO_SOFT_MEMLIMIT` (GOMEMLIMIT) as the Helm chart does" (derekcollison, discussion 4314) vs "`MemoryMax=6G`, `GOMEMLIMIT=5500MiB`" (~92%) (Learn — Hardening)
- Verification: derekcollison, https://github.com/nats-io/nats-server/issues/5739 ("A good practice when limiting memory via cgroups and containers is to set the env GOMEMLIMIT to ~75% of actual limit."); derekcollison, https://github.com/nats-io/nats-server/discussions/4314 ("set the `GO_SOFT_MEMLIMIT` env variable") — the Go runtime variable is `GOMEMLIMIT`; `GO_SOFT_MEMLIMIT` does not exist. Server-side effect of GOMEMLIMIT: server/jetstream.go:2757-2763 caps the dynamic `max_memory_store` at 75% of min(system memory, GOMEMLIMIT). nats-io/k8s helm values.yaml only shows `GOMEMLIMIT: 7GiB` as an example (no default).
- Verdict: REQUIRES RESOLUTION — The only maintainer number is ~75%; the docs (90%), blog (80–90%) and Learn example (~92%) all exceed it with no stated basis. Settle by adopting 75% unless a maintainer confirms a higher figure. Separately RESOLVED: the variable is `GOMEMLIMIT`; "GO_SOFT_MEMLIMIT" is a misnomer in the maintainer comment.

### F-OPS-11: Dynamic default limits for memory and file store
- Type: contradiction (resolved as consistent)
- Severity: medium
- Claims: "Memory storage defaults to 75% of system RAM (capped by GOMEMLIMIT), falling back to 256 MB; file storage defaults to 75% of disk available under store_dir, falling back to 1 TB" (Learn — Sizing & resources) vs "Resources are dynamically determined by default" with no figures (legacy docs — Configuring JetStream)
- Verification: server/jetstream.go:2719-2722 (`JetStreamMaxStoreDefault` 1 TB, `JetStreamMaxMemDefault` 256 MB), 2750-2751 (`diskAvailable(storeDir)` when max_file_store unset), 2756-2765 (75% of system memory, reduced to GOMEMLIMIT if lower, else 256 MB); server/disk_avail.go:23 / disk_avail_openbsd.go:30-34 (75% of `statfs` available bytes, 1 TB if the call fails).
- Verdict: RESOLVED — Learn's figures are exact.

### F-OPS-12: Memory streams, snapshots and backups
- Type: contradiction (resolved as consistent)
- Severity: medium
- Claims: "Memory storage streams do not support snapshots. Only file-based storage streams can be backed up" (legacy docs — Disaster Recovery; Learn — Stream backup and restore: "backup fails with `memory streams do not support snapshots`") vs "Memory streams survive restarts only when R3 with rolling restarts and healthz checks; for backup create a file-backed mirror" (derekcollison, discussion "Backup data … storage is memory") vs "R3 in-memory streams can survive a careful rolling restart" (talk — Migrating from NATS Streaming)
- Verification: server/memstore.go:2384-2386 `func (ms *memStore) Snapshot(...) { return nil, fmt.Errorf("no impl") }`; the API wraps it as errors.json:616 "snapshot failed: {err}". The exact string "memory streams do not support snapshots" does not occur in server source (it is CLI-side or paraphrase).
- Verdict: RESOLVED — Memory streams cannot be snapshotted by the server; replication (R3) is the only way memory-stream data survives a node restart, and a file-backed mirror is the backup path. All three sources agree; only the quoted error text is not the server's.

### F-OPS-13: Restore under a different stream name
- Type: unverifiable
- Severity: low
- Claims: "The server rejects a restore under a different name: `stream name may not be changed during restore`" (Learn — Stream backup and restore) vs "`nats account restore` will fail if a stream with the same name already exists" (legacy docs — Disaster Recovery)
- Verification: server/errors.json:1296 "stream name already in use, cannot restore" (JSStreamNameExistRestoreFailedErr) confirms the legacy claim. No server string matches "may not be changed during restore".
- Verdict: REQUIRES RESOLUTION — The rename rejection is most likely enforced by natscli (the snapshot's `backup.json` carries the name), not the server. Grep natscli `cli/stream_command.go` for the string to confirm before attributing it to the server.

### F-OPS-14: Snapshot chunk size, window and flow-control timeout
- Type: unverifiable (resolved)
- Severity: low
- Claims: "8 MiB window by default, 64 of the default 128 KiB chunks; if no chunk ack arrives for about five seconds the backup aborts" (Learn — Stream backup and restore)
- Verification: server/jetstream_api.go:4492-4494 `defaultSnapshotChunkSize = 128 * 1024`, `defaultSnapshotWindowSize = 8 * 1024 * 1024`, `defaultSnapshotAckTimeout = 5 * time.Second`; 4556, 4589 ack timer.
- Verdict: RESOLVED — Exact.

### F-OPS-15: Snapshot consistency: "configuration frozen, no retention eviction during backup"
- Type: unverifiable
- Severity: medium
- Claims: "During backup the stream's configuration is frozen and no data will be evicted based on stream retention policies" (legacy docs — Disaster Recovery) vs "A snapshot is a complete copy of a stream at one instant" (Learn — Stream backup and restore)
- Verification: server/filestore.go:12365 (`fs.Snapshot` takes `fs.mu.Lock()`) and 12187 (`streamSnapshot` re-locks per block) show the store is locked while each block is copied, but I did not find code that suspends age-based expiry or limits enforcement for the whole duration of a multi-minute snapshot. No maintainer statement located.
- Verdict: REQUIRES RESOLUTION — Read `fileStore.Snapshot`/`streamSnapshot` (filestore.go ≈12150-12420) and `stream.snapshot` in stream.go:9180-9230 to confirm whether `ageChk`/limits are paused (or a consistent block list is captured up front) during the chunk stream. Until then, present the backup as "consistent per block, taken under the store lock" rather than "retention frozen".

### F-OPS-16: Mirror configuration cannot be changed after creation
- Type: contradiction (resolved as consistent)
- Severity: low
- Claims: "A mirror's configuration is fixed once the stream exists; you can't re-point a running mirror" (Learn — Mirrors as a DR tool) vs "Stream sources can be added or removed at any time by editing the stream config" (jnmoyne, discussion "Source stream from multiple leaf nodes") vs "Almost all stream options … can be changed at runtime" (talk — How to configure NATS JetStream streams)
- Verification: server/errors.json:346 "stream mirror configuration can not be updated" (JSStreamMirrorNotUpdatableErr).
- Verdict: RESOLVED — Mirror config is immutable; sources are editable. "Almost all options" is true only with the mirror exception.

### F-OPS-17: "The origin won't even see a consumer created" for a mirror
- Type: wrong
- Severity: low
- Claims: "Mirror configuration lives entirely on the receiving side; the origin … won't even see a consumer created for the replication" (talk — Mirror Streams Explained) vs "`/jsz?…&direct-consumers=true` exposes internal replication consumers named `mirror-<id>` / `src-<id>`" (ADR-59) and "mirror consumers `JS_MIRROR_<suffix>`, source consumers `JS_SRC_<suffix>`" (ADR-60)
- Verification: server/stream.go:2808 `fmt.Sprintf("JS_MIRROR_%s", id)`, 2816 `JS_SRC_%s`, 3562, 3742, 4020, 4228 (consumer create requests issued against the origin stream).
- Verdict: RESOLVED — The mirror creates a direct (internal, hidden-from-listing) consumer on the origin stream. The origin needs no configuration, but it does host a consumer, visible via `/jsz?direct-consumers=true`.

### F-OPS-18: Editing stream compression: immediate, on restart, or never for old blocks
- Type: contradiction
- Severity: medium
- Claims: "Compression is editable on an existing stream; the server … will effectively rip through all the message blocks in real time" (talk — NATS 2.10 Webinar) vs "Changing the algorithm later only affects new blocks; this will not result in existing blocks being proactively compressed or decompressed" (ADR-35) vs "Editing later is allowed but takes effect only after the stream's store restarts (server restart or leader change), and blocks already on disk stay as they are" (Learn — Stream and consumer policies)
- Verification: server/filestore.go:679-760 `fileStore.UpdateConfig` replaces `fs.cfg` but never assigns `fs.fcfg.Compression`; `fcfg.Compression` is set only at store construction (server/stream.go:1008 `fsCfg.Compression = config.Compression`); `recompressOnDiskIfNeeded` is invoked only when a block is closed at end-of-block (filestore.go:4845-4852) or truncated (11054), never as a sweep.
- Verdict: RESOLVED — Learn and ADR-35 are correct; the webinar claim is wrong. A compression edit is stored in the stream config but the running filestore keeps its old algorithm until the store is re-created (restart or leader move); existing blocks are re-encoded only when they are next closed or truncated.

### F-OPS-19: Encryption at rest on pre-existing data
- Type: stale / wrong
- Severity: medium
- Claims: "Enabling on existing data encrypts only new blocks; back up and restore to re-encrypt old blocks … Cipher can change if the key stays the same" (legacy docs — Encryption at Rest; ADR-12 "a backup and restore will be equivalent to changing all of the encryption keys") vs "To rotate the master key, restart once with the new key in `key` and the old in `prev_key`" (Learn — Encryption & TLS)
- Verification: server/filestore.go:1150-1170 (`createdKeys = true` when a block has no key file) and 1204-1208 (`if createdKeys { mb.convertToEncrypted() }`) — plaintext blocks are converted when loaded with a key configured; `convertToEncrypted` first appears in v2.9.0; 1188-1191 and 1410-1411 `convertCipher()` handle a cipher change with the same key. server/opts.go:2724-2725 accepts `prev_key`/`prev_ek`/`prev_encryption_key` into `JetStreamOldKey`.
- Verdict: RESOLVED — Since 2.9.0 existing plaintext blocks are encrypted in place when the server loads them with a key set; the "only new blocks; back up and restore to re-encrypt" instruction is stale. Cipher change with a retained key is supported. `prev_key` exists; the Learn claim that the server "re-wraps per-stream keys and persists the result" on that restart is plausible but its mechanics were not traced (low).

### F-OPS-20: Slow consumer detection for routes/gateways vs clients
- Type: contradiction (resolved as consistent)
- Severity: low
- Claims: "Route/gateway slow consumers are time-based only (pwrite exceeding the write deadline, default 10 s), not size-based like clients" (derekcollison, discussion 4314) vs "`write_deadline` applies to client, route, leaf and gateway connections; `max_pending` applies only to clients" (wallyqs, same thread) vs "server buffers outbound, then designates slow consumer" with no kind distinction (legacy docs — Slow Consumers)
- Verification: server/client.go:2597 `if c.kind == CLIENT && c.out.pb > c.out.mp` (size-based check is client-only); client.go:1936-1999 write-timeout slow-consumer path applies to all kinds; const.go:132 10s default. derekcollison, https://github.com/nats-io/nats-server/discussions/4314.
- Verdict: RESOLVED — Both maintainer statements match the code.

### F-OPS-21: Route pooling numbers (3 + 1 per peer)
- Type: unverifiable (partially resolved)
- Severity: low
- Claims: "a pool of three plus a dedicated system-account route, so a default three-node cluster shows eight entries on one node, four per peer" (Learn — Monitoring endpoints) vs "the system account is pinned to a dedicated connection and other accounts are spread over a pool of three" (talk — NATS 2.10 Webinar)
- Verification: server/const.go:158-159 `DEFAULT_ROUTE_POOL_SIZE = 3`; server/route.go:78-80 (dedicated per-account route field), 600-610 (dedicated-account route setup, including the "running without system account" case).
- Verdict: RESOLVED — Pool size 3 is verified and a dedicated route per pinned account exists; the system account being pinned by default is asserted by a maintainer talk and matches route.go:608's wording but I did not trace the explicit default. Treat the 8-entries figure as correct.

### F-OPS-22: `no_auth_user` and config reload
- Type: contradiction (resolved with nuance)
- Severity: low
- Claims: "`no_auth_user` can't be introduced or changed by config reload (`config reload not supported for NoAuthUser`)" (Learn — Accounts and multitenancy) vs "Reloadable keys: account, user, and permission definitions …" (Learn — Config management)
- Verification: server/reload.go:1936-1947 `case "noauthuser"`: only removing `no_auth_user` while also removing that user from `users` passes; adding or changing it (or removing it while the user remains) returns "config reload not supported".
- Verdict: RESOLVED — Learn is right for add/change; one narrow removal case does reload.

### F-OPS-23: Other reload claims (max_connections, max_subscriptions, prof_block_rate, prof_port, JetStream limits)
- Type: unverifiable (resolved)
- Severity: low
- Claims: "`max_connections` … reloadable; `max_subscriptions` reload rejects; `prof_block_rate` is reloadable; `prof_port` is not reloadable" (Learn — Sizing, Profiling) vs "prof_port does not support config reload" (legacy docs — Profiling) vs "JetStream store limits cannot be hot-reloaded" (wallyqs, k8s issue; code — reload.go)
- Verification: server/reload.go:556-592 (`max_connections`, with excess connections closed), 899 (`prof_block_rate`), 1812-1822/1855-1866 (store dir, dynamic→fixed, decreases rejected), 1977 default case rejects any other changed field; no `MaxSubs` or `ProfPort` handler exists.
- Verdict: RESOLVED — All four claims are correct.

### F-OPS-24: System-account CPU profile cap of 15 seconds
- Type: unverifiable (resolved)
- Severity: low
- Claims: "the server rejects a window longer than 15 seconds" (Learn — Profiling the server) vs "CPU profile default 5 seconds" (legacy docs — Profiling)
- Verification: server/monitor.go:4188 `if opts.Duration <= 0 || opts.Duration > 15*time.Second`.
- Verdict: RESOLVED — Cap is 15s server-side; the 5s default is the CLI's timeout.

### F-OPS-25: ADR-61 `META.RESCUE` vs "no in-product recovery exists on 2.12+"
- Type: stale (version boundary)
- Severity: high
- Claims: "On 2.12+ a fresh empty node cannot force itself into the peer set … If original hosts are destroyed, no in-product recovery exists on 2.12+; restore from backup" (blog — Recovering Quorum After Renaming Servers) vs "New operator-only broadcast API `$JS.API.META.RESCUE` … 5 minute rescue timeout" (ADR-61; code — server/raft.go RescueQuorum)
- Verification: server/raft.go:1248-1300 `RescueQuorum`, 308 `rescueQuorumTimeoutDefault = 5 * time.Minute`; introducing commit 6b81579 is contained in NO release tag (newest v2.14.5); server/const.go:69 `VERSION = "2.15.0-dev"`. Empty-log protections: raft.go:259 (`initializing`), 334-341 (`Recovering`, `ScaleUp` comments), 636-650 (empty-log node forced observer during scale-up), introduced by commit bb0f673 first tagged v2.12.0.
- Verdict: RESOLVED — Both are correct for their versions: from 2.12.0 an empty-log server cannot vote itself into leadership, so the 2.10/2.11 "scale to 4 and peer-remove" trick no longer works and released servers up to 2.14.5 have no rescue API. `META.RESCUE` is unreleased (2.15) at the source commit; any text must gate it on 2.15.

### F-OPS-26: ADR-62 evacuate / desired-state APIs and the "2.14-compat" upgrade path
- Type: stale / unverifiable
- Severity: medium
- Claims: "Evacuate: `$JS.API.STREAM.PEER.EVACUATE.<stream>` / `$JS.API.SERVER.EVACUATE` … Upgrading directly to 2.15 is not recommended; path is 2.14 → 2.14-compat → 2.15" (ADR-62) vs "Peer-removing nodes … is a destructive operation" with no evacuate option (legacy docs — JetStream Administration)
- Verification: server/jetstream_api.go:179-180, 205 define the evacuate subjects in current source; `git grep -c "PEER.EVACUATE\|SERVER.EVACUATE" v2.14.5 -- server/jetstream_api.go` = 0. No release named "2.14-compat" exists among tags (v2.14.0–v2.14.5).
- Verdict: RESOLVED for the API (2.15-only, unreleased); REQUIRES RESOLUTION for the "2.14-compat" step — it is an ADR intention with no tag, so the docs must not promise a specific compat release until one ships.

### F-OPS-27: Stream peer-remove when no replacement server exists
- Type: contradiction
- Severity: medium
- Claims: "If placement leaves nowhere to re-place the replica, an R>1 stream still loses the peer and returns `peer remap failed`, leaving the group a replica short; only a single-replica stream is spared" (Learn — Scaling and peer management) vs "removes immediately and assigns a replacement if available, else the group will run under-replicated; removing the last (R1) peer moves the stream to a new peer without preserving the data" (ADR-62)
- Verification: server/jetstream_api.go:2500-2504: stream-level peer remove calls `removePeerFromStreamLocked(sa, nodeName, peerRemoval{remove: remove, requireReplicas: true})` and answers `NewJSPeerRemapError()` when it returns false; server/jetstream_cluster.go:3113-3122: with `requireReplicas` set, a group that would miss peers is REJECTED before any proposal ("JetStream cluster rejected peer removal, no replacement available"). No R1 special case in that path.
- Verdict: RESOLVED for the stream-level API in current source — the removal is refused and the peer stays; the stream is not left a replica short. REQUIRES RESOLUTION for the server-level `$JS.API.SERVER.REMOVE` path (the `requireReplicas: false` call sites in jetstream_cluster.go were not traced), which is where ADR-62's "run under-replicated" wording may apply.

### F-OPS-28: What `num_redelivered` counts
- Type: contradiction
- Severity: low
- Claims: "num_redelivered: currently tracked as delivered more than once — not a lifetime tally; it drops when the message is finally acked" (Learn — JetStream health) vs "That reporting is tied to server lifetime but the consumer state is persisted. So possible to see 0 redelivered but they could have happened prior to a server restart" (derekcollison, discussion 5737)
- Verification: server/consumer.go:3514 `NumRedelivered: len(o.rdc)`; 3550 non-leader reports `len(state.Redelivered)`; 3520-3524 forced to 0 when `MaxDeliver == 1`; 3715 and 3741 `delete(o.rdc, sseq)` on ack/term — entries leave the count when acked. derekcollison, https://github.com/nats-io/nats-server/discussions/5737.
- Verdict: RESOLVED — Learn is correct for current source: the field is the number of messages currently carrying a redelivery count, shrinking on ack. derekcollison's 2024 statement describes an older reporting behaviour (or the `rdc` map not being rebuilt after restart) and should not be cited as current.

### F-OPS-29: `!jetstream` server tag as a witness/meta-only node
- Type: dubious (resolved)
- Severity: low
- Claims: "The `!jetstream` server tag keeps a server in the meta group while preventing stream placement on it" (ramonberrutti, discussion 6108 [UNVERIFIED, non-maintainer])
- Verification: server/jetstream_cluster.go:693 `jsExcludePlacement = "!jetstream"`; 9479-9483 peer selection discards servers whose tags contain it ("Peer selection: discard … reason: !jetstream present").
- Verdict: RESOLVED — The tag exists and excludes the server from asset placement; the server remains a JetStream-enabled meta-group member. Claim confirmed.

### F-OPS-30: Duplicate window must be shorter than max age
- Type: dubious (resolved)
- Severity: low
- Claims: "When setting max age, the duplicate window must be set lower than the max age" (talk — Getting Started with NATS JetStream)
- Verification: server/stream.go:1798 `"duplicates window can not be larger then max age"`.
- Verdict: RESOLVED — Correct (window ≤ max age; also ≥ 100ms per 1805 and ≤ server limit per 1801).

### F-OPS-31: Sizing, throughput and timing figures with no code or maintainer backing
- Type: unverifiable
- Severity: medium
- Claims: "`always` will slow down the throughput to a few hundred msg/s" (legacy docs — Configuration); "1 core / 32 MiB handles 100,000 msg/s core NATS" (legacy docs — Installing); "A 100GB object bucket with RF=3 takes approximately 30-45 minutes to rebuild … over 10Gbps" (blog — Building Distributed State Stores); "2.1 TB / 300M messages: ~15 minutes on 2.9 to 1.1 seconds on 2.10" (talk — 2.10 Webinar); "JetStream spends roughly two file descriptors per stream" and "budget a light publisher at roughly 128 MiB" and "overprovision CPU by 20–30%" (Learn — Sizing & resources); "pending > 10,000 = falling behind; ack pending > 500 = slow/stuck; redelivery ratio > 10%" (blog — How to Build NATS Consumers); "gp2/gp3 throttle after roughly 20 minutes" (talk — NATS tools and benchmarking); "revoked user disconnected within about 10 ms globally" (talk — NATS 2.0); "full-stack observability resolves outages 18% faster" (blog — Flying Blind)
- Verification: none available — no constant, limit or maintainer statement in the verification set supports any of these numbers. (Related maintainer-backed exceptions: consumer-create ≈2K/s and raftz WAL monitoring — wallyqs, discussion 7863; "high message lag" meaning — derekcollison.)
- Verdict: REQUIRES RESOLUTION — Drop or attribute-and-hedge every figure above. The only way to settle them is a maintainer statement or a reproducible benchmark; none exists in the corpus.

### F-OPS-32: Support / downgrade policy ("current release plus one patch prior")
- Type: unverifiable
- Severity: medium
- Claims: "The support policy for the server is the current release as well as one patch version release prior (e.g. 2.8.4 → 2.8.3 downgrade supported)" (legacy docs — Upgrading a Cluster) vs "2.9.x is unsupported and hundreds of fixes behind; upgrade to 2.12.x" (ripienaar, discussion 7463) vs "the 2.10 stream storage format … 2.9.22 and later patch releases understand it; downgrading is not recommended" (talk — 2.10 Webinar) vs "on downgrade to 2.11.9+ unsupported-feature assets go offline" (blog — 2.12 release; ADR-44)
- Verification: none available in server source; no maintainer thread states a formal N-1 patch policy. ripienaar, https://github.com/nats-io/nats-server/discussions/7463 only establishes that 2.9.x is out of support.
- Verdict: REQUIRES RESOLUTION — The "one patch prior" rule has no maintainer backing and conflicts with the minor-version downgrade guidance (2.9.22+, 2.11.9+) that maintainers do give. Needs a current maintainer statement on supported downgrade targets.

### F-OPS-33: Jepsen-cited "stream unexpectedly deleted after process kills" (2.10.20–2.10.22, fixed 2.10.23)
- Type: unverifiable
- Severity: low
- Claims: "Bug in 2.10.20-2.10.22: a stream could be unexpectedly deleted after process kills; fixed in 2.10.23" (blog — Jepsen: NATS 2.12.1)
- Verification: `gh release view v2.10.23` (maintainer-authored release notes, outside the strict rule) lists "Don't delete disk state if a stream or consumer creation fails during shutdown (#6061)" and "Raft state will no longer be deleted if creating a stream/consumer failed because the server was shutting down (#6061)".
- Verdict: REQUIRES RESOLUTION — Consistent with the 2.10.23 notes but the affected-version range (from 2.10.20) is not confirmed; check PR #6061 for the regression's origin before quoting the range.

### F-OPS-34: Parallel stream recovery at startup "after 2.11.11"
- Type: unverifiable
- Severity: low
- Claims: "Versions after 2.11.11 restore streams in parallel" (wallyqs, discussion 8001)
- Verification: wallyqs, https://github.com/nats-io/nats-server/discussions/8001 ("is it a version past v2.11.11? newer versions do this in parallel"). Not traced in source.
- Verdict: RESOLVED (maintainer statement) — Cite as wallyqs; the exact introducing release was not located in source.

### F-OPS-35: Helm chart operational defaults used by Learn (LDM 30s, grace 10s, TGPS 60s, probes, threshold 90)
- Type: unverifiable (verified against chart source, outside the strict rule)
- Severity: low
- Claims: "The Helm chart defaults `lame_duck_duration` to `30s` and `terminationGracePeriodSeconds` to `60s`; startup probe `/healthz` failureThreshold 90, readiness `/healthz?js-server-only=true`, liveness `/healthz?js-enabled-only=true`; reloader retries 30 times, four seconds apart" (Learn — Rolling upgrades, Kubernetes, Config management)
- Verification: nats-io/k8s `helm/charts/nats/values.yaml` (fetched via gh): `lameDuckGracePeriod: 10s`, `lameDuckDuration: 30s` with comment "terminationGracePeriodSeconds should be at least lameDuckGracePeriod + lameDuckDuration + 20s shutdown overhead"; `terminationGracePeriodSeconds: 60`; startupProbe `/healthz` failureThreshold 90, periodSeconds 10; readiness `/healthz?js-server-only=true`; liveness `/healthz?js-enabled-only=true`; JetStream PVC `size: 10Gi`. Reloader retry count/interval not in values.yaml.
- Verdict: RESOLVED for LDM/TGPS/probes (chart source matches Learn); REQUIRES RESOLUTION for "30 retries, four seconds apart" (reloader binary defaults; check nats-io/k8s `nats-server-config-reloader` flags). Note the 30s chart default is exactly the server minimum (opts.go:1468), so any lower value fails to start.

### F-OPS-36: `max_payload` must not exceed `max_pending`
- Type: unverifiable (resolved)
- Severity: low
- Claims: "If `max_payload` exceeds `max_pending` the server refuses to start" (Learn — Sizing & resources)
- Verification: server/server.go:1163-1165 `"max_payload (%v) cannot be higher than max_pending (%v)"` in `validateOptions`.
- Verdict: RESOLVED — Correct. The Learn heuristic "keep `max_pending >= 10× peak message size`" has no code basis (falls under F-OPS-31).

### F-OPS-37: Account storage accounting for replicated streams (×replicas on un-tiered accounts)
- Type: unverifiable (resolved)
- Severity: medium
- Claims: "On an un-tiered account an R3 stream counts as `replicas × bytes` against `MaxStore`; on a tiered account the reported bytes are usable bytes" (Learn — Sizing & resources) vs "an R3 stream counts against account limits" (Learn — Deployment overview)
- Verification: server/jetstream.go:2500-2508 `accountReservation`: `if tier == _EMPTY_ && replicas > 1 { return replicas * bytes }` else `bytes`; 1858/1875 tier matching by `tierName(replicas)`.
- Verdict: RESOLVED — Exact.

### F-OPS-38: Lame duck eviction window in the legacy docs and ADR-5
- Type: wrong (precision)
- Severity: low
- Claims: "then evict clients over `lame_duck_duration` (default 2 minutes)" (legacy docs — Lame Duck Mode; ADR-5 "slowly starts evicting connected clients as per `lame_duck_duration`")
- Verification: server/server.go:4503-4505 `dur := LameDuckDuration; dur -= gp` — evictions are spread over duration minus grace period (1m50s by default), and per-client sleep is capped at 1s (4519-4523), so with few clients the drain finishes early.
- Verdict: RESOLVED — The spread window is `lame_duck_duration − lame_duck_grace_period`, capped at 1s between closes.

### F-OPS-39: Tiered/S3 storage and "virtual blocks in 2.12"
- Type: stale
- Severity: low
- Claims: "Synadia is considering virtual blocks to offload filestore blocks to S3 … timeframe 2.12 though" (derekcollison, discussion "Support S3 API") vs "Tiered storage is planned with no schedule (2023); still absent as of 2025" (thread — Is Tiered Storage currently planned?)
- Verification: no S3/virtual-block code in server/filestore.go at the current commit (no `s3` or `virtual` block references found in the greps run against filestore.go); newest tag v2.14.5.
- Verdict: RESOLVED — Not shipped through 2.14.5; the "2.12" timeframe is stale. Present as unscheduled.

## Summary

Counts by type: contradiction 13, wrong 3, stale 7, unverifiable 14, dubious 2 (39 findings).

Counts by verdict: RESOLVED 29 (three of them with a residual REQUIRES RESOLUTION part), REQUIRES RESOLUTION 10.

| ID | Finding | What would settle it |
|---|---|---|
| F-OPS-9 | Minimum CPU/RAM for JetStream servers (4c/8 GiB vs 4c/16 GB vs 2c; 32 MiB tables called wrong) | Current maintainer statement on the published floor |
| F-OPS-10 | GOMEMLIMIT percentage (90% / 80–90% / ~92% vs maintainer 75%) | Adopt 75% or get a maintainer confirmation of a higher figure |
| F-OPS-13 | Server vs CLI origin of "stream name may not be changed during restore" | Grep natscli `cli/stream_command.go` |
| F-OPS-15 | Whether retention/expiry is paused for the whole snapshot | Read `fileStore.Snapshot`/`streamSnapshot` and `stream.snapshot` |
| F-OPS-26 | Existence/timing of a "2.14-compat" release for the 2.15 upgrade path | A tagged release or maintainer statement |
| F-OPS-27 | Server-level `SERVER.REMOVE` behaviour when no replacement peer exists | Trace `requireReplicas: false` call sites in jetstream_cluster.go |
| F-OPS-31 | All sizing/throughput/timing numbers with no basis | Maintainer statement or reproducible benchmark; otherwise delete |
| F-OPS-32 | Support/downgrade policy ("current + one patch prior") | Maintainer statement on supported downgrade targets |
| F-OPS-33 | Affected-version range of the 2.10.23 stream-deletion fix | Check PR #6061 |
| F-OPS-35 | Config-reloader retry defaults (30 × 4s) | nats-io/k8s reloader flags |

Ten highest-severity RESOLVED corrections:

1. F-OPS-7 — `/healthz?js-server-only` checked meta-leader currency in 2.10.x and skips every JetStream check from 2.11.0; `js-enabled-only` never checks quorum; `js-meta-only` (2.11+) does.
2. F-OPS-4 — LDM transfers Raft leadership and shuts JetStream down before any client is evicted; eviction spreads over `duration − grace`; SIGTERM is ignored during LDM; `lame_duck_duration` need not "cover" JetStream leadership moves.
3. F-OPS-25 — `$JS.API.META.RESCUE` is unreleased (2.15-dev); on 2.12.0–2.14.5 an empty-log node cannot rescue quorum and the blog's "restore from backup" is correct for released servers.
4. F-OPS-18 — Editing stream compression does not recompress existing blocks and does not even change the running store's algorithm until the store is re-created; the 2.10 webinar claim is wrong.
5. F-OPS-19 — Since 2.9.0 the server encrypts existing plaintext blocks in place when a key is configured; "only new blocks, back up and restore to re-encrypt" is stale.
6. F-OPS-8 — CONSUMER.INFO is served by the consumer leader, not the meta leader.
7. F-OPS-27 — Stream-level peer-remove is refused (peer stays) when no replacement fits placement; it does not leave the stream a replica short.
8. F-OPS-2 / F-OPS-3 — Defaults are `write_deadline` 10s (since 2.2.0), TLS timeout 2s, auth timeout 2s or tls_timeout+1s; the legacy `/varz` sample (2s / 0.5s / 1s) is stale.
9. F-OPS-5 — A killed meta leader stalls metadata operations for 4–9s (not "instantaneous"); with LDM the leader hands off first, so "meta-leader last" is optional.
10. F-OPS-28 — `num_redelivered` is the count of messages currently carrying a redelivery count and drops on ack; the "server-lifetime counter" statement is not current.


<!-- ===== SUBJCORE ===== -->

# Review: SUBJCORE

Server source: /Users/tomaszpietrek/coding/new-nats.docs/nats-server @ 8e54a5954 (VERSION "2.15.0-dev", server/const.go:69). All file:line cites are `server/<file>` in that checkout.

### F-SUBJCORE-1: Subject token / length limits — soft guidance presented as if there were a limit
- Type: contradiction
- Severity: medium
- Claims: "no hard limit ... e.g. a maximum of 16 tokens and the subject length to less than 256 characters" (Legacy docs — Subject-Based Messaging; Learn — Subjects) vs "matcher uses a stack-allocated array sized for 32 tokens; beyond that matching spills to the heap" (Blog — How to Design NATS Subject Hierarchies) vs "guidance is 16 tokens; performance guaranteed only up to that" (Discussion — Subject token limit, MauriceVanVeen)
- Verification: No token-count or subject-length limit exists in the server. `isValidSubject` (sublist.go:1209-1246) only rejects empty tokens, whitespace (`' ', '\t', '\n', '\r', '\f'`), and a `>` that is not last. 32-token stack arrays: `tsa := [32]string{}` at sublist.go:576, 662, 1343, 1441, 1449, 1664 and accounts.go:862 (mapping match); beyond 32 tokens `append` reallocates to heap. The only hard bound is the control line: `MAX_CONTROL_LINE_SIZE = 4096` (const.go:88-90), which the whole `PUB <subj> [reply] <len>` line must fit in. MauriceVanVeen, https://github.com/nats-io/nats-server/discussions/5097: "Should indeed keep that at a reasonable value ... although it's probably not strictly enforced it would have performance impact."
- Verdict: RESOLVED — There is no hard token or length limit on subjects. 16 tokens / 256 chars is advice only. The measurable cliffs are 32 tokens (stack array spills to heap in the sublist and mapping code) and the 4096-byte default control line (subject + reply + sizes must fit; configurable via `max_control_line`).

### F-SUBJCORE-2: `max_payload` "maximum 64 MB" vs "warn above 8 MB"
- Type: contradiction
- Severity: high
- Claims: "`max_payload` default 1 MB, can be increased up to 64 MB" (Legacy docs — Publish-Subscribe/Messages; FAQ) vs "`MAX_PAYLOAD_MAX_SIZE = 8 MiB` ... server will warn ... may enforce/reject in future" (Code — server/const.go) vs "Why a 64 MB message size limit?" (Discussion 6501, neilalexander)
- Verification: Default `MAX_PAYLOAD_SIZE = 1024*1024` (const.go:92-94; applied opts.go:6123-6124). No hard cap on `max_payload` anywhere; above 8 MiB the server only logs `Warnf("Maximum payloads over %v are generally discouraged...")` (server.go:2349-2351; const.go:96-99). The only enforced relation is `max_payload <= max_pending`: server.go:1163-1165 `if int64(o.MaxPayload) > o.MaxPending { return fmt.Errorf("max_payload (%v) cannot be higher than max_pending (%v)") }`, and `MAX_PENDING_SIZE = 64*1024*1024` (const.go:101-102). neilalexander (https://github.com/nats-io/nats-server/discussions/6501): "we're working solely in memory, so there has to be a reasonable upper-bound".
- Verdict: RESOLVED — `max_payload` defaults to 1 MiB and has no fixed maximum. The "64 MB" figure is the default `max_pending` (64 MiB): `max_payload` may not exceed `max_pending`, so raising `max_pending` raises the ceiling. Above 8 MiB the server warns but accepts. Guidance (8 MB docs, 2-3 MB ripienaar) is advice, not enforcement.

### F-SUBJCORE-3: Weighted mapping under 100% — "drops the remainder" vs "remainder stays on the original subject"
- Type: contradiction
- Severity: high
- Claims: "artificial loss by mapping <100% (`foo.loss.>` at 50% drops half)" (Legacy docs — Subject Mapping and Transforms) and "a total under 100 intentionally drops the remainder to emulate data loss" (Talk — Versioning and canary deployments, RethinkConn '22) vs "Weights totaling less than 100 leave the remainder on the original subject ... To drop the leftover share rather than keep it, list the source subject itself as a destination" (Learn — Subject mapping)
- Verification: accounts.go:748-762 (`processDestinations`): "Auto add in original at weight difference if all entries weight does not total to 100. Iff the src was not already added in explicitly, meaning they want loss." — `_, haveSrc := seen[src]; if ltw != 100 && !haveSrc { ... dests = append(dests, &destination{tr, 100-ltw}) }`. Selection accounts.go:908-916: `w := uint8(fastrand.Uint32n(100)); for _, rm := range dests { if w < rm.weight { d = rm; break } }`; if no destination is picked `ndest` stays `""` and `(ndest, true)` is returned (accounts.go:918-926); client.go:4323-4329 then sets `c.pa.subject = []byte("")`, which matches no interest and `sendMsgToGateways` returns false for an empty subject (gateway.go:2542-2544) → dropped. Per-destination `Weight > 100` and per-cluster total `> 100` are rejected (accounts.go:715-721); weight 0 is accepted.
- Verdict: RESOLVED — Both docs are right for the case they describe, but the talk is wrong as a general rule. Weights summing under 100 do NOT lose messages: the server silently adds the source subject at the missing weight. Loss occurs only when the source subject is itself listed explicitly as a destination (the legacy `foo.loss.>` → `foo.loss.>` 50% example), in which case unselected messages get an empty subject and are discarded. The Learn text ("list the source subject itself as a destination to drop the leftover") is the precise statement; the "only works for a literal source" qualifier is not in the code (the auto-add path handles wildcard sources via `transformTokenize`, and the explicit-source path keys on `seen[src]` string equality, so a wildcard source listed verbatim also suppresses the auto-add).

### F-SUBJCORE-4: Queue-group distribution — "random per message on one server", "same chance in a cluster", "local first", "lowest RTT"
- Type: contradiction
- Severity: high
- Claims: "In a cluster setup, every member has the same chance of receiving a particular message" (Legacy docs — Receiving) vs "the leaf will route that request to a local member if any exist, and only go upstream if none" (Blog — Bridging the Edge) vs "a server will always try to serve local queue subscribers first and only failover ... pick the cluster with the lowest RTT" (Legacy docs — Super-cluster with Gateways) vs "On a single server, member selection is uniform-random per message, not round-robin" (Learn — Queue groups) vs "the server delivers each request to whichever queue-group member is ready" (Learn — Services Scaling)
- Verification: Sublist merges queue subs by queue name and shadows each remote (route) qsub `qw` times, i.e. once per member behind that route: sublist.go:729-750 (`if isRemoteQSub(sub) { ns := atomic.LoadInt32(&sub.qw); for n := 0; n < int(ns); n++ { results.qsubs[i] = append(...) } }`). Selection starts at a random index `sindex = int(fastrand.Uint32() % uint32(lqs))` (client.go:5507-5510) and walks forward until `deliverMsg` succeeds (client.go:5514-5525, 5626-5650), so a closed/denied member is skipped. Preferences: (a) message arriving FROM a route: only local subs are candidates, route/leaf kept as fallback `rsub` (client.go:5473-5501, comment "If we just came from a route we want to prefer local subs"); (b) message from a CLIENT or LEAF: a LEAF destination is only remembered as fallback, a routed qsub is picked when reached (client.go:5527-5568); (c) gateways: queue names delivered locally are passed so remote clusters skip them, and outbound gateways are iterated in RTT order (`gw.outo`, gateway.go:140, sorted at 1763-1766 `cmp.Compare(i.getRTTValue(), j.getRTTValue())`; iteration 2553-2555; first gateway with interest for a not-yet-served queue wins, 2611-2647).
- Verdict: RESOLVED — Within one cluster, for a message published by a client, every member across all servers has an equal chance (remote servers are weighted by member count), so the legacy "same chance" statement holds; "local first" applies only to messages that arrived over a route (to avoid re-forwarding), to leaf-node members (fallback only), and across gateways (local cluster first, then the lowest-RTT gateway with interest). On a single server it is a uniform random pick with a forward walk past members that cannot accept, so "random" and "whichever member is ready" describe the same code. Never round-robin.

### F-SUBJCORE-5: Queue group identity — "queue name plus subject" and "same group name across different subjects does not share load"
- Type: wrong
- Severity: medium
- Claims: "Group membership is evaluated after subject matching; the same group name across different subjects does not share load" (Learn — Queue groups) and "A queue group is identified by queue name plus subject" (Talk — EP04 Service Mesh Pattern) vs "A queue group on a wildcard load-balances across everything the wildcard matches" (Learn — Queue groups)
- Verification: sublist.go:719-737 `addNodeToResults` and `findQSlot` (sublist.go:754-763): for every trie node that matches the published subject, queue subs are merged into one result slot keyed only by queue name (`bytes.Equal(queue, qr[0].queue)`). A member subscribed on `orders.*` with queue `w` and a member on `orders.created` with queue `w` land in the same slot for a message on `orders.created`, and exactly one of them receives it (client.go:5514-5525).
- Verdict: RESOLVED — A queue group is identified by name alone. Members whose (possibly different) subscription subjects both match a given message share that message; only one of them gets it. The Learn sentence is true only for subjects that do not both match, and the "name plus subject" framing is wrong.

### F-SUBJCORE-6: Slow-consumer and payload limits on routes/leaf/gateway vs clients
- Type: contradiction
- Severity: medium
- Claims: "Route/gateway slow consumers are time-based only ... not size-based like clients" and "System-originated (routed) messages are not bound by the receiving server's max_payload" (Discussion 4314 — derekcollison) and "`max_pending` applies only to clients; `write_deadline` to all" (wallyqs, same thread) vs "Slow consumers are cut off" generically (Legacy docs — Slow Consumers)
- Verification: Size-based check is client-only: client.go:2597 `if c.kind == CLIENT && c.out.pb > c.out.mp {` → "Slow Consumer Detected: MaxPending of %d Exceeded" (client.go:2610). `c.out.mp = opts.MaxPending` (client.go:753). Routes are created with `mpay: -1` (route.go:1939), i.e. no payload check on routed messages. Leaf nodes are NOT exempt: created with `mpay: maxPay` (leafnode.go:1268) and checked at leafnode.go:3202-3204 and 3276-3278 (`c.maxPayloadViolation`). wallyqs, https://github.com/nats-io/nats-server/discussions/4314: "`max_pending` only applies to client connections, `max_control_line` also applies to all types of connections."
- Verdict: RESOLVED — Clients are disconnected either by exceeding `max_pending` (64 MiB default) or the 10 s `write_deadline` (const.go:132); routes, gateways and leaf nodes only by `write_deadline`. `max_payload` is not enforced on route connections but IS enforced on leaf-node connections (derekcollison's "system-originated" statement is exact for routes only).

### F-SUBJCORE-7: No-responders is "fast and certain"
- Type: unverifiable
- Severity: medium
- Claims: "the no-responders signal is the most useful failure NATS gives you, because it's fast and certain" (Learn — Request-Reply Resilience) and "the server knows no subscription is listening and sends an immediate 503" (Learn — Request-reply) vs "requires header-capable server and client" (Legacy docs — Request-Reply)
- Verification: 503 is sent only if nothing was delivered: client.go:4503-4514 `if !didDeliver && len(c.pa.reply) > 0 { ... if c.opts.NoResponders { ... "HMSG %s %s %d %d\r\nNATS/1.0 503\r\nNats-Subject: %s\r\n\r\n\r\n" } }`. Requires CONNECT `no_responders:true` and headers (client.go:2459-2464 rejects `no_responders` without `headers`). In a super-cluster `didDeliver = c.sendMsgToGateways(...) || didDeliver` (client.go:4498), and `gatewayInterest` ASSUMES interest for an account not yet in the outbound map unless interest-only mode is on (gateway.go:2164-2175 `psi := !accountInMap && !c.gw.interestOnlyMode`), so `didDeliver` is true and no 503 is produced until the remote cluster has reported no interest. Leaf-node inbound messages never produce a 503 (leafnode.go:3289-3345 has no no-responders path; only the origin server can answer).
- Verdict: RESOLVED — Correct for a single cluster: the 503 is immediate and carries a `Nats-Subject` header. "Certain" is overstated for super-clusters in optimistic gateway mode: the first request(s) to a subject with no interest anywhere time out instead of getting 503, because the server optimistically forwards to gateways until they report no interest. Version boundary for the gateway behaviour not checked here.

### F-SUBJCORE-8: Publishing to a subject containing `*` or `>`
- Type: contradiction
- Severity: medium
- Claims: "programmatically generated illegal subjects (e.g. containing wildcards) may be ignored. Enable `pedantic` mode in the client to verify" (Legacy docs — Subject-Based Messaging) and "You cannot publish a message using a wildcard subject" (Legacy docs — walkthroughs) vs "Publishing 'to a wildcard' produces no error: the `*` is taken as a literal character and the message lands on the literal subject `orders.*.created`, reaching wildcard subscribers but not exact-subject subscribers" (Learn — Subjects & wildcards)
- Verification: Wildcards on publish are rejected only in pedantic mode: client.go:2928-2929 and 2981-2982 `if c.opts.Pedantic && !IsValidLiteralSubject(bytesToString(c.pa.subject)) { c.sendErr("Invalid Publish Subject") }`. Outside pedantic mode no wildcard check runs on the publish path (`processInboundClientMsg`, client.go:4339-4516, checks only `$GNR.`, permissions, `$NRG.`, reserved replies), and the subject is matched literally through `acc.sl.Match` (client.go:4449). `IsValidPublishSubject` (sublist.go:1200-1202) exists but is not used on that path.
- Verdict: RESOLVED — The server does not reject or drop a publish whose subject contains `*` or `>` unless the client connected with `pedantic:true` (then `-ERR 'Invalid Publish Subject'`). Otherwise the message is routed with the wildcard character treated as a literal token, as the Learn page says. "Cannot publish" is a client-side rule, not a server rule.

### F-SUBJCORE-9: Subject character set — "any UTF-8" vs "ASCII 33-126 only"
- Type: contradiction
- Severity: low
- Claims: "Subjects are case-sensitive and can contain any UTF-8 characters except whitespace, tabs, and line breaks" (Learn — Subjects) and "Allowed: any Unicode except null, space, `.`, `*`, `>`" (Legacy docs — Subject-Based Messaging) vs "term = (printable ascii 33-126 except dot, asterisk or gt)+ ... No guarantees of non-ASCII support" (ADR-6)
- Verification: `isValidSubject` (sublist.go:1209-1246) rejects empty tokens, tokens containing `\t \n \f \r` or space, and a `>` not in last position; with `checkRunes` it also rejects NUL bytes and invalid UTF-8 (`utf8.RuneError`). Nothing rejects non-ASCII printable characters or characters below 33 other than the whitespace set.
- Verdict: RESOLVED — The server accepts any valid UTF-8 without NUL or whitespace. ADR-6's ASCII rule is an interoperability recommendation for clients, not a server constraint. Both statements can stand if the ADR is presented as guidance.

### F-SUBJCORE-10: Subscribe deny is silent under a wildcard subscription; deny beats allow; denied publish yields a timeout not a 503
- Type: unverifiable
- Severity: medium
- Claims: "a wildcard subscription overlapping the deny is accepted and the server filters denied subjects out at delivery time with no error, no gap marker, and no server-log line" (Learn — Authorization); "deny beats allow" (Learn — Authorization pitfall); "A denied request looks silent: the publish is denied, no responder sees it, and the requester just times out" (Learn — Authorization)
- Verification: Deny overrides allow: client.go:3376-3384 (`if allowed && c.perms.sub.deny != nil { r := c.perms.sub.deny.Match(subject); allowed = len(r.psubs) == 0 ... }`). Wildcard/queue subs colliding with a deny entry install a delivery-time filter instead of being rejected: client.go:3394-3420 (`loadMsgDenyFilterIfNeeded` ... `SubjectsCollide`). At delivery client.go:3772-3776 drops the message with only a message-trace egress event (`mt.addEgressEvent(client, sub, errMsgTraceSubDeny)`), no `-ERR`, no log. Denied publish: client.go:4361-4366 returns before the no-responders block at 4503-4514; the server sends `-ERR 'Permissions Violation for Publish to ...'` and logs `Publish Violation` (client.go:5780-5786).
- Verdict: RESOLVED — All three Learn statements match the code. One refinement: a denied publish is not entirely silent — the server sends an async `-ERR` to the publisher and logs an error; only the request call itself sees a timeout.

### F-SUBJCORE-11: Mapping function names, `$n` legacy form, `random`, and undocumented `left`/`right`
- Type: stale
- Severity: low
- Claims: "Names valid in CamelCase or lowercase" (ADR-30); "`$1`/`$2` syntax is deprecated" and function list incl. `random(n)` (Legacy docs — Subject Mapping and Transforms); function list without `random` (ADR-30; Blog — NATS Server 2.9 Release)
- Verification: subject_transform.go:30-39 regexes: `[pP]artition`, `[wW]ildcard`, `[sS]plit[fF]rom[lL]eft`, `[sS]plit[fF]rom[rR]ight`, `[sS]lice[fF]rom[lL]eft`, `[sS]lice[fF]rom[rR]ight`, `[sS]plit`, `[lL]eft`, `[rR]ight`, `[rR]andom`. `$n` still parsed: subject_transform.go:240-248 ("old $1, $2, etc... mapping format still supported to maintain backwards compatibility"). `random` produces `rand.Int31() % ceiling` (subject_transform.go:460-467).
- Verdict: RESOLVED — Each word's first letter is case-insensitive (so `partition`, `Partition`, `splitFromLeft`, `SplitFromLeft` all parse); `$n` is deprecated but still supported; `random(n)` exists; `left(n)`/`right(n)` also exist in the server and appear in none of the sources.

### F-SUBJCORE-12: `partition()` semantics — whole-subject form, hash, composite keys, cross-account restriction
- Type: unverifiable
- Severity: medium
- Claims: "`partition(n)` alone hashes the full subject" (Legacy docs — Subject Mapping and Transforms); "FNV-1a 32-bit hash modulo the partition count" and "`{{partition(...)}}` cannot cross accounts; only `{{wildcard(x)}}` is allowed in inter-account import transforms" (Blog — Partitioned Consumer Groups); "if a `>` wildcard is needed, at least one `*` token is required for partitioning" (NATS by Example — Subject-Mapped Partitions); "in imports the ONLY allowed mapping function is `{{Wildcard(x)}}` ... destinations MUST use ALL wildcard tokens" (ADR-30)
- Verification: Hash: subject_transform.go:469-480 `h := fnv.New32a(); h.Write(key); h.Sum32() % uint32(numBuckets)`. Whole-subject form: subject_transform.go:497-508 `if len(tr.dtokmftokindexesargs[i]) > 0 { ... tokens[sourceToken] ... } else { keyForHashing = append(keyForHashing, strings.Join(tokens, ".")...) }` — comment "When using the shorthand partition(n)"; and a source with no wildcards may still use `Partition`/`Random` (subject_transform.go:168-187). Composite keys concatenate the named tokens with no separator (line 501-503). Imports use strict mode: accounts.go:2101 and 2686 call `NewSubjectTransformStrict`; strict rejects any function other than `Wildcard` (subject_transform.go:125-128, `ErrMappingDestinationNotSupportedForImport`) and requires all `*` tokens be used (158-161, `ErrMappingDestinationNotUsingAllWildcards`).
- Verdict: RESOLVED — `partition(n)` with no token list hashes the whole subject (dot-joined), so a `*` token is not strictly required even with `>`; `partition(n, a, b)` hashes the concatenation of the named tokens (no separator, so `("ab","c")` and `("a","bc")` collide). FNV-1a/32 is correct. Partition (and every function except `wildcard`) is refused in account import/export transforms, and only there must all `*` tokens be used.

### F-SUBJCORE-13: Full wildcard `>` in mapping destinations — "must appear exactly once" vs "may drop wildcard tokens since 2.10"
- Type: contradiction
- Severity: low
- Claims: "A full wildcard `>` may be used once in source and must appear exactly once in destination" (Legacy docs — Subject Mapping and Transforms) vs "from 2.10 all other uses may drop wildcard tokens" (ADR-30)
- Verification: subject_transform.go:95-100: `if !sv || !dv || dnpwcs > 0 || hasFwc != dHasFwc { return nil, ErrBadSubject }` — destination may not contain `*`, and source and destination must agree on the presence of `>`. Only `*` tokens may be omitted in non-strict mode (no count check outside `if strict && nphs < npwcs`, line 158).
- Verdict: RESOLVED — Both are right about different tokens: `>` must be present in both source and destination (or neither); `*` tokens may be dropped except in import/export mappings.

### F-SUBJCORE-14: Where account mappings are applied and which rule wins
- Type: unverifiable
- Severity: low
- Claims: "Transforms are not applied recursively in the same scope ... only the first matching rule applies" (Legacy docs — Subject Mapping and Transforms); hub maps `orders.*` arriving from a leaf (same page); "as of 2.10 mappings can be `cluster`-scoped and take precedence" (ADR-30); "Mapping is always scoped to an account" (Learn — Subject mapping)
- Verification: Mapping runs once, on the inbound parse of CLIENT and LEAF connections only: parser.go:518-520 `if (c.kind == CLIENT || c.kind == LEAF) && c.in.flags.isSet(hasMappings) { changed := c.selectMappedSubject() ... }`; not on ROUTER/GATEWAY inbound, so a message is mapped at most once per server hop chain. Rule selection walks `a.mappings` in insertion order and takes the first literal or subset match (accounts.go:866-885). Cluster scoping: destinations with a `cluster` go to `m.cdests[cluster]`, selection uses `a.srv.cachedClusterName()` and falls back to the unscoped list (accounts.go:727-737, 895-903). Mappings are a per-`Account` field (accounts.go:698, `a.mappings`).
- Verdict: RESOLVED — Confirmed: first matching rule in config order, applied once at ingress for client and leaf traffic (which is why a hub can re-map traffic arriving from a leaf), cluster-scoped destinations win with fallback to unscoped, always per account. "As of 2.10" for cluster scoping not checkable from this checkout.

### F-SUBJCORE-15: Reserved prefixes — `$OBJ.` vs `$O.`, `_SYS`, and what the server actually enforces
- Type: wrong
- Severity: medium
- Claims: "Reserved prefixes: `$SYS.`, `$JS.`, `$JSC.`, `$KV.`, `$OBJ.`, `$NRG.`, `_INBOX.`" (Blog — How to Design NATS Subject Hierarchies) vs "`$O.<bucket>.C.` / `$O.<bucket>.M.`" (ADR-20; Learn — Object Store Under the hood) vs "subjects starting with `_SYS` are reserved and publishes there are rejected" (Talk — Zen of High Performance Messaging, 2017) vs "`$SRV` is a reserved subject prefix; do not publish to it" (Learn — Discovery)
- Verification: Server-enforced publish rejections for ordinary clients: `$GNR.` (client.go:4345-4348, gateway reply prefix), `$NRG.` outside the system account (client.go:4334, 4369-4373), reserved reply prefixes `_R_.`/`$JS.ACK`/`$GNR.` as reply-to (client.go:4376-4379, 4295-4306; `replyPrefix = "_R_."` accounts.go:2363), and `$SYS.REQ.USER.AUTH` on the auth-callout account (auth.go:761 `mergeDenyPermissions(pub, []string{AuthCalloutSubject})`; auth_callout.go:30). `$JSC.` is used for JetStream cluster traffic (jetstream_cluster.go:12982-13020). No `$SYS.>` publish deny exists for user accounts; `$SYS.REQ.USER.INFO` (events.go:76) is a user-callable subject. No `$OBJ`, `$O.`, or `$SRV` string appears anywhere in server source (object store and service discovery are client-side).
- Verdict: RESOLVED for the server-side facts: the blog's `$OBJ.` is wrong (ADR-20 and every client use `$O.`; the server itself has no object-store subjects); the 2017 talk's `_SYS` is wrong (`$SYS`) and its "publishes rejected" is wrong today — only `$GNR.`, `$NRG.` (non-system accounts) and `$SYS.REQ.USER.AUTH` (callout account) are rejected by the server; everything else under `$` is convention. `$SRV` reservation is a client-framework convention, not enforced by the server.

### F-SUBJCORE-16: `>` placement and "Invalid Subject" on subscribe
- Type: unverifiable
- Severity: low
- Claims: "`orders.>.created` is invalid and the server rejects it with an Invalid Subject error" (Learn — Subjects & wildcards); "`>` is only valid as the last token" (ADR-6)
- Verification: sublist.go:378-384 `Insert`: `if lt == 0 || sfwc { return ErrInvalidSubject }` where `sfwc` is set once a `>` token is seen; client.go:3121-3123 `if err != nil { c.sendErr("Invalid Subject"); return nil, ErrMalformedSubject }`.
- Verdict: RESOLVED — confirmed; the wire error text is exactly `-ERR 'Invalid Subject'`.

### F-SUBJCORE-17: "Responders form dynamic queue groups automatically"
- Type: wrong
- Severity: medium
- Claims: "Responders form dynamic queue groups automatically; no manual membership management" (Legacy docs — Request-Reply) vs "A queue group is a set of subscribers on the same subject sharing a name ... the application picks the name" (Learn — Queue groups) and "The queue name is application-defined, not server-configured" (Legacy docs — Queue Groups)
- Verification: A queue subscription exists only when the SUB carries a queue name: client.go:3043-3045 `processSubEx(subject, queue, bsid ...)` builds `&subscription{... queue: queue ...}`; plain subscriptions (`queue == nil`) go to `psubs` and every one of them receives every message (sublist.go:720-726; client.go:5320-5420 normal delivery loop). Nothing in the request path creates a queue group.
- Verdict: RESOLVED — Wrong as stated. Responders only share load if each of them subscribes with the same queue name; a request sent to plain subscribers is delivered to all of them (scatter-gather). "Dynamic" is true only in the sense that membership needs no server config.

### F-SUBJCORE-18: Consumer/stream filter and overlap rules, republish cycle code
- Type: unverifiable
- Severity: low
- Claims: "FilterSubject or FilterSubjects ... cannot be combined" (Legacy docs — Consumers); "if one filter subject covers another ... create fails with `consumer subject filters cannot overlap`; partial overlap where neither covers the other is accepted" (Learn — Filtering); "error 10065 subjects overlap with an existing stream" (Learn — Your first stream); "A republish destination that overlaps the stream's own subjects is rejected as a cycle (error 10052)" (Learn — Subject mapping and transforms); "Combining `filter_subject` and `subject_transforms` on one source or mirror entry is rejected" (Learn — Mirrors and sources)
- Verification: consumer.go:864 `NewJSConsumerDuplicateFilterSubjectsError()` (10136, "consumer cannot have both FilterSubject and FilterSubjects specified", jetstream_errors_generated.go:732). Overlap: consumer.go:876-888 `if inner != outer && subjectIsSubsetMatch(subject, ssubject) { return NewJSConsumerOverlappingSubjectFiltersError() }` — a subset test, so `orders.*.new` with `orders.eu.*` passes. Stream overlap: errors.json:53-56 (10065) raised at stream.go:906, 2522. Republish cycle: stream.go:2280 `NewJSStreamInvalidConfigError(fmt.Errorf("stream configuration for republish destination forms a cycle"))` — 10052 is the generic `JSStreamInvalidConfigF` (errors.json:723-727). Mirror/source: stream.go:1945-1946 (10150), 2032-2033 (10144).
- Verdict: RESOLVED — All confirmed. Note 10052 is a generic "invalid config" code whose text varies; the cycle message is "stream configuration for republish destination forms a cycle".

### F-SUBJCORE-19: MQTT topic → subject rules, refused characters, `#` double subscription, permission failure teardown
- Type: unverifiable
- Severity: low
- Claims: conversion table incl. `.` → `//` "added in 2.10; rejected before" (Legacy docs — MQTT; Learn — Topics and subjects); refused characters "space, tab, newline, carriage return, form feed, and DEL" (Learn); "`#` ... creates two NATS subscriptions" and "counts twice against `max_ack_pending`" (Learn); "Granting only `sensors.>` for a `#` subscription: the server returns `0x80` in the SUBACK and tears down the `sensors.>` subscription" (Learn); "publishing to a topic containing `+` or `#` is rejected" (Learn)
- Verification: mqtt.go:5877-5945 `mqttToNATSSubjectConversion`: leading `/` → `/.`, trailing or doubled `/` → `./`, `.` → `//`, whitespace set `' ', '\t', '\n', '\r', '\f'` and `0x7f` (DEL) return `errMQTTUnsupportedCharacters`; wildcards with `wcOk=false` (publish) return "wildcards not allowed in publish's topic". Level-up sub: mqtt.go:2605-2615 (`fwc` helper strips `.>` and uses sid suffix `" fwc"`, const line 107) and 2721-2755 create a second `processSub` + second `processJSConsumer` (each JS consumer carries its own `MaxAckPending`, mqtt.go:5500-5539); any failure on the second sub sets `f.qos = mqttSubAckFailure` (0x80, mqtt.go:81) and calls `cleanupFailedSub` on the first sub too (2739-2742).
- Verdict: RESOLVED — All conversion, character, `#`, and teardown claims match the code. The "2.10" boundary for `.` → `//` is not checkable from this checkout (REQUIRES RESOLUTION on the version only: compare `mqtt.go` at v2.9.x).

### F-SUBJCORE-20: `_INBOX.*` "sees every request" (2017 talk)
- Type: stale
- Severity: low
- Claims: "The `_INBOX.*` wildcard subscription sees every request in a server" (Talk — Zen of High Performance Messaging, 2017) vs "Replies ... all share the same subject pattern `_INBOX.>`" (NATS by Example — Private Inbox) and "Newer libraries use one wildcard inbox subscription with unique child subjects per request" (Legacy docs — Sending)
- Verification: none available in server source (inbox generation is client-side). The dump's own later sources describe a two-level inbox (`_INBOX.<prefix>.<suffix>`), which `_INBOX.*` cannot match.
- Verdict: REQUIRES RESOLUTION — Almost certainly stale (a `*` matches only one token; modern clients emit at least two tokens after `_INBOX`). Settle by citing the inbox format in nats.go `newInbox`/`NewRespInbox` or an ADR on inboxes; use `_INBOX.>` in any rewrite.

### F-SUBJCORE-21: Subscription memory sizing ("more than 1 GB per million subscriptions")
- Type: unverifiable
- Severity: low
- Claims: "when increasing your subscribed subject count to more than one million you will need more than 1GB of server memory and it will grow linearly" (Legacy docs — Subject-Based Messaging) vs "overheads are very small unless you have many 100s of k of subscriptions" (Discussion — Hot scaling core NATS, ripienaar)
- Verification: none available — no maintainer figure and no derivable constant in source (per-sub cost depends on `subscription` struct, sublist node fan-out, and route shadow subs).
- Verdict: REQUIRES RESOLUTION — Present as a rough order of magnitude only, or drop. A measurement (`nats-server` RSS with 1M subs via `nats bench --subs`) or a maintainer statement would settle it.

### F-SUBJCORE-22: Whitespace in a subject "silently misroutes"
- Type: unverifiable
- Severity: low
- Claims: "a client that skips the check (nats.py's `publish`) writes the space into the PUB line and the server silently misroutes" (Learn — Subjects & wildcards)
- Verification: Server side, a subject with a space cannot exist after parsing (sublist.go:1209-1246 rejects it on SUB), and `PUB a b 3` parses as subject `a`, reply `b`. Parser argument splitting in parser.go was not read line-by-line for this review.
- Verdict: REQUIRES RESOLUTION — Plausible (the extra token becomes the reply-to or triggers a parse error depending on arity), but "silently misroutes" needs one concrete trace: send `PUB orders created 0\r\n\r\n` over telnet and record whether the server treats `created` as reply-to or returns `-ERR`.

### F-SUBJCORE-23: `$SRV`, `NATS-RPLY-22`, `"q"` default queue, service framework behaviours
- Type: unverifiable
- Severity: low
- Claims: "The CLI's `nats reply` joins the default queue group `NATS-RPLY-22`" (Learn — Request-reply); "An endpoint joins the default queue group `\"q\"` automatically" and all Services Framework statements (Learn — Services); "`$SRV` reserved" (Learn — Discovery)
- Verification: none available under the confidence rule — these are natscli / client-framework behaviours; the server contains no `$SRV`, `NATS-RPLY-22`, or services code (grep of server source returns nothing).
- Verdict: REQUIRES RESOLUTION — Out of scope for server verification; the CLNT reviewer should confirm against natscli `cli/reply_command.go` and ADR-32 / nats.go `micro`.

### F-SUBJCORE-24: Sublist cache/plist constants and const.go line numbers cited in the dump
- Type: unverifiable
- Severity: low
- Claims: "`slCacheMax = 1024`, `slCacheSweep = 256`, `plistMin = 256` (server/sublist.go:48-56)" and const.go cites (Code — Hot reload restrictions; Core protocol defaults)
- Verification: sublist.go:51 `slCacheMax = 1024`, :53 `slCacheSweep = 256`, :55 `plistMin = 256` (plist created when `len(n.psubs) > plistMin`, sublist.go:424). const.go: VERSION :69, PROTO :75, MAX_CONTROL_LINE_SIZE :90, MAX_PAYLOAD_SIZE :94, MAX_PAYLOAD_MAX_SIZE :99, MAX_PENDING_SIZE :102, DEFAULT_PING_INTERVAL :120, DEFAULT_PING_MAX_OUT :123, DEFAULT_FLUSH_DEADLINE :132.
- Verdict: RESOLVED — All values and lines confirmed at commit 8e54a5954 (plist threshold is strictly greater than 256, not "256+").

## Summary

Counts by type: contradiction 8 (F1, F2, F3, F4, F6, F8, F9, F13), wrong 3 (F5, F15, F17), stale 2 (F11, F20), unverifiable 11 (F7, F10, F12, F14, F16, F18, F19, F21, F22, F23, F24), dubious 0. Total findings: 24.

Counts by verdict: RESOLVED 20 (F1–F19, F24); REQUIRES RESOLUTION 4 (F20, F21, F22, F23), plus one version-only sub-item inside F19 (`.`→`//` "added in 2.10").

| Finding | Severity | What would settle it |
|---|---|---|
| F-SUBJCORE-20 `_INBOX.*` sees every request | low | Cite inbox format in nats.go (`newInbox`) or the inbox ADR; rewrite to `_INBOX.>` |
| F-SUBJCORE-21 1 GB per 1M subscriptions | low | Measure server RSS at 1M subs, or a maintainer statement |
| F-SUBJCORE-22 whitespace "silently misroutes" | low | One raw-protocol trace of `PUB a b 0` showing reply-to capture vs `-ERR` |
| F-SUBJCORE-23 CLI / services-framework claims (`NATS-RPLY-22`, `"q"`, `$SRV`) | low | natscli `reply_command.go`, ADR-32, nats.go `micro` — hand to CLNT reviewer |
| F-SUBJCORE-19 (version only) `.`→`//` "added in 2.10" | low | Diff `mqtt.go` conversion at v2.9.x vs v2.10.0 |

Ten highest-severity RESOLVED corrections:
1. F2 — `max_payload` has no hard 64 MB cap; the ceiling is `max_pending` (default 64 MiB), and >8 MiB only warns.
2. F3 — Weights summing under 100 do not drop messages; the server auto-adds the source at the missing weight. Loss happens only when the source is listed explicitly as a destination.
3. F4 — Queue selection is uniform random per member across a whole cluster for client-published messages; "local first" applies only to route-inbound messages, leaf members, and across gateways (lowest-RTT gateway).
4. F5 — A queue group is identified by name alone; members on a wildcard and on a literal subject with the same queue name share messages that match both.
5. F17 — Responders do not "form queue groups automatically"; without an explicit queue name every responder gets every request.
6. F15 — The server rejects publishes only to `$GNR.`, `$NRG.` (non-system accounts) and `$SYS.REQ.USER.AUTH` (callout account); `$OBJ.` should be `$O.`; `_SYS` should be `$SYS` and is not rejected.
7. F6 — Size-based slow-consumer cutoff applies to clients only; routes/gateways/leafs are time-based; `max_payload` is skipped on routes but enforced on leaf connections.
8. F7 — No-responders is immediate only within a cluster; in optimistic gateway mode the first requests to an interest-less subject time out instead.
9. F8 — Publishing with `*`/`>` is rejected only for `pedantic` clients; otherwise the token is routed literally.
10. F1 — No hard token/length limit on subjects; the real cliffs are 32 tokens (heap spill) and the 4096-byte control line.


<!-- ===== MIGMYTH ===== -->

# Review: MIGMYTH

Scope: MIG (comparisons/migration), MYTH (corrections), and PATTERN/ANTI/USECASE claims with no topic tag.
Code baseline: nats-server 8e54a5954 (`VERSION = "2.15.0-dev"`, server/const.go:69); nats.go 2e0e3d9 (2026-09-07).
Rule applied: RESOLVED only on server/client source (file:line) or an explicit maintainer statement with URL. Docs, blogs, talks by non-maintainers never resolve anything.

### F-MIGMYTH-1: KV as a cache — maintainers disagree in the same thread
- Type: maintainers-disagree
- Severity: high
- Claims: "I don't really think a cache is what our KV is going to be the best at" (GitHub discussion — Can I use JetStream KV as cache? #1507, ripienaar) vs "I disagree with R.I., no reason it can not be very fast IMO ... We can be on par with Redis when there is a real network" (same thread, derekcollison, marked [ANSWER]) vs "Replace Redis with NATS: ... Microsecond Key-Value" (Blog — Synadia) vs "Redis is going to win out on the latency side especially for a small number of writers" (Talk — JetStream KV: A fascinating alternative to Redis)
- Verification: https://github.com/nats-io/nats.go/discussions/1507 — ripienaar 2023-12-25: "I don't really think a cache is what our KV is going to be the best at, it's not really been a goal ... but it shouldn't be bad"; derekcollison 2023-12-25: "We can be on par with Redis when there is a real network ... I disagree with R.I., no reason it can not be very fast IMO. Should make sure direct get acces is on"; jnmoyne 2023-12-27 (maintainer, measured): loopback KV get 41.7 µs vs Redis 18 µs, "over a fast LAN ... the 20 or so micro-seconds of difference ... becomes relatively insignificant"; jnmoyne 2025-09: "NATS is basically just as fast as Redis (as long as the get operation hits the block file cache ... or you use memory storage)". Direct-get follower participation gated on being current: server/jetstream_cluster.go:4108-4128.
- Verdict: REQUIRES RESOLUTION — by definition. Both positions are on record. A Misconceptions page can safely state only the measured facts (same order of magnitude as Redis over a real network; memory storage + direct get required; no Redis data types; working set must fit cache/memory). Settle wording with the maintainers before claiming "replaces Redis as a cache".

### F-MIGMYTH-2: Core publish into a stream subject — "not the intent" vs "seamless"
- Type: contradiction
- Severity: medium
- Claims: "Core publish to a stream subject is stored, but that's not really the intent ... a convenience ... to help ease the migration" (Legacy docs — Developing with JetStream) vs "you can just seamlessly switch to those subjects being captured by JetStream and the app doesn't even need to know" (Talk — EP01S3 Going back to basics with core NATS) vs "Using NATS core publish instead of js publish ... improved the performance drastically" (GitHub #6274, user)
- Verification: server/stream.go:7091-7100 stores the message and only answers when a reply is present (`canRespond`), so a core publish is stored with no PubAck. Maintainer statements: derekcollison 2025-05-22, https://github.com/nats-io/nats-server/discussions/6490 — the "sending faster than the system can process" warning "can happen if you use a core publish into a stream or if you use async Jetstream publishes with many publishers"; Jarema 2024-09-26, https://github.com/nats-io/nats-server/discussions/5932 — problems arise "when you publish to a stream without any backpressure control (by not handling max acks in flight or publishing to Stream using Core NATS publish, instead of JetStream publish)".
- Verdict: RESOLVED — Core publishes into a stream's subjects are captured exactly like JetStream publishes, but the publisher gets no PubAck, no duplicate/expected-header response, and no backpressure; the server can be driven into overload. State it as "works, unacknowledged, use for migration or best-effort feeds", not as "not intended".

### F-MIGMYTH-3: Kafka analogy stated three different ways by maintainers
- Type: contradiction
- Severity: medium
- Claims: "A partition in Kafka is equivalent to a stream in NATS" (GitHub #6315, derekcollison) and "a single *partition* is comparable to NATS stream since it is the unit of total ordering and replication" (GitHub #3772, bruth) vs "a 'consumer' in JetStream is like a 'partition' in Kafka and a 'subscriber' in JetStream is like a 'consumer' in Kafka" (GitHub issue #2043, jnmoyne) vs "Kafka's concept of consumer groups is what in JetStream we call just consumers" (Talk — NATS & Kafka Compared Part 1, jnmoyne)
- Verification: https://github.com/nats-io/nats-server/discussions/6315 (derekcollison); https://github.com/nats-io/nats-server/discussions/3772 (bruth); https://github.com/nats-io/nats-server/issues/2043 (jnmoyne, 2021 context: worker-slot analogy); https://www.youtube.com/watch?v=C4BnJ5QLeTY (jnmoyne, maintainer, spoken). Stream is the unit of ordering and replication: server/jetstream_cluster.go:9323 (`selectPeerGroup` places a stream's replica set); consumers keep their own ack state and Raft group with replicas forced to match the stream only for interest/WQ retention: server/consumer.go:730-737.
- Verdict: RESOLVED — Use two sentences: a NATS stream corresponds to a Kafka partition (unit of total order and replication), not a topic; a JetStream consumer corresponds to a Kafka consumer group (server-side position tracking), and the clients bound to it correspond to Kafka consumers. Do not repeat the #2043 "consumer ≈ partition" form.

### F-MIGMYTH-4: Retention definitions reversed in a popular talk
- Type: wrong
- Severity: medium
- Claims: "the work queue policy will discard the message after all of the consumers have acknowledged it whereas the interest policy will actually throw away any messages that no consumers are interested in" (Talk — Move over Kafka! Let's try NATS JetStream, Jeremy Saenz 2022, https://www.youtube.com/watch?v=EJJ2SG-cKyM) vs "Interest retention ... the message is not removed until all consumers consume the message (ack or term)" (Blog — NATS Weekly #13)
- Verification: server/stream.go:6992-7015 — interest retention skips storage when `numConsumers == 0` or no consumer filter matches (`SkipMsgNoInterest`); server/stream.go:8714 — interest streams compact to the minimum consumer ack floor; server/consumer.go:1140-1150 and 1098-1104 — workqueue forces explicit ack, deliver-all, and unique (non-overlapping) filters per consumer; errors server/jetstream_errors_generated.go:308-317.
- Verdict: RESOLVED — Interest: a message is kept until every consumer whose filter matches it has acked it; with no matching consumer it is never stored. WorkQueue: each subject is owned by at most one consumer, and the message is deleted on that consumer's ack. The 2022 talk has them swapped.

### F-MIGMYTH-5: "Work queue = one consumer" (Ep 10) vs "multiple non-overlapping consumers" (Ep 12)
- Type: contradiction
- Severity: low
- Claims: "Work-queue retention ... restricts the stream to one consumer" (Talk — Rethink Connectivity Ep 10) vs "you can actually have multiple consumers in a work queue stream as long as the subjects that they're interested in don't overlap" (Talk — Ep 12, explicit correction)
- Verification: server/consumer.go:1098-1104 (`partitionUnique` check, `JSConsumerWQConsumerNotUniqueErr`), 1150+ (`JSConsumerWQMultipleUnfilteredErr`).
- Verdict: RESOLVED — Ep 12 is right: any number of consumers, filters must not overlap; only one unfiltered consumer.

### F-MIGMYTH-6: Priority-group update rules in ADR-42 are not enforced in server code
- Type: unverifiable
- Severity: medium
- Claims: "we cannot support updating a consumer from one with groups to one without and vice versa ... We also cannot switch between different policies. Only PriorityTimeout is updatable" (ADR-42)
- Verification: server/consumer.go:2467-2527 (`checkNewConsumerConfig`) rejects deliver policy, storage, start seq/time, ack policy, replay, heartbeat, flow control, push/pull switch, max waiting — nothing about `PriorityPolicy`, `PriorityGroups`, or `PinnedTTL`. server/consumer.go:2529-2600 (`updateConfig`) applies deliver subject, max ack pending, sample, max deliver, inactive threshold — no priority fields are re-applied to the running consumer. No maintainer statement in the thread dump.
- Verdict: REQUIRES RESOLUTION — Either the server silently accepts a priority update without changing runtime behaviour (worst case for users), or clients reject it. A live test (update `priority_policy` on a running pull consumer, then inspect `nats consumer info` and pull behaviour) or a maintainer statement settles it. Until then do not print "only priority_timeout is updatable" as a server guarantee.

### F-MIGMYTH-7: "MaxDeliver is not a DLQ, the message stays in the stream" — true for Limits and WorkQueue, not reliably for Interest
- Type: stale
- Severity: medium
- Claims: "MaxDeliver is not a dead-letter queue — after max attempts, NATS stops redelivering but the message remains in the stream" (Blog — NATS JetStream: Streams, Consumers, and Durable Messaging, third party) and "it stays in the stream (removed only on ack or TTL) ... With R3, messages might get lost" (GitHub #7590, jgriegershs, non-maintainer) vs "The original message payload is lost because it gets removed from the source stream after hitting max_deliver" (GitHub #7590 asker)
- Verification: server/consumer.go:2358-2385 (`hasMaxDeliveries`): advisory sent once, message removed from the consumer's pending map and the ack floor moved; no stream-level ack/removal call. server/consumer.go:4853-4863 same on the redelivery path. server/stream.go:8686-8720 (`checkInterestState`): for Interest retention the stream is compacted up to the lowest consumer ack floor, so a max-delivered message on an Interest stream is removed once that floor passes it; `Compact` is only called for `InterestPolicy` (8714), never for WorkQueue. ripienaar 2025-11-28/29 (https://github.com/nats-io/nats-server/discussions/7590): payload in advisories rejected for now ("bad idea due to the payloads potentially being sensitive"), "I don't think there is a plan per se".
- Verdict: RESOLVED for Limits and WorkQueue (message stays; fetch it by the advisory's `stream_seq`), REQUIRES RESOLUTION for Interest retention (code path implies removal at next interest check; confirm live) and for the "R3 loses the message" user report (no issue filed, no maintainer reply). Print the DLQ statement only with the retention caveat.

### F-MIGMYTH-8: Direct Get read-after-write — ADR says none, server now gates followers on being caught up
- Type: stale
- Severity: low
- Claims: "We do not provide read-after-write consistency. Reads are performed directly to any replica, including out of date ones" (ADR-8) / "Direct Get does not assure read-after-write coherency" (ADR-31) vs "Send gets to the stream leader for more consistent results" (Legacy docs — JetStream concept)
- Verification: server/jetstream_cluster.go:4108-4128 — a follower only subscribes to direct-get subjects once `isCurrent()` or ≥90 % of applied entries (`syncThreshold = 90.0`), and unsubscribes while not current. This narrows staleness but is not a read-your-writes guarantee.
- Verdict: RESOLVED — "KV/Direct Get is not read-your-writes; followers answer only when at or near current, so a read right after a write can still return the previous value. Use the leader-routed `$JS.API.STREAM.MSG.GET` for read-after-write."

### F-MIGMYTH-9: JetStream max_memory_store / max_file_store reload — thread log is stale since 2.14
- Type: stale
- Severity: medium
- Claims: "`config reload not supported for jetstream max memory and store`: changing JetStream limits needs a restart, not a HUP" (GitHub #8001, server log dated 2026-04-02)
- Verification: server/reload.go:726-758 (`jetStreamOption` with `newMaxMemory`/`newMaxStore`, "Reloaded: JetStream max_mem_store"); introduced by commit 902eb7e5f 2026-04-07 "[IMPROVED] Allow reloading increased max memory and store", first tag v2.14.0. Decreases still need a restart (commit title says "increased").
- Verdict: RESOLVED — From 2.14.0 an increase of `max_memory_store`/`max_file_store` is reloadable with SIGHUP; a decrease is not. The thread's log line predates 2.14.0 by five days.

### F-MIGMYTH-10: "$G does not publish advisories" is only true for the CONNS aggregate
- Type: wrong
- Severity: medium
- Claims: "The default global account `$G` does not publish advisories" (Legacy docs — System Events)
- Verification: server/events.go:2554-2560 (`accConnsUpdate`: "We will not send for $G") is the only `s.gacc` guard in events.go. Client CONNECT/DISCONNECT events are emitted unconditionally for any account: server/auth.go:446-448 and server/server.go:3578 call `accountConnectEvent`/`accountDisconnectEvent`, whose bodies (server/events.go:2571-2616) have no global-account check.
- Verdict: RESOLVED — Only `$SYS.ACCOUNT.$G.SERVER.CONNS` periodic updates are suppressed; `$SYS.ACCOUNT.$G.CONNECT`/`DISCONNECT` are published. Not run live; code-only.

### F-MIGMYTH-11: One-hop routing — "only to local clients" omits leaf nodes
- Type: stale
- Severity: low
- Claims: "Messages received from a route will only be distributed to local clients" (Legacy docs — Clustering)
- Verification: server/client.go:5327-5331 (never re-send a route-received message to another route unless the flag is set: one hop) and 5335-5343 (route-received messages are delivered to LEAF connections when the leaf is a hub-side leaf or the subject is a service reply); gateways are excluded from this path (5332-5334).
- Verdict: RESOLVED — One hop across routes is right; the audience is local clients plus attached leaf nodes.

### F-MIGMYTH-12: `no_wait` pull status codes — no 409 for MaxAckPending
- Type: wrong
- Severity: low
- Claims: "`{\"batch\": n, \"no_wait\": true}` (404 status when empty, 409 when MaxAckPending reached)" (Legacy docs — NATS API Reference)
- Verification: server/consumer.go:4666-4684 — no_wait returns `404 No Messages` when nothing is pending and no expiry set, `408 Requests Pending` when other requests already cover the pending messages; 409 is used for `Exceeded MaxWaiting` (4699, 4710), `Exceeded MaxRequestBatch/Expires/MaxBytes` (4607-4617), `Leadership Change` (3134), `Consumer Deleted` (3151), `Batch Completed` (53). No MaxAckPending check in the request path (4560-4760).
- Verdict: RESOLVED — A no_wait request at MaxAckPending simply gets no messages until acks free capacity; it does not get a 409.

### F-MIGMYTH-13: ADR-51 "schedule in the past is sent immediately" holds for @at only
- Type: stale
- Severity: low
- Claims: "If a message is made with a schedule in the past it is immediately sent. If a server was down for a month and a scheduled message is recovered ... it will be sent immediately" (ADR-51)
- Verification: server/scheduler.go:320-327 (`@at` returns the parsed time unchanged, so a past time fires at once); 343-347 (`@every`: "If this schedule would trigger multiple times, for example after a restart, skip ahead and only fire once" → next = now + interval); 370-377 (cron: recomputed from now).
- Verdict: RESOLVED — One-shot `@at` in the past fires immediately; repeating schedules skip missed slots and fire once at the next slot after recovery.

### F-MIGMYTH-14: Ephemeral queue push consumers "not supported as of 2.8.4"
- Type: unverifiable
- Severity: low
- Claims: "As of NATS server v2.8.4, ephemeral queue push consumers are not supported" (NATS by Example — Queue Push Consumers (legacy))
- Verification: no `DeliverGroup`-with-ephemeral rejection exists in server/consumer.go (DeliverGroup only appears at 116, 1807, 2702-2705, 6693) nor in server/jetstream_errors_generated.go. The NATS by Example page ties the statement to the nats.go legacy API, not the server.
- Verdict: REQUIRES RESOLUTION — Likely a client-library limitation of the legacy `QueueSubscribe` path, not a server rule; current server code has no such check. Confirm with a live create of an ephemeral push consumer with `deliver_group` before citing.

### F-MIGMYTH-15: Third-party durability claim vs verified replication behaviour
- Type: dubious
- Severity: medium
- Claims: "Kafka provides stronger message durability guarantees" (Blog — Kafka vs NATS, Svix FAQ, unqualified) vs "you're not going to get an acknowledgement back until a quorum of those servers that are hosting that asset agree" (Talk — RethinkConn '22 Q&A, derekcollison, maintainer, spoken) vs "We did not observe data loss with simple network partitions, process pauses, or crashes in version 2.12.1" (Blog — Jepsen: NATS 2.12.1)
- Verification: server/raft.go:1236 (`qn := n.csz/2 + 1`, quorum commit); server/filestore.go:332 (`defaultSyncInterval = 2 * time.Minute`, fsync is periodic unless `sync_always`); ADR-56 async persist acks before the write. Kafka's default (`acks=all`, no per-write fsync) has the same shape; the Svix claim gives no basis.
- Verdict: RESOLVED — The unqualified "stronger" claim is unsupported. Correct statement: an R3 JetStream publish is acked after a quorum has the entry; disk sync is periodic (2 min default) unless `sync_always`, and `persist_mode: async` acks before the write. Same shape as Kafka `acks=all`.

### F-MIGMYTH-16: DZone / AutoMQ comparison numbers and anecdotes
- Type: dubious
- Severity: low
- Claims: "NATS failover sub-second", "forty-eight known client types vs eighteen", "performance reduction with message size" (Blog — DZone); "We had and still have issues on NATS Jetstream with Consumers" (Blog — AutoMQ, unattributed, undated); "more teams struggle with service meshes than succeed" (Blog — Building Microservices with NATS)
- Verification: none available — no source data in any of the posts; client-count figures copy the legacy Compare page (dated). The consumer-stability anecdote has no version; neilalexander 2025-08-24 (https://github.com/nats-io/nats-server/discussions/6274): "This situation should have improved quite significantly since the more recent 2.11 versions".
- Verdict: REQUIRES RESOLUTION — Drop these numbers/anecdotes; if a comparison page needs client counts, take them from nats.io/download at publish time.

### F-MIGMYTH-17: "Kafka queue functionality remains in the proposal stage"
- Type: stale
- Severity: low
- Claims: "While Kafka is developing similar queue functionality, this capability remains in the proposal stage" (Blog — NATS and Kafka Compared) vs "A Kafka KIP for queuing describes essentially the per-message ack, nak and redelivery features JetStream already has" (Talk — Office Hours with JNM)
- Verification: none in scope (claim about Kafka). Training-data impression: KIP-932 share groups shipped as early access in Kafka 4.0 (2025); not verified here.
- Verdict: REQUIRES RESOLUTION — Do not print "proposal stage"; check current Kafka release notes before publishing any comparison sentence about queues.

### F-MIGMYTH-18: "A request without a timeout can wait forever" — not with the client APIs
- Type: dubious
- Severity: low
- Claims: "A request without a timeout can wait forever; pass a deadline on every request()" (Learn — Request-reply, PATTERN/ANTI)
- Verification: nats.go `Request(subj, data, timeout)` takes a mandatory timeout (nats.go nats.go: `func (nc *Conn) Request` signature — not line-cited); the CLI `nats request` has a default timeout. Only a hand-rolled inbox subscribe can hang.
- Verdict: RESOLVED — Reword: "every client Request call carries a timeout; a hand-rolled inbox subscription without one waits forever."

### F-MIGMYTH-19: Interest retention — corrections are consistent with code
- Type: contradiction (none found; verified)
- Severity: low
- Claims: "with zero consumers messages are discarded immediately; with one consumer messages are retained even without an active subscription; consumers must exist before messages" (Blog — NATS Weekly #13) and "Interest retention removes a message once all interested consumers ack it" (GitHub #2794, derekcollison)
- Verification: server/stream.go:6992-7015 (no consumers or no filter interest → `SkipMsgNoInterest`), 8686-8716 (compact to min ack floor). Consumer existence, not subscription liveness, is what counts (`numConsumers`, `csl.HasInterest`).
- Verdict: RESOLVED — All three statements are correct as written.

### F-MIGMYTH-20: `Nats-TTL: never` survives MaxAge; bucket MaxAge beats a longer per-key TTL
- Type: contradiction (apparent)
- Severity: low
- Claims: "a `never` message is not removed by the stream's MaxAge setting" (ADR-43) vs "Bucket MaxAge takes precedence over a longer per-key TTL" (GitHub #7264, MauriceVanVeen)
- Verification: server/filestore.go:6986-6994 — the MaxAge sweep removes every message older than MaxAge except those whose header TTL parses negative ("never"), which are skipped; server/stream.go:5526-5540 (`parseMessageTTL`: "never" → -1). MauriceVanVeen 2025-08 (https://github.com/nats-io/nats-server/discussions/7264): "This is expected based on the MaxAge of 1m, which removes any message after that TTL."
- Verdict: RESOLVED — Both are true: MaxAge deletes any finite-TTL message regardless of its TTL; only `never` is exempt.

### F-MIGMYTH-21: SubjectDeleteMarkerTTL floor rewrites a short Nats-TTL instead of rejecting
- Type: (verified)
- Severity: low
- Claims: "A publish with a Nats-TTL below this floor is not rejected — instead the server raises the effective TTL to the floor and rewrites the stored Nats-TTL header" unless `MaxMsgsPer == 1` (ADR-43)
- Verification: server/stream.go:7103-7111.
- Verdict: RESOLVED — Correct as written.

### F-MIGMYTH-22: Mirror immutability, mirror-with-subjects, sources editable, TTL/schedules can't be disabled
- Type: (verified)
- Severity: low
- Claims: "Mirror configuration cannot be changed after creation" (ADR-59); "a mirror cannot have `subjects`" (ADR-59); "sources are editable at any time" (GitHub #5889, jnmoyne); "can be enabled on existing buckets but should not support disabling it" (ADR-48)
- Verification: server/stream.go:2361-2365 (`JSStreamMirrorNotUpdatableErr`, removing the mirror block is allowed to promote), 2172-2174 (`NewJSMirrorWithSubjectsError`), 2377-2390 (message TTL and schedules cannot be disabled, counter setting immutable, persist mode immutable); the update checks contain no rejection for `Sources` changes; jnmoyne https://github.com/nats-io/nats-server/discussions/5889.
- Verdict: RESOLVED — All correct.

### F-MIGMYTH-23: Consumer replicas must equal stream replicas on Interest/WorkQueue streams
- Type: (verified)
- Severity: low
- Claims: "the consumers will need to scale up first since their replica count needs to match that of the stream if it's Interest or WorkQueue" (ADR-62)
- Verification: server/consumer.go:730-737 (`JSConsumerReplicasShouldMatchStreamError`, skipped only while recovering); server/jetstream_cluster.go:9113-9116 (remap always uses the stream's replica count for non-Limits retention).
- Verdict: RESOLVED — Correct; also explains why "R1 consumer on an R3 work queue" fails.

### F-MIGMYTH-24: Placement cannot name a leader
- Type: (verified)
- Severity: low
- Claims: "a `preferred` server in placement is rejected with `preferred server not permitted in placement`" (Learn — Placement)
- Verification: server/stream.go:2293; server/consumer.go:1002 (same for consumers).
- Verdict: RESOLVED — Correct for streams and consumers.

### F-MIGMYTH-25: Compression does not raise storage limits
- Type: (verified)
- Severity: low
- Claims: "it saves physical disk for operators only; set max_file_store and stream limits in raw terms" (GitHub #5259, derekcollison)
- Verification: server/filestore.go:7601 and 7617 (`rl := fileStoreMsgSize(...)` returned as the record length), 5041 (`fs.state.Bytes += n` with that raw length), 6230-6237 (compression applied per block at flush). derekcollison https://github.com/nats-io/nats-server/discussions/5259: "all limits are applied to raw data".
- Verdict: RESOLVED — Correct.

### F-MIGMYTH-26: Even replica counts give no availability
- Type: (verified)
- Severity: low
- Claims: "R2 adds a storage copy but cannot progress if the leader fails" (Blog — NATS Weekly #32)
- Verification: server/raft.go:1236 (`qn := n.csz/2 + 1` → 2 of 2 for R2).
- Verdict: RESOLVED — Correct; R2 tolerates zero failures, same as R1, with double the writes.

### F-MIGMYTH-27: Peer selection at stream creation is load-balanced
- Type: (verified)
- Severity: low
- Claims: "the selection of the peers at stream creation time is load balanced (it looks at the current distribution of JS assets)" (GitHub #5884, jnmoyne) vs belief "NATS picks the fastest-responding servers"
- Verification: server/jetstream_cluster.go:9448 (random shuffle), then sort by available storage with ties broken by streams assigned, and for replicated streams a stable sort by HA-asset count (9579-9606 region, comments "Sort based on available from most to least" and "let's sort based on HAAssets").
- Verdict: RESOLVED — Correct.

### F-MIGMYTH-28: Meta-leader election window "5 to 10 seconds"
- Type: (verified, approximate)
- Severity: low
- Claims: "typically about 5 to 10 seconds with default timeouts if the node was killed outright" (Learn — Rolling upgrades)
- Verification: server/raft.go:298-303 (`minElectionTimeoutDefault = 4s`, `maxElectionTimeoutDefault = 9s`, heartbeat 1 s, lost-quorum 10 s).
- Verdict: RESOLVED — Election timeout is randomized 4–9 s; "about 5 to 10 seconds" is an acceptable rounding; say "4 to 9 seconds" if precision matters.

### F-MIGMYTH-29: Version-gated claims in the new Learn pages
- Type: (verified)
- Severity: low
- Claims: cookies `user_cookie`/`pass_cookie`/`token_cookie` "arrived in nats-server 2.11" (Learn — Browsers and origins); "From server 2.12.3 an MQTT connection is implicitly allowed to subscribe to `$MQTT.sub.` and `$MQTT.deliver.pubrel.`" (Learn — Auth and clustering (MQTT)); "A FIPS-140 build made with Go 1.25 or earlier refuses the whole WebSocket listener ... build with Go 1.26 or later" (Learn — Your first WebSocket connection); `handshake_first: "auto"`/`"auto_fallback"` 50 ms fallback (Learn — Encryption & TLS); API level 5 and feature levels (Code — jetstream_versioning.go)
- Verification: cookies — commit 8721d7483 (2024-02-26, #5131), first tag v2.11.0, server/opts.go:5575-5581. MQTT — commit 5aa9e377c "[CHANGED] MQTT: Permissions to \"$MQTT.\" are now implicit" present in v2.12.3, absent in v2.12.2; narrowed to the two prefixes by 6cc332cbc (v2.14.0), server/client.go:3359. FIPS — server/websocket.go:1129-1130 ("use Go 1.26 or later"), server/leafnode.go:313. TLS — server/opts.go:5319-5326, server/const.go:114 (`DEFAULT_TLS_HANDSHAKE_FIRST_FALLBACK_DELAY = 50 * time.Millisecond`). API level — server/jetstream_versioning.go:19 (`JSApiLevel int = 5`), 60-88 (TTL=1, counters/atomic batch/scheduling/async persist=2, fast batch=4), 155-170 (pause/priority=1, AckFlowControl=4); header server/jetstream_api.go:342.
- Verdict: RESOLVED — All correct. Note for the MQTT page: on 2.14+ the bypass covers only `$MQTT.sub.` and `$MQTT.deliver.pubrel.`; between 2.12.3 and 2.13 the whole `$MQTT.` prefix was implicit.

### F-MIGMYTH-30: Authorization corrections (empty allow list, same error text, unrestricted default)
- Type: (verified)
- Severity: low
- Claims: "`publish: []` parses as no list, so the user can publish anywhere" and "A user with no permissions block is unrestricted" (Learn — Authorization); "The server returns the same `Authorization Violation` for a wrong password and an unknown user" (Learn — Authentication basics)
- Verification: server/opts.go:4911-4924 (an empty array appends nothing → nil slice), 4996-5001 and 5017-5030 (`Allow: subjects`); server/client.go:1110-1113 (allow sublist created only when `Allow != nil`), 3342-3345 (`perms == nil` → subscribe allowed); server/client.go:2507-2530 (`authViolation` always sends "Authorization Violation"; the user name appears only in the server log).
- Verdict: RESOLVED — All correct. Empty allow lists are a real foot-gun worth a Misconceptions entry.

### F-MIGMYTH-31: Publishing "to a wildcard" and absent Origin header
- Type: (verified)
- Severity: low
- Claims: "Publishers can't publish to a wildcard; the `*` is taken as a literal character" (Learn — Subjects & wildcards); "The origin check is skipped when there's no Origin header" (Learn — Browsers and origins)
- Verification: server/client.go:2981 — only `Pedantic` mode rejects a non-literal publish subject; server/websocket.go:1042-1052 — "If the header is not present, we will accept" (RFC 6455 §1.6 quoted in code).
- Verdict: RESOLVED — Both correct.

### F-MIGMYTH-32: Consumer named without `durable` is ephemeral; InactiveThreshold does not make it durable
- Type: (verified)
- Severity: low
- Claims: "Setting InactiveThreshold does not make a consumer durable. Setting Name without Durable creates a named consumer that the server still treats as ephemeral" (Legacy docs — Consumers)
- Verification: server/consumer.go:6362-6368 (`isDurable` ⇔ `Durable != ""`), 960-963 (Name and Durable must match if both set).
- Verdict: RESOLVED — Correct.

### F-MIGMYTH-33: Late ack after redelivery to another worker still counts
- Type: (verified)
- Severity: low
- Claims: "if a first process fails to acknowledge within the window and the message has been redelivered to another consumer, the acknowledgment from the first consumer will be considered" (Legacy docs — Consumers)
- Verification: server/consumer.go:3703-3712 — AckExplicit looks up `o.pending[sseq]` by stream sequence and deletes it whatever delivery sequence the ack carries.
- Verdict: RESOLVED — Correct; a stale ack from the first worker completes the message even though a second worker holds it.

### F-MIGMYTH-34: Deletes are not replicated through mirrors
- Type: (verified)
- Severity: low
- Claims: "Deletes in the origin stream are NOT replicated through a source or mirror agreement" (Legacy docs — Source and Mirror Streams); "Delete a message from the origin, the mirror still has it" (Blog — Mirror Streams)
- Verification: server/stream.go:3274-3287 — the mirror only calls `skipMsgs` for a gap it observes at delivery time (upstream expired/deleted before delivery); already-mirrored messages are never touched. server/stream.go:1949-1952 forbids subject delete markers on mirrors.
- Verdict: RESOLVED — Correct, with one nuance: a message deleted upstream before the mirror fetched it is skipped (never appears), so "the mirror still has it" assumes the mirror was caught up.

### F-MIGMYTH-35: Weighted mapping remainder stays on the source subject
- Type: (verified)
- Severity: low
- Claims: "Weights under 100 keep the rest on the source subject; they don't drop it" (Learn — Subject mapping)
- Verification: server/accounts.go:748-761 ("Auto add in original at weight difference if all entries weight does not total to 100").
- Verdict: RESOLVED — Correct.

### F-MIGMYTH-36: Auth callout scope (`allowed_accounts`, `$G` always delegated)
- Type: (verified)
- Severity: low
- Claims: "without it, once auth_callout is on every connection except auth_users goes through it ... Connections matching no config user land in `$G` and always go through the callout" (Learn — Auth callout)
- Verification: server/auth.go:705-727 — users bound to `$G` are always delegated ("users that are not found in the config are implicitly bound to the global account. This means those users should be implicitly delegated"); `allowed_accounts` filters only other config accounts; `auth_users` skipped at 731-740.
- Verdict: RESOLVED — Correct.

### F-MIGMYTH-37: Consumer count guidance (millions of R3 durables)
- Type: (verified)
- Severity: low
- Claims: "durable replicated consumers are Raft state machines; shard streams, use R1/memory consumers, or cap per cluster" (GitHub #7863, wallyqs/derekcollison)
- Verification: wallyqs 2026-02-22/26 and 2026-09-02, https://github.com/nats-io/nats-server/discussions/7863: "better if you shard the streams so that you do not have more than 20K consumers or so per stream", "R1 memory based consumers to reduce I/O overhead", "cap the number of consumers per cluster to 200K or so", consumer-create rate "higher than 2K per second ... something that we are actively working on".
- Verdict: RESOLVED — Maintainer numbers usable as guidance (dated 2026-02).

### F-MIGMYTH-38: Headers are case-sensitive in nats.go
- Type: (verified)
- Severity: low
- Claims: "NATS headers are case preserving ... Case sensitivity is the responsibility of the application" (ADR-4); "Reading a header key with the wrong case returns an empty value and no error" (Learn — Message headers)
- Verification: nats.go nats.go:4380-4403 (`Add`, `Set`, `Get` documented "It is case-sensitive"; `Get` is a plain map lookup).
- Verdict: RESOLVED — Correct for nats.go; other clients not checked.

### F-MIGMYTH-39: "By default JetStream flushes disk writes synchronously"
- Type: dubious (wording)
- Severity: low
- Claims: "by default JetStream flushes disk writes synchronously, meaning that even if the nats-server process is killed suddenly no messages will be lost as the OS already has them in its buffer" (Legacy docs — nats bench)
- Verification: server/filestore.go:332 (`defaultSyncInterval = 2 * time.Minute`); ADR-56 `persist_mode: async` (server/stream.go:2393-2395 shows it is immutable after creation).
- Verdict: RESOLVED — Reword: default mode writes to the OS before acking (survives a process kill), fsyncs every 2 minutes unless `sync_always`; `persist_mode: async` (2.12+) acks before the write and can lose data on a process kill.

### F-MIGMYTH-40: Partition count "is part of the subject contract" vs "adjust administratively"
- Type: contradiction (apparent)
- Severity: low
- Claims: "raising partition(3, ...) to partition(4, ...) reshuffles which bucket an id hashes to; pick the bucket count once" (Learn — Subject mapping) vs "you can control and adjust the number of partitions ... administratively rather than do it in code" (GitHub #6315, jnmoyne)
- Verification: server/subject_transform.go:269-270 (`partition(n, tokens...)`), mapping is a pure hash of the listed tokens; jnmoyne https://github.com/nats-io/nats-server/discussions/6315.
- Verdict: RESOLVED — Both true: the count can be changed by config reload, and doing so remaps keys, so per-key ordering resets across the change.

### F-MIGMYTH-41: PATTERN set — no contradictions found among the untagged pattern claims
- Type: (reviewed)
- Severity: low
- Claims: "one consumer for everything" (ANTI) vs "too many consumers" (ANTI); "publish the result first, then ack" vs "dedup check in the same transaction"; "don't put everything in JetStream just in case" vs "hybrid eventing is the minimum viable architecture"; "start with core NATS, add JetStream per subject" (EP01S3) vs "NATS from day one covers messaging, streaming, KV" (EP02)
- Verification: none needed; these are scoped recommendations, not conflicting facts. Vendor "minimum viable architecture" and "all software will be designed like this in 2–5 years" are marketing, not guidance.
- Verdict: RESOLVED — Keep the operational ones (result-first ack, idempotency, gather by deadline, log tap at error level); drop the marketing lines from any Misconceptions or Patterns page.

## Summary

Counts by type (41 findings): contradiction 6 (F-2, F-3, F-5, F-19 none-found, F-20 apparent, F-40 apparent) · wrong 3 (F-4, F-10, F-12) · stale 6 (F-7, F-8, F-9, F-11, F-13, F-17) · unverifiable 2 (F-6, F-14) · dubious 4 (F-15, F-16, F-18, F-39) · maintainers-disagree 1 (F-1) · verified-only entries 19 (F-21 to F-38, F-41).

Counts by verdict: RESOLVED 35 · REQUIRES RESOLUTION 6 (F-1, F-6, F-7 partial, F-14, F-16, F-17).

| Finding | What is open | What settles it |
|---|---|---|
| F-1 KV as cache | ripienaar vs derekcollison positions | Maintainer sign-off on wording; cite jnmoyne's measured numbers only |
| F-6 Priority-group updates | ADR-42 says not updatable; server code has no check | Live test of `priority_policy` update on a running consumer, or maintainer statement |
| F-7 MaxDeliver on Interest streams; R3 loss report | Code implies compaction after ack-floor move; user report of R3 loss unanswered | Live test on Interest R1/R3; ask jgriegershs for the issue number |
| F-14 Ephemeral queue push consumers | No server check found; NbE ties it to 2.8.4 | Live create with `deliver_group` and no durable |
| F-16 Third-party numbers | No data behind DZone/AutoMQ figures | Drop, or re-source from nats.io at publish time |
| F-17 Kafka queues "proposal stage" | Kafka-side fact, unverified here | Check current Kafka release notes before publishing |

Ten corrections a Misconceptions page can state with full confidence:

1. Interest retention keeps a message until every matching consumer acks it and never stores a message no consumer matches; WorkQueue deletes on the single owning consumer's ack. — server/stream.go:6992-7015, 8714; server/consumer.go:1098-1104, 1140-1150 (F-4).
2. A WorkQueue stream may have many consumers as long as their filters don't overlap. — server/consumer.go:1098-1104 (F-5).
3. A message that hits MaxDeliver is not deleted from a Limits or WorkQueue stream; the advisory fires once and the message stays fetchable by sequence. — server/consumer.go:2358-2385 (F-7, with the Interest caveat).
4. A NATS stream corresponds to a Kafka partition, not a topic; a JetStream consumer corresponds to a Kafka consumer group. — derekcollison #6315, bruth #3772, jnmoyne (talk) (F-3).
5. Core publishing into a stream's subject is stored, but you get no PubAck and no backpressure. — server/stream.go:7091-7100; derekcollison #6490; Jarema #5932 (F-2).
6. `publish: []` is not a lockdown; it parses to "no allow list" and the user can publish anywhere. — server/opts.go:4911-4924; server/client.go:1110-1113 (F-30).
7. Compression never raises what fits under a limit; all limits count raw bytes. — server/filestore.go:7601, 7617, 5041; derekcollison #5259 (F-25).
8. R2 gives no availability over R1: quorum is 2 of 2. — server/raft.go:1236 (F-26).
9. A late ack from a worker that lost the message to redelivery still completes it. — server/consumer.go:3703-3712 (F-33).
10. `Nats-TTL: never` survives MaxAge; every other per-message TTL is capped by the stream's MaxAge. — server/filestore.go:6986-6994; MauriceVanVeen #7264 (F-20).
