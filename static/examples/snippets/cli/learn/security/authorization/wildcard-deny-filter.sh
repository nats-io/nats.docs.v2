#!/bin/sh
# order-svc's subscribe section allows the wildcard but denies the audit branch:
#   permissions: {
#     publish: { allow: ["orders.>"] }
#     subscribe: { allow: ["orders.>"], deny: ["orders.audit.>"] }
#   }
# A literal subscribe to a denied subject fails loudly; a wildcard subscribe
# that overlaps the deny is accepted and silently filtered.

# Connect as order-svc.
export NATS_USER=order-svc
export NATS_PASSWORD=s3cr3t

# Loud: a literal subscribe to the denied subject is rejected. The CLI
# exits 1 with:
#   Subscribing on orders.audit.entry
#   nats: error: nats: permissions violation: Permissions Violation for Subscription to "orders.audit.entry"
nats sub orders.audit.entry

# Silent: the wildcard subscribe is ACCEPTED — no error, and nothing in the
# server log either. Leave it running (--wait exits after 4s without
# messages) and publish to both subjects from another terminal:
#   nats pub orders.created '{"order_id":"ord_8w2k","status":"created"}'
#   nats pub orders.audit.entry '{"order_id":"ord_8w2k","actor":"order-svc"}'
# Only orders.created is delivered; the server drops orders.audit.entry
# at delivery time. Expected output:
#   Subscribing on orders.>
#   [#1] Received on "orders.created"
#   {"order_id":"ord_8w2k","status":"created"}
nats sub "orders.>" --wait 4s
