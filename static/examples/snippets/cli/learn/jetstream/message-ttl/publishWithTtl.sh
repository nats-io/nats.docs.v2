#!/bin/bash
# Publish an orders.cancelled message that expires 60 seconds after it
# is stored. The per-message TTL rides along as the Nats-TTL header.
# The stream must already have AllowMsgTTL enabled (nats stream edit
# ORDERS --allow-msg-ttl) or this publish is rejected.
nats pub orders.cancelled \
  --header "Nats-TTL:60s" \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
