/**
 * Per-enum-value descriptions overlaid onto the vendored JSM schemas at
 * render time by the JSONSchema component. The vendored schemas themselves
 * are regenerated from pinned upstream tags and must not be edited.
 *
 * Keyed by property name; a key applies to that property in every schema and
 * every version. Values missing here fall back to plain chip rendering.
 *
 * Descriptions are sourced from client and server code, not written from
 * scratch: nats.rs doc comments first, cross-checked against nats.go and
 * nats-server (ADR-60 for flow_control).
 */
export const enumDescriptions: Record<string, Record<string, string>> = {
  deliver_policy: {
    all: "Deliver every message still present in the stream, starting from the oldest.",
    last: "Deliver only the newest message in the stream, then continue with new ones.",
    new: "Deliver only messages received after the consumer was created.",
    by_start_sequence:
      "Start delivery at the stream sequence set in opt_start_seq.",
    by_start_time:
      "Start delivery at the first message with a timestamp at or after opt_start_time.",
    last_per_subject:
      "Deliver the newest message for each subject matched by the consumer's filter.",
  },
  ack_policy: {
    none: "Messages need no acknowledgment; the server considers them delivered as soon as they're sent.",
    all: "Acknowledging a message also acknowledges every earlier one; useful for acknowledging in batches.",
    explicit: "Every message must be acknowledged individually.",
    flow_control:
      "Internal policy used by server-managed sourcing and mirroring consumers (ADR-60); acknowledgments are driven by flow-control responses, not client code.",
  },
  replay_policy: {
    instant: "Deliver messages as fast as the consumer can accept them.",
    original:
      "Deliver messages at the rate they arrived in the stream, which is useful for replaying traffic patterns.",
  },
  priority_policy: {
    none: "No priority handling; requests are served in the normal order.",
    overflow:
      "A client receives messages only once the number of pending messages or acknowledgments crosses the threshold it set on the request.",
    pinned_client:
      "The server picks one client and delivers only to it, failing over to another if it stops responding within priority_timeout.",
    prioritized:
      "The server serves requests by the priority level each client declares instead of round-robin. Requires nats-server 2.12 or later.",
  },
  retention: {
    limits:
      "Keep messages until a stream limit removes them (max_msgs, max_bytes, or max_age).",
    interest:
      "Remove a message once every consumer whose filter matches it has acknowledged it; a message with no matching consumer is dropped immediately.",
    workqueue:
      "Remove a message as soon as one consumer acknowledges it; consumers must use non-overlapping subject filters.",
  },
  discard: {
    old: "Remove the oldest messages to make room for new ones when a limit is reached.",
    new: "Reject new messages while the stream sits at its limit.",
  },
  storage: {
    file: "Keep stream data on disk.",
    memory:
      "Keep stream data only in memory; it does not survive a server restart.",
  },
  compression: {
    none: "Store message blocks uncompressed.",
    s2: "Compress stored message blocks with the S2 algorithm (an extension of Snappy).",
  },
  persist_mode: {
    "": "Not set; the server uses the default mode.",
    default:
      "Writes are flushed to storage before the publish is acknowledged.",
    async:
      "Writes are flushed in the background; a publish may be acknowledged before the message is stored.",
  },
};
