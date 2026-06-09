#!/bin/bash

# A stream captures a subject; it does not REPLY on that subject.
# Even with the ORDERS stream capturing orders.>, a request expecting a
# reply gets "no responders" because the stream is not a responder.
#
# Nobody is subscribed live to answer, so the server reports 503.
nats request orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --timeout 1s

# Expected:
#   nats: error: no responders available for request
#
# The message still lands in the ORDERS stream. Reading it back is a
# separate act, done by a consumer — not by replying to the publisher.
