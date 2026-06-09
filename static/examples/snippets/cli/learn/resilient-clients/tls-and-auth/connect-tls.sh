#!/bin/bash
# Connect order-svc over a CA-validated TLS link, presenting its creds.
#
# --tlsca gives the client the cluster CA certificate. The client validates
# the server's certificate against it before sending a single byte of
# credentials, so the link is encrypted AND the server is authenticated.
# --creds then authenticates order-svc over that secure link.
#
# The client libraries take the same CA path and creds path through their
# TLS and credentials-file options (see the other tabs).

nats pub orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --server tls://n1.acme.internal:4222 \
  --connection-name order-svc \
  --tlsca cluster-ca.pem \
  --creds order-svc.creds
