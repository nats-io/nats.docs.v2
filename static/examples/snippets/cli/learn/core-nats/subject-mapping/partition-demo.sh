#!/bin/bash

# Deterministic partitioning across three packer pools.
#
# The server (server.conf) maps:
#   orders.created.*  ->  orders.created.{{partition(3, 1)}}.{{wildcard(1)}}
# so every order id hashes to a fixed bucket: 0, 1, or 2. The same id always
# lands in the same bucket.
#
# Open one subscriber per bucket, each in its own terminal. A real pool would
# add --queue to share a bucket across several packers; one subscriber per
# bucket is enough to see the split.

# Terminal 1 — bucket 0
nats sub "orders.created.0.*"

# Terminal 2 — bucket 1
nats sub "orders.created.1.*"

# Terminal 3 — bucket 2
nats sub "orders.created.2.*"

# Terminal 4 — publish three orders with the id as the last token.
# ord_8w2k hashes to bucket 0, ord_7mn3 to bucket 1, ord_2zr9 to bucket 2.
nats pub orders.created.ord_8w2k '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
nats pub orders.created.ord_7mn3 '{"order_id":"ord_7mn3","customer":"globex","total_cents":7800,"ts":"2026-05-22T10:14:25Z"}'
nats pub orders.created.ord_2zr9 '{"order_id":"ord_2zr9","customer":"initech","total_cents":1500,"ts":"2026-05-22T10:14:29Z"}'
