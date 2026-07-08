#!/bin/bash
# The "first reply only" trap, and the fix.
#
# `nats request` defaults to --replies 1: it reads ONE reply and stops.
# With three providers up, you get whichever carrier answered first and
# the other two quotes are silently discarded. That is a single request,
# not a scatter-gather.

# WRONG for scatter-gather — takes only the first quote that lands.
nats request shipping.quote \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'

# RIGHT — gather every quote, then pick the cheapest. --replies 0 keeps
# collecting until replies stop: --timeout bounds the wait for the first reply
# and --reply-timeout (300ms default) bounds the gap between replies, so it
# returns soon after the last quote -- even if a carrier is down and never
# answers.
nats request shipping.quote \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --replies 0 --timeout 2s
