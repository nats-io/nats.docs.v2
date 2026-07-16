#!/bin/sh
# Connect and publish as order-svc over TLS.
# The client trusts the CA that signed the server certificate (--tlsca),
# verifies the server's identity, then publishes the canonical order JSON
# over the now-encrypted connection.

nats pub orders.shipped \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --server tls://nats.acme.internal:4222 \
  --tlsca /etc/nats/certs/ca.pem

# Expected output:
#   14:22:18 Published 91 bytes to "orders.shipped"
