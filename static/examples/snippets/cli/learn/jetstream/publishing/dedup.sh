#!/bin/bash
# Idempotent publish: a Nats-Msg-Id header lets the server reject a duplicate
# inside the stream's duplicate-tracking window (2 minutes by default).
# --jetstream prints the PubAck. Run this twice — the first call stores the
# message; the second reports the same sequence with `Duplicate: true`, so the
# stream sequence does not advance.
nats pub --jetstream orders.created \
  --header "Nats-Msg-Id:ord_8w2k-created" \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'

# First run:  Stored in Stream: ORDERS Sequence: <n>
# Second run: Stored in Stream: ORDERS Sequence: <n> Duplicate: true
