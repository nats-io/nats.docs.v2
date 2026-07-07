#!/bin/bash

# Place the ORDERS stream on servers carrying specific tags.
#
# This assumes the 3-server "east" cluster from forming-a-cluster is
# running, that ORDERS already exists at R=3, and that n1-east, n2-east,
# n3-east each advertise the tags region:us-east and disk:ssd via
# server_tags in their config.

# ORDERS already exists, so change its placement with edit. --tag is
# passed once per required tag; the match is an intersection, so every
# listed tag must be present on a server for it to qualify. Matching
# folds case (ssd == SSD) but spelling is exact.
#
# --cluster names the cluster every replica must live in. In a single
# cluster like "east" it is a no-op (there is only one cluster), but it
# is shown here so the syntax is familiar when you place across clusters
# later. The match is an intersection of cluster AND tags.
nats stream edit ORDERS \
  --cluster east \
  --tag region:us-east \
  --tag disk:ssd \
  -f
# The CLI prints the config diff, then:
#   Stream ORDERS was updated
#   ...
#             Placement Cluster: east
#                Placement Tags: region:us-east, disk:ssd

# Creating a fresh stream takes the same flags:
#
#   nats stream add ORDERS --subjects "orders.>" --replicas 3 \
#     --cluster east --tag region:us-east --tag disk:ssd --defaults

# Read the result. The Cluster Information block names the leader and
# the two other peers — every one of them is a server you tagged.
nats stream info ORDERS
# Cluster Information:
#
#                          Name: east
#                 Cluster Group: S-R3F-jF1m3dMO
#                        Leader: n3-east (35.34s)
#                       Replica: n1-east, current, seen 341ms ago
#                       Replica: n2-east, current, seen 342ms ago

# Publish the canonical order to confirm the placed stream accepts
# writes exactly as before — placement changes where, not what.
nats pub orders.created --jetstream \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
# Stored in Stream: ORDERS Sequence: 16
