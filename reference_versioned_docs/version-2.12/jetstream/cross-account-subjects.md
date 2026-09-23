---
description: Every subject a stream source or mirror uses across an account or leafnode boundary, for ephemeral and durable sourcing consumers, with tested export, import, and leafnode permission configs and the v1 and v2 subject formats.
mdx:
  format: md
---

# Cross-account subjects

A stream that sources or mirrors from another account or JetStream domain
drives a consumer on the origin stream from the other side of the boundary.
Every subject that consumer uses has to cross that boundary: through an export
and import between accounts, or through the subject permissions of a leafnode
connection. A missing subject rarely produces an error. Most of the time
replication stops or never starts.

This page lists those subjects for each kind of sourcing consumer, shows what
happens when each one is missing, and gives a tested config for accounts and
for leafnodes. It also covers a client that reads a consumer in another
account, and the v1 and v2 formats of the subjects involved.

## Sourcing consumers

A source or mirror reads the origin stream through a push consumer. Which
consumer it gets depends on the source config and on the origin stream's
retention policy:

| Consumer | When | Lifetime |
| --- | --- | --- |
| Ephemeral | No `consumer` block, and origin stream uses `limits` retention. | The server names it `JS_SRC_<hash>-<suffix>` (`JS_MIRROR_…` for a mirror) and removes it 10 seconds after it goes idle. |
| Server-managed durable (2.14+) | No `consumer` block, and origin stream uses `workqueue` or `interest` retention. | The origin server turns the create request into a durable named `JS_SRC_<hash>` (`JS_MIRROR_<hash>` for a mirror) with ack policy `flow_control`. It stays until you delete it, or until the source is removed from the sourcing stream, which sends a best-effort delete request. |
| User-provided durable (2.14+) | The source or mirror has a `consumer` block. | You create it on the origin stream and delete it yourself. The sourcing stream only resets it. |

A durable consumer with ack policy `flow_control` treats each flow control
response as an acknowledgement. That is how a `workqueue` or `interest` origin
stream learns that a message has been stored and can be safely removed.

## Subjects

The `api` prefix in the `external` block replaces `$JS.API` in every request
subject. With `"api": "ACC.ORIGIN.API"`, the sourcing stream sends
`ACC.ORIGIN.API.CONSUMER.CREATE.EVENTS`, and the import maps it back to
`$JS.API.CONSUMER.CREATE.EVENTS` in the origin account. The examples on this
page use `ACC.<account>.API`, which has the same shape as the domain prefix
`$JS.<domain>.API`. Don't start a subject with `$`, those are reserved for
the server.

| Subject | Direction | Export type | Used by |
| --- | --- | --- | --- |
| `$JS.API.CONSUMER.CREATE.<stream>` | sourcing → origin | service | Ephemeral and server-managed. Sent when the source has no filter, or more than one. |
| `$JS.API.CONSUMER.CREATE.<stream>.<consumer>.<filter>` | sourcing → origin | service | Ephemeral and server-managed. Sent when the source has one filter or one subject transform. |
| `$JS.API.CONSUMER.DELETE.<stream>.<consumer>` | sourcing → origin | service | Server-managed (2.14+). Sent when the source or mirror is removed, the mirror is promoted, or the sourcing stream is deleted. |
| `$JS.API.CONSUMER.RESET.<stream>.<consumer>` | sourcing → origin | service | User-provided durable (2.14+). Sent in place of a create, every time the source (re)connects. |
| `$JSC.R.…`, the reply to each request above | origin → sourcing | none | All. A service import rewrites the reply subject, so it only needs a permission across a leafnode. |
| The delivery subject | origin → sourcing | stream | All. Carries messages, heartbeats, and flow control requests. |
| `$JS.FC.…` | sourcing → origin | service | All. The flow control response, which is also the acknowledgement for the two durable kinds. |

`$JS.ACK`, which client-driven consumers use for acknowledgements, isn't in
this list. An ephemeral sourcing consumer uses ack policy `none`, and a
consumer with ack policy `flow_control` doesn't listen on `$JS.ACK` at all.

