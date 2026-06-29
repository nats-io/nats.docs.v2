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
# "maximum messages exceeded"). The publisher now feels the limit.

# Force the full condition so you can see the rejection. Discard New never
# drops messages that are already stored, so switching ORDERS to it and
# capping it at one message leaves the orders from earlier pages in place and
# puts the stream instantly over its limit -- both in one edit.
nats stream edit ORDERS --discard new --max-msgs 1

# ORDERS is now full. Under Discard New this publish fails instead of
# succeeding silently, so the publisher can retry, alert, or shed load:
nats pub orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
# -> nats: maximum messages exceeded

# Put ORDERS back the way it was: Discard Old and no message-count cap. The
# 7-day age and 1 GiB byte limits set earlier stay in place.
nats stream edit ORDERS --discard old --max-msgs -1
