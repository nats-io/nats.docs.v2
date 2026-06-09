#!/bin/bash
# Read the PubAck back. `nats req` publishes and waits for the server's reply,
# which carries the stream name and the assigned sequence number — the proof
# that the message was stored.
nats req orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'

# A reply like {"stream":"ORDERS","seq":1} is the PubAck: stream + sequence.
# No reply (a timeout) means no stream captured the subject — nothing was stored.
