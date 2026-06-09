#!/bin/bash
# Mutual TLS where the client certificate IS the order-svc identity.
#
# Server config (nats-server.conf) — verify_and_map maps the client
# certificate's subject (RFC 2253 distinguished name) to a NATS user:
#
#   listen: "0.0.0.0:4222"
#   tls {
#     cert_file:      "/etc/nats/certs/server-cert.pem"
#     key_file:       "/etc/nats/certs/server-key.pem"
#     ca_file:        "/etc/nats/certs/ca.pem"
#     verify_and_map: true
#   }
#   authorization {
#     users = [
#       {
#         user: "CN=order-svc,O=Acme"
#         permissions: {
#           publish:   { allow: ["orders.>"] }
#           subscribe: { allow: ["_INBOX.>"] }
#         }
#       }
#     ]
#   }
#
# Start the server with that config:
nats-server -c nats-server.conf &

# order-svc presents ONLY its client certificate and key. No password,
# no token, no creds file. The server reads "CN=order-svc,O=Acme" from
# the certificate and applies that user's orders.> permissions.
nats pub orders.shipped \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --server tls://nats.acme.internal:4222 \
  --tlsca /etc/nats/certs/ca.pem \
  --tlscert /etc/nats/certs/order-svc-cert.pem \
  --tlskey /etc/nats/certs/order-svc-key.pem
