#!/bin/bash
# Send one request to shipping.quote and gather replies from every provider.

# Gather by count: stop after 3 replies have arrived.
nats request shipping.quote \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --replies 3 --timeout 2s

# Gather by deadline instead: --replies 0 keeps collecting until replies stop
# arriving. --timeout bounds the wait for the first reply; --reply-timeout
# (300ms by default) bounds the gap between replies, so it returns a short
# moment after the last quote. Use this when you do not know how many
# providers are running.
nats request shipping.quote \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --replies 0 --timeout 2s