The delivery subject depends on the consumer:

- Ephemeral and server-managed consumers get a new delivery subject each time
  they're created: `<deliver>.S.<uid>` for a source and `<deliver>.M.<uid>` for
  a mirror, where `<deliver>` is the `deliver` prefix in the `external` block.
  Without a prefix the subject is `$JS.S.<uid>` or `$JS.M.<uid>`. Export it
  with a wildcard, such as `DELIVER.TARGET.COPY.>`.
- A user-provided durable uses the literal `deliver_subject` from the
  `consumer` block, which has to match the consumer's own `deliver_subject`.
  The `deliver` prefix is ignored.

Set a `deliver` prefix for ephemeral and server-managed consumers, and make it
unique to one sharing relationship. The examples use
`DELIVER.<sourcing account>.<sourcing stream>`. Every account that imports a
delivery subject receives all messages published on it, so an export of
`$JS.S.>`, `$JS.M.>`, or a prefix shared by several sourcing accounts lets each
of them read the others' copies. Restricting each export to the account that
needs it, with `accounts: [ … ]`, makes the server reject any other account's
import.

## When a subject is missing

| Missing | Ephemeral | Server-managed durable | User-provided durable |
| --- | --- | --- | --- |
| Create | No messages flow. | Same as ephemeral. | Not used. |
| Delete | Not used. The consumer goes idle and is removed after 10 seconds. | The consumer stays on the origin stream after the source is gone. On an `interest` stream it keeps holding messages. | Not used. |
| Reset | Not used. | Not used. | No messages flow. |
| Delivery subject | The consumer is created, receives no interest, and is removed after 10 seconds. The source recreates it, and no messages flow. | No messages flow, and the consumer stays. | No messages flow. |
| `$JS.FC` | Messages arrive until about 2 MB is waiting on a flow control response, then stop with `stream source consumer stalled on flow control` (error `10228`). | Same, and the origin stream keeps every message because nothing is acknowledged. | Delivery stops at the consumer's `max_ack_pending` with error `10228`, and nothing is acknowledged. |

## Accounts: ephemeral and server-managed consumers

This config lets a source or mirror in an account named `TARGET` read the `EVENTS`
stream in an account named `ORIGIN`. It works for both consumer kinds, and it only
allows consumers on the `EVENTS` stream:

```conf
accounts {
  ORIGIN {
    jetstream: enabled
    exports [
      { service: "$JS.API.CONSUMER.CREATE.EVENTS", accounts: [TARGET] }
      { service: "$JS.API.CONSUMER.CREATE.EVENTS.>", accounts: [TARGET] }
      { service: "$JS.API.CONSUMER.DELETE.EVENTS.*", accounts: [TARGET] }
      { stream:  "DELIVER.TARGET.COPY.>", accounts: [TARGET] }
      { service: "$JS.FC.EVENTS.>", accounts: [TARGET] }
      { service: "$JS.FC.*.*.EVENTS.>", accounts: [TARGET] }
    ]
  }
  TARGET {
    jetstream: enabled
    imports [
      { service: { account: ORIGIN, subject: "$JS.API.CONSUMER.CREATE.EVENTS" }, to: "ACC.ORIGIN.API.CONSUMER.CREATE.EVENTS" }
      { service: { account: ORIGIN, subject: "$JS.API.CONSUMER.CREATE.EVENTS.>" }, to: "ACC.ORIGIN.API.CONSUMER.CREATE.EVENTS.>" }
      { service: { account: ORIGIN, subject: "$JS.API.CONSUMER.DELETE.EVENTS.*" }, to: "ACC.ORIGIN.API.CONSUMER.DELETE.EVENTS.*" }
      { stream:  { account: ORIGIN, subject: "DELIVER.TARGET.COPY.>" } }
      { service: { account: ORIGIN, subject: "$JS.FC.EVENTS.>" } }
      { service: { account: ORIGIN, subject: "$JS.FC.*.*.EVENTS.>" } }
    ]
  }
}
```

