#!/bin/bash
# Server-side TLS for client connections, then a client publish over TLS.
#
# Server config (nats-server.conf) — the top-level tls {} block secures
# CLIENT connections only; cluster/leafnode/gateway have their own blocks:
#
#   listen: "0.0.0.0:4222"
#   tls {
#     cert_file: "/etc/nats/certs/server-cert.pem"
#     key_file:  "/etc/nats/certs/server-key.pem"
#     ca_file:   "/etc/nats/certs/ca.pem"
#     timeout:   2
#   }
#
# Start the server with that config:
nats-server -c nats-server.conf &

# order-svc connects over TLS and trusts the CA that signed the server cert.
# The client verifies the server identity before sending anything.
nats pub orders.shipped \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --server tls://nats.acme.internal:4222 \
  --tlsca /etc/nats/certs/ca.pem
