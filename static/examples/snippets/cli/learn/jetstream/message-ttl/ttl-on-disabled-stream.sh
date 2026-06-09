#!/bin/bash
# A Nats-TTL header on a stream that never opted in is rejected — the
# publish fails loudly, it is not stored and silently kept forever.
#
# Confirm AllowMsgTTL first. The flag shows as "Allows Per-Message TTL"
# in the stream config block.
nats stream info ORDERS | grep "Per-Message TTL"

# If that line reads "false", this publish is rejected by the server
# with err_code 10166 ("per-message TTL is disabled") and nats pub
# exits non-zero — your message is gone, not stored with no TTL.
nats pub orders.cancelled \
  --header "Nats-TTL:60s" \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'

# Fix: opt the stream in once (a one-way switch), then republish.
nats stream edit ORDERS --allow-msg-ttl
