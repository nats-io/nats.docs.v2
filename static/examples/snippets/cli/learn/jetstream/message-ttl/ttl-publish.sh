#!/bin/bash
# Enable per-message TTL on the existing ORDERS stream, then publish a
# short-lived orders.cancelled message.
#
# AllowMsgTTL is a one-way switch: it can be turned on for an existing
# stream but never turned back off. Requires nats-server 2.11+.
nats stream edit ORDERS --allow-msg-ttl

# Publish a message that the server deletes 60 seconds after storing it,
# ahead of the stream's 7-day MaxAge.
nats pub orders.cancelled \
  --header "Nats-TTL:60s" \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
