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

# RIGHT — gather every quote, then pick the cheapest. --replies 0 collects
# every reply that arrives during the full --timeout window, then returns —
# a fixed, predictable budget. If a carrier is down, its quote is simply
# absent from the set; --reply-timeout has no effect in this mode.
nats request shipping.quote \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --replies 0 --timeout 2s
