#!/bin/sh
# Connect and publish as order-svc over mutual TLS.
# The client still trusts the CA (--tlsca), but now also presents its own
# certificate (--tlscert) and private key (--tlskey). With verify_and_map
# on the server, the certificate's subject CN=order-svc,O=Acme IS the
# NATS user — no password, no creds file.

nats pub orders.shipped \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --server tls://nats.acme.internal:4222 \
  --tlsca /etc/nats/certs/ca.pem \
  --tlscert /etc/nats/certs/order-svc-cert.pem \
  --tlskey /etc/nats/certs/order-svc-key.pem

# Expected output:
#   14:23:05 Published 91 bytes to "orders.shipped"
