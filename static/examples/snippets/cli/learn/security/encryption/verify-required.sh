#!/bin/bash
# Prove that mTLS actually rejects a client with no certificate.
# Run this against a server that has verify: true (or verify_and_map: true).
#
# This connection trusts the CA so the link encrypts, but it sends NO
# client certificate. If the server enforces mTLS, the handshake fails.
# If it succeeds, the server is NOT checking client certs (verify is off)
# and your "mTLS" is encryption-only.
nats pub orders.shipped \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --server tls://nats.acme.internal:4222 \
  --tlsca /etc/nats/certs/ca.pem

# Expected against a verify-enabled server: the publish fails at the
# handshake with a "bad certificate" / "certificate required" error,
# because no --tlscert / --tlskey was supplied.