`$JS.API.CONSUMER.CREATE.EVENTS.>` doesn't match the bare
`$JS.API.CONSUMER.CREATE.EVENTS`, so both entries are needed. Servers before
2.14 never send the delete request or use the v2 `$JS.FC` format; the extra
entries are harmless there and keep the config working after an upgrade. The
two `$JS.FC` entries cover the v1 and v2 [subject formats](#subject-formats).
To allow consumers on every stream in the `ORIGIN` account, use
`$JS.API.CONSUMER.>` and `$JS.FC.>` instead. `accounts: [TARGET]` limits each
export to the `TARGET` account.

The source, for a stream named `COPY`, references a similar configuration:

```json
{
  "name": "COPY",
  "sources": [
    {
      "name": "EVENTS",
      "external": { "api": "ACC.ORIGIN.API", "deliver": "DELIVER.TARGET.COPY" }
    }
  ]
}
```

## Accounts: user-provided durable consumer

With a user-provided durable, the origin account creates the consumer, and the
sourcing account only needs to reset it and receive from it. That allows an
export scoped to one consumer.

Create the consumer on the origin stream with ack policy `flow_control` and a
push `deliver_subject`:

```json
{
  "durable_name": "COPY_SRC",
  "deliver_subject": "DELIVER.TARGET.COPY_SRC",
  "ack_policy": "flow_control"
}
```

The server sets `flow_control: true` and a 1 second `idle_heartbeat`, and
defaults `max_ack_pending` to 1000. It rejects `ack_wait`, `backoff`, and
`max_deliver`.

Export exactly that consumer:

```conf
accounts {
  ORIGIN {
    jetstream: enabled
    exports [
      { service: "$JS.API.CONSUMER.RESET.EVENTS.COPY_SRC", accounts: [TARGET] }
      { stream:  "DELIVER.TARGET.COPY_SRC", accounts: [TARGET] }
      { service: "$JS.FC.EVENTS.COPY_SRC.*", accounts: [TARGET] }
      { service: "$JS.FC.*.*.EVENTS.COPY_SRC.*", accounts: [TARGET] }
    ]
  }
  TARGET {
    jetstream: enabled
    imports [
      { service: { account: ORIGIN, subject: "$JS.API.CONSUMER.RESET.EVENTS.COPY_SRC" }, to: "ACC.ORIGIN.API.CONSUMER.RESET.EVENTS.COPY_SRC" }
      { stream:  { account: ORIGIN, subject: "DELIVER.TARGET.COPY_SRC" } }
      { service: { account: ORIGIN, subject: "$JS.FC.EVENTS.COPY_SRC.*" } }
      { service: { account: ORIGIN, subject: "$JS.FC.*.*.EVENTS.COPY_SRC.*" } }
    ]
  }
}
```

The source names the consumer and its delivery subject. It still needs the
`api` prefix, but not a `deliver` prefix:

```json
{
  "name": "COPY",
  "sources": [
    {
      "name": "EVENTS",
      "external": { "api": "ACC.ORIGIN.API" },
      "consumer": { "name": "COPY_SRC", "deliver_subject": "DELIVER.TARGET.COPY_SRC" }
    }
  ]
}
```

A source with a `consumer` block can't also set `opt_start_seq`,
`opt_start_time`, or `filter_subject`; set those on the consumer instead. Two
sources in the same stream can't share one consumer.

## Consumers driven from another account

A client that creates and reads a consumer on a stream in another account uses
the JetStream API and `$JS.ACK`, which sourcing doesn't:

```conf
accounts {
  ORIGIN {
    jetstream: enabled
    exports [
      { service: "$JS.API.>", response: stream }
      { service: "$JS.ACK.>" }
      { stream:  "DELIVER.READER.>" }
    ]
  }
  TARGET {
    imports [
      { service: { account: ORIGIN, subject: "$JS.API.>" }, to: "ACC.ORIGIN.API.>" }
      { service: { account: ORIGIN, subject: "$JS.ACK.>" } }
      { stream:  { account: ORIGIN, subject: "DELIVER.READER.>" } }
    ]
  }
}
```

The client sets its JetStream API prefix to `ACC.ORIGIN.API`.

- `$JS.API.>` needs `response: stream`, because a pull request gets one reply
  per message.
- `$JS.ACK.>` carries acknowledgements. An acknowledgement is published on the
  `$JS.ACK` subject the message carried, and no service import rewrites it.
  Without this import, a synchronous acknowledgement fails with
  `no responders available for request`, and the message is redelivered when
  the ack wait expires.
- The stream export of `DELIVER.READER.>` is only needed for a push consumer,
  whose messages go to its `deliver_subject`. Without it the push consumer
  receives nothing. Pull consumers reply through the API import and don't need
  it.

## Leafnodes

A stream in one JetStream domain can source from a stream in another domain
over a leafnode connection. The subjects are the same, with two differences:

- Nothing rewrites `$JSC.R` replies, so they cross the connection and need a
  permission.
- The permissions on the leafnode connection replace the exports and imports.

When the two sides use different domains, the leafnode connection denies
`$JS.API.>`, `$KV.>`, and `$OBJ.>` in both directions. Requests have to use
the domain prefix `$JS.<domain>.API`, which the receiving server maps to its
own `$JS.API`. Permissions are checked against the subject as it crosses the
connection, before that mapping, so they have to name `$JS.<domain>.API`, not
`$JS.API`.

Permissions for leafnodes go on the user the leaf connects as, on the hub:
`publish` limits what the leaf sends to the hub, and `subscribe` limits what
the hub sends to the leaf. `$JS.ACK` subjects are exempt from the check on
messages the leaf sends; `$JS.FC` and `$JSC.R` aren't.

### A leaf stream sources from the hub

The hub runs domain `HUB` and holds `EVENTS`. The leaf's source uses
`"api": "$JS.HUB.API"`. For an ephemeral or server-managed consumer, with
`"deliver": "DELIVER.LEAF.COPY"`:

```conf
permissions: {
  publish: { allow: [
    "$JS.HUB.API.CONSUMER.CREATE.EVENTS",
    "$JS.HUB.API.CONSUMER.CREATE.EVENTS.>",
    "$JS.HUB.API.CONSUMER.DELETE.EVENTS.*",
    "$JS.FC.EVENTS.>",
    "$JS.FC.*.*.EVENTS.>"
  ] }
  subscribe: { allow: [ "DELIVER.LEAF.COPY.>", "$JSC.R.>" ] }
}
```

For a user-provided durable consumer named `COPY_SRC` with `deliver_subject`
`DELIVER.LEAF.COPY_SRC`:

```conf
permissions: {
  publish: { allow: [
    "$JS.HUB.API.CONSUMER.RESET.EVENTS.COPY_SRC",
    "$JS.FC.EVENTS.COPY_SRC.*",
    "$JS.FC.*.*.EVENTS.COPY_SRC.*"
  ] }
  subscribe: { allow: [ "DELIVER.LEAF.COPY_SRC", "$JSC.R.>" ] }
}
```

Without `$JSC.R.>`, nothing flows and the source shows no error. See
[`$JSC.R` formats](#jscr-formats) to narrow it to one stream.

### The hub sources from a leaf stream

When a hub stream sources from a stream in the leaf's domain `LEAF`, the
directions swap. The hub's source uses `"api": "$JS.LEAF.API"` and
`"deliver": "DELIVER.HUB.COPY"`, and the permissions on the same leaf user become:

```conf
permissions: {
  publish: { allow: [ "DELIVER.HUB.COPY.>", "$JSC.R.>" ] }
  subscribe: { allow: [
    "$JS.LEAF.API.CONSUMER.CREATE.EVENTS",
    "$JS.LEAF.API.CONSUMER.CREATE.EVENTS.>",
    "$JS.LEAF.API.CONSUMER.DELETE.EVENTS.*",
    "$JS.FC.EVENTS.>",
    "$JS.FC.*.*.EVENTS.>"
  ] }
}
```

A leaf that also limits traffic from its own side, with `deny_imports` or
`deny_exports` on the remote, must not deny any of these subjects either.

## Subject formats

`$JS.ACK`, `$JS.FC`, and `$JSC.R` each have a v2 format that adds a domain and
an account hash. With it, the same stream and consumer names in different
domains or accounts no longer collide, and a permission can name one stream.

### `$JS.ACK` and `$JS.FC` formats

| Subject | Format | Servers |
| --- | --- | --- |
| `$JS.ACK` v1 | `$JS.ACK.<stream>.<consumer>.<num delivered>.<stream seq>.<consumer seq>.<timestamp>.<num pending>` | all |
| `$JS.ACK` v2 | `$JS.ACK.<domain>.<account hash>.<stream>.<consumer>.<num delivered>.<stream seq>.<consumer seq>.<timestamp>.<num pending>` | 2.14+ |
| `$JS.FC` v1 | `$JS.FC.<stream>.<consumer>.<uid>` | all |
| `$JS.FC` v2 | `$JS.FC.<domain>.<account hash>.<stream>.<consumer>.<uid>` | 2.14+ |

`<domain>` is the JetStream domain of the server holding the consumer, or `_`
when it has none. `<account hash>` is a hash of the account holding the
consumer.

The `js_ack_fc_v2` feature flag on the server holding the consumer selects the
format for both subjects. It's off by default on 2.14 and 2.15, and on by
default from 2.16:

```conf
feature_flags {
  js_ack_fc_v2: true
}
```

A server on 2.14 or later accepts both formats, whatever the flag says. Before
2.14, only v1 exists, and a server refuses to load a config that has a
`feature_flags` block.

### `$JSC.R` formats

| Format | Servers |
| --- | --- |
| v1 `$JSC.R.<uid>` | all |
| v2 `$JSC.R.<domain>.<account hash>.<stream>.<consumer>.<uid>` | 2.15+ |

In v2, `<stream>` and `<consumer>` name the origin stream and its consumer.
`<account hash>` is a hash of the account holding the sourcing stream.
`<domain>` is the second token of the `api` prefix: the domain for
`$JS.<domain>.API`, or the account for `ACC.<account>.API`. It's `_` when the
source has no `external` block.

The `js_api_reply_v2` feature flag selects the format, and it's off by
default. The server answering the request doesn't read the reply subject, so
the flag only has to be on for the server that holds the sourcing stream:

```conf
feature_flags {
  js_api_reply_v2: true
}
```

With v2 on the leaf, the leafnode permission can name one remote stream
instead of `$JSC.R.>`:

```conf
subscribe: { allow: [ "DELIVER.LEAF.COPY.>", "$JSC.R.HUB.*.EVENTS.>" ] }
```

Without the flag, that permission matches no reply, and the source doesn't
start.

### Scoped exports and permissions

An export, import, or permission that names only the subject prefix matches
both formats. One that names a stream or consumer has to list both forms to
keep working when the default changes:

| Scope | v1 entry | v2 entry |
| --- | --- | --- |
| Acks for one stream | `$JS.ACK.<stream>.>` | `$JS.ACK.*.*.<stream>.>` |
| Flow control for one stream | `$JS.FC.<stream>.>` | `$JS.FC.*.*.<stream>.>` |
| Flow control for one consumer | `$JS.FC.<stream>.<consumer>.*` | `$JS.FC.*.*.<stream>.<consumer>.*` |
| Replies for one origin stream | none, use `$JSC.R.>` | `$JSC.R.<domain>.*.<stream>.>` |

An entry that names only the v1 form stops matching once the server holding
the consumer switches to v2. Acknowledgements then stop reaching the origin
account, and sourcing stalls on flow control.

## See also

- [Upgrade to 2.14](/release-notes/upgrade-to-2.14): durable sourcing, the
  `flow_control` ack policy, the consumer reset API, and the change of subject
  format.
- [Learn → Mirrors and sources](/learn/jetstream/mirrors-and-sources): building
  a mirror or source, including across an account or domain.
- [Stream configuration](./api/stream/create): every field of the `external`
  and `consumer` blocks on a source or mirror.
- [ADR-60](https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-60.md):
  durable sourcing and the consumer reset API.
