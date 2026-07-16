#!/bin/bash
# A plain request returns only the FIRST reply and discards the rest.
# If more than one service answers on a subject, the extras are lost
# silently. Make the expectation explicit with --replies.
#
# --replies N waits for up to N replies instead of stopping at the first.
# --replies 0 collects every reply until --timeout ends the call.
nats request orders.inventory.check \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --replies 0 --timeout 2s
