#!/bin/bash
# Idempotent publish: a Nats-Msg-Id header lets the server reject a duplicate
# inside the stream's duplicate-tracking window (2 minutes by default).
# Run this twice — the second publish is recognized as a duplicate and the
# stream sequence does not advance.
nats pub orders.created \
  --header "Nats-Msg-Id:ord_8w2k-created" \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
