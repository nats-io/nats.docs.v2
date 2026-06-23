#!/bin/bash
# Read the PubAck back. `nats pub --jetstream` publishes into the stream and
# prints the server's acknowledgement: the stream that stored the message and
# the sequence number it assigned — proof that the message was stored.
nats pub --jetstream orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'

# Prints `Stored in Stream: ORDERS Sequence: 1`.
# An error (no responders) means no stream captured the subject — nothing stored.
