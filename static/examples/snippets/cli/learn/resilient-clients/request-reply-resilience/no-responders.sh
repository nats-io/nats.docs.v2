#!/bin/bash
# See the no-responders signal for yourself.
#
# Request a subject that nobody is listening on. With no inventory
# responder running, the server knows immediately that no subscription
# exists on orders.inventory.check, and returns a 503 no-responders
# signal at once -- the request does NOT wait out the --timeout.
#
# Run this with no `nats reply orders.inventory.check ...` running, and
# the CLI prints the no-responders error right away. Start a responder
# and the same request gets an answer instead. Most client libraries
# surface this as a distinct no-responders error you can branch on,
# separate from a timeout; in Java you opt in with
# Options.Builder.reportNoResponders() and use the CompletableFuture-based
# request.

nats request orders.inventory.check \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --timeout 2s
