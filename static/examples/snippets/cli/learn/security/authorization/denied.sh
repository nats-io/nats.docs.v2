#!/bin/bash
# order-svc is restricted to publishing orders.> (see permissions.sh for the
# server config). This shows an allowed publish succeeding and a denied
# publish returning a Permissions Violation.

# Connect as order-svc. Using the user/password from the ORDERS account config.
export NATS_USER=order-svc
export NATS_PASSWORD=s3cr3t

# Allowed: orders.created is covered by the publish allow-list "orders.>".
nats pub orders.created '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'

# Denied: billing.charge is not on the allow-list, so the server rejects it.
# The server returns:
#   nats: error: Permissions Violation for Publish to "billing.charge"
nats pub billing.charge '{"order_id":"ord_8w2k","amount_cents":4200}'
