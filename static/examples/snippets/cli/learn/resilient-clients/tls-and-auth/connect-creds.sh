#!/bin/bash
# Connect order-svc by consuming a credentials file (.creds).
#
# The .creds file holds the order-svc user JWT and an nkey seed. The client
# loads it and signs the server's nonce automatically — no --user or
# --password. This chapter only CONSUMES the file; how it is issued belongs
# to the Security chapter.
#
# --creds points the CLI at the file. Most client libraries take the same
# path through their credentials-file loader; nats.js takes the file's bytes.

nats pub orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --server nats://n1:4222 \
  --connection-name order-svc \
  --creds order-svc.creds
