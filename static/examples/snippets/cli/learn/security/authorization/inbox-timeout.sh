#!/bin/sh
# Broken state: order-svc's subscribe section denies everything:
#   permissions: {
#     publish: { allow: ["orders.>"] }
#     subscribe: { deny: [">"] }
#   }
# A request subscribes to a temporary _INBOX.> subject before it publishes,
# and the deny blocks that subscription, so no reply can ever arrive.

# Connect as order-svc.
export NATS_USER=order-svc
export NATS_PASSWORD=s3cr3t

# Trace commands, so you can see the below happen
set -x

# The CLI is silent about the denial: it prints only
#   Sending request on "orders.lookup"
# then waits out the timeout and exits 0 — no error. The violation appears
# in the SERVER log:
#   [ERR] ... "$G/user:order-svc" - Subscription Violation - Subject "_INBOX.<random>", SID 1
# (Client libraries raise a timeout error on the request instead.)
nats req orders.lookup '{"order_id":"ord_8w2k"}' --timeout 2s || echo "exited $?"

# Fix: REPLACE the subscribe section in the server config — adding an allow
# next to the deny does nothing, because deny beats allow:
#   subscribe: { allow: ["_INBOX.>"] }
# Reload the server and run the same request again, with a responder
# listening on orders.lookup. Expected output:
#   Sending request on "orders.lookup"
#   Received with rtt 652µs
#   {"order_id":"ord_8w2k","status":"shipped"}
nats req orders.lookup '{"order_id":"ord_8w2k"}' --timeout 2s || echo "exited $?"
