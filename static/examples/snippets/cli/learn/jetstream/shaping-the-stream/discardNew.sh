#!/bin/bash
# Switch ORDERS from Discard Old to Discard New so a full stream pushes
# backpressure to the publisher instead of silently dropping old orders.
#
# Under Discard Old (the default) a publish that exceeds a limit always
# succeeds, because the server drops the oldest message to make room and
# tells the publisher nothing. If you need to keep history, that silent
# drop is data loss you never see.
#
# --discard new flips the trade: when a limit is hit, the server rejects
# the new message and the publish fails with "maximum bytes exceeded" (or
# "maximum messages exceeded"). The publisher now feels the limit and can
# retry, alert, or shed load.

nats stream edit ORDERS --discard new

# With Discard New in place, a publish into a full stream returns an
# error instead of succeeding silently. Handle that error in the
# publisher rather than assuming every publish is stored.
nats pub orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
