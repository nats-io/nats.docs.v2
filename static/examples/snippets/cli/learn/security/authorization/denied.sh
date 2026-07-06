#!/bin/bash
# order-svc is restricted to publishing orders.> and subscribing _INBOX.>.
# Assumed server config (top-level authorization block):
#   authorization {
#     users: [
#       {
#         user: order-svc
#         password: s3cr3t
#         permissions: {
#           publish: { allow: ["orders.>"] }
#           subscribe: { allow: ["_INBOX.>"] }
#         }
#       }
#       {user: analytics-reader, password: an4lytics}
#     ]
#   }
# This shows an allowed publish succeeding and a denied publish being rejected.

# Connect as order-svc.
export NATS_USER=order-svc
export NATS_PASSWORD=s3cr3t

# Allowed: orders.created is covered by the publish allow-list "orders.>".
# Expected output:
#   Published 91 bytes to "orders.created"
nats pub orders.created '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'

# Denied: billing.charge is not on the allow-list, so the server rejects it
# and drops the message. The CLI exits 1 with:
#   nats: error: nats: permissions violation: Permissions Violation for Publish to "billing.charge"
nats pub billing.charge '{"order_id":"ord_8w2k","amount_cents":4200}'
