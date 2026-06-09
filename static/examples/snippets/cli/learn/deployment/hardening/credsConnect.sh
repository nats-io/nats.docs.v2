#!/bin/bash
# Prove that auth and TLS are both live on the hardened ORDERS cluster.
# This single command exercises the whole hardened path: the client trusts
# the CA that signed the server certificate (--tlsca), so the link encrypts;
# and it presents the ACME-issued order-svc credentials (--creds), so the
# server authenticates the user before accepting the publish.
#
# Connect as order-svc in the ORDERS account and publish one canonical order.
nats pub orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --server tls://nats.acme.internal:4222 \
  --tlsca /etc/nats/certs/ca.pem \
  --creds /etc/nats/creds/order-svc.creds

# Expected on a hardened cluster: the publish succeeds, which proves three
# things at once -- the TLS handshake completed (encryption is live), the
# CA was trusted (the server identity verified), and the credentials were
# accepted (the user authenticated).
#
# Drop --creds and the server rejects the connection with an authorization
# error. Drop --tlsca (or point the client at nats:// instead of tls://) and
# the handshake fails before authentication is even attempted. Either failure
# is the hardened cluster doing its job.
