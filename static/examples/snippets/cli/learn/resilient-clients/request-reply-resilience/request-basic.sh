#!/bin/bash
# order-svc asks the inventory question and waits for a reply, with a
# timeout that bounds how long it blocks.
#
# A request has exactly three outcomes:
#   - a reply arrives inside the deadline       -> printed below
#   - the deadline passes with no reply         -> a timeout
#   - no subscription is listening              -> an immediate 503
#                                                  (no responders)
#
# --timeout sets the deadline. Keep it at two or three times the
# responder's p99 latency so a slow-but-healthy answer is not mistaken
# for a fault. Most client libraries surface the same three outcomes as a
# reply, a timeout error, and a no-responders error; Java needs the
# reportNoResponders() connect option and the future-based request to tell
# the two failures apart.

nats request orders.inventory.check \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --timeout 2s
