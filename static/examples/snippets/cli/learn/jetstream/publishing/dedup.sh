#!/bin/bash
# Idempotent publish: a Nats-Msg-Id header lets the server reject a duplicate
# inside the stream's duplicate-tracking window (2 minutes by default).
# This order was already stored as sequence 1 with this same Nats-Msg-Id, so
# the server recognizes it: nothing new is stored and the sequence does not
# advance. --jetstream prints the PubAck.
nats pub --jetstream orders.created \
  --header "Nats-Msg-Id:ord_8w2k-created" \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'

# Stored in Stream: ORDERS Sequence: 1 Duplicate: true
