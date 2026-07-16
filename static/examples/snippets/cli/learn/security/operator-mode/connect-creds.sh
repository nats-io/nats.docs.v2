#!/bin/sh
# Publish an order as order-svc using the generated creds file.
# The creds file is the identity: no --user or --password is needed.
# The client presents the user JWT and signs the server's challenge with the nkey seed.
nats pub --creds order-svc.creds orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
