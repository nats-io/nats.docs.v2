#!/bin/bash
# Plain `nats pub` is a core NATS publish: it prints "Published N bytes"
# whether or not a stream captured the subject. That line is NOT proof of
# storage. To confirm the message landed in ORDERS, publish with --jetstream,
# which reads the PubAck and prints the stream and assigned sequence.
nats pub --jetstream orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'

# `Stored in Stream: ORDERS Sequence: 4` confirms the write.
# An error (no responders) means no stream captured the subject:
# the message was NOT stored, even though core `nats pub` would say "Published".
