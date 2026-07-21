#!/bin/bash
# Publish an orders.canceled message that expires 60 seconds after it
# is stored. The per-message TTL rides along as the Nats-TTL header.
# The stream must already have AllowMsgTTL enabled (nats stream edit
# ORDERS --allow-msg-ttl) or this publish is rejected.
# -J makes it a JetStream publish, so the server returns a PubAck
# (Stored in Stream ... Sequence ...) instead of a fire-and-forget send.
nats pub orders.canceled -J \
  --header "Nats-TTL:60s" \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
