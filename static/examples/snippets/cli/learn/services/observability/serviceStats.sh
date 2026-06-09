#!/bin/bash
# Read the per-endpoint stats the framework keeps for OrderInventory.
#
# First send a few real requests so the counters have something to show.
# Each request carries the canonical Acme order payload to the check
# endpoint on orders.inventory.check.
nats request orders.inventory.check \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
nats request orders.inventory.check \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
nats request orders.inventory.check \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'

# Now read the accumulated stats. This is the STATS discovery verb on the
# $SRV prefix, scoped to the OrderInventory service. Every instance replies
# with one stats_response listing each endpoint and its counters:
# num_requests, num_errors, last_error, processing_time, average_processing_time.
nats service stats OrderInventory

# Expected (one row per instance): the check endpoint shows
#   Requests: 3   Errors: 0   and a non-zero average processing time.
