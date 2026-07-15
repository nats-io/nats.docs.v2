#!/bin/bash
# A Nats-TTL header on a stream that hasn't opted in is rejected. The
# JetStream publish fails loudly (err_code 10166) and stores nothing —
# the message is not quietly kept forever without a TTL.

# A stream that never enabled AllowMsgTTL. Its config has no
# "Allows Per-Message TTL" line (the line only appears once it's on).
nats stream add ORDERS_NO_TTL --subjects "no-ttl.>" --defaults

# A JetStream publish (-J) with a TTL header is rejected: nats pub exits
# non-zero and prints the error, and nothing is stored. A plain core
# publish would hide this — it returns no PubAck, so you'd never see the
# rejection.
nats pub no-ttl.msg -J \
  --header "Nats-TTL:60s" \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
# -> nats: error: per-message TTL is disabled (10166)

# The fix is to opt the stream in once (a one-way switch), then republish.
nats stream edit ORDERS_NO_TTL --allow-msg-ttl
