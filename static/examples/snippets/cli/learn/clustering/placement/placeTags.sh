#!/bin/bash

# Place the ORDERS stream on servers carrying specific tags.
#
# This assumes the 3-node "east" cluster is running with JetStream
# enabled, and that n1-east, n2-east, n3-east each advertise the tags
# region:us-east and disk:ssd via server_tags in their config. See the
# server config block on the placement page for the tag setup.

# Create ORDERS at R=3, constrained to servers carrying BOTH tags.
# --tag is passed once per required tag; the match is an intersection,
# so every listed tag must be present on a server for it to qualify.
# Tag matching folds case (ssd == SSD) but spelling is exact.
#
# --cluster names the cluster every replica must live in. In a single
# cluster like "east" it is a no-op (there is only one cluster), but it
# is shown here so the syntax is familiar when you place across clusters
# later. The match is an intersection of cluster AND tags.
nats --server nats://127.0.0.1:4222 stream add ORDERS \
  --subjects "orders.>" \
  --replicas 3 \
  --cluster east \
  --tag region:us-east \
  --tag disk:ssd \
  --defaults

# If ORDERS already exists, change its placement instead of recreating
# it. The same flags apply on edit; the meta leader re-assigns the
# replicas to servers matching the new constraint.
#
#   nats --server nats://127.0.0.1:4222 stream edit ORDERS \
#     --cluster east --tag region:us-east --tag disk:ssd

# Read the result. The Cluster block names the leader and the two other
# peers — every one of them is a server you tagged.
nats --server nats://127.0.0.1:4222 stream info ORDERS

# Publish the canonical order to confirm the placed stream accepts
# writes exactly as before — placement changes where, not what.
nats --server nats://127.0.0.1:4222 pub orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
