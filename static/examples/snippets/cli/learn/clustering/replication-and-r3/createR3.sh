#!/bin/bash
# Create the ORDERS stream as an R=3 stream on the `east` cluster, then publish
# one order and read back which server leads the stream and which servers hold
# the copies.
#
# This assumes the three `east` servers from the Topologies chapter are running,
# each with JetStream enabled:
#   nats-server -c n1-east.conf
#   nats-server -c n2-east.conf
#   nats-server -c n3-east.conf
#
# Point the CLI at any server in the cluster. The cluster routes the request to
# the stream leader wherever it currently lives.
export NATS_URL="nats://127.0.0.1:4222,nats://127.0.0.1:4223,nats://127.0.0.1:4224"

# Create ORDERS with three replicas. --replicas=3 is the only line that differs
# from the single-server create in the JetStream chapter. If ORDERS already
# exists at R=1, raise it instead: nats stream edit ORDERS --replicas=3
nats stream add ORDERS \
  --subjects "orders.>" \
  --replicas=3 \
  --defaults

# Publish one order as order-svc would. --jetstream makes this a JetStream
# publish that waits for a PubAck; the PubAck returns only after the leader
# has the write committed to a quorum (itself plus one follower). Plain
# `nats pub` is a core publish and would not wait for one.
nats pub --jetstream orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'

# Confirm the replica count and the cluster layout that R=3 produced.
nats stream info ORDERS

# Expected Cluster Information section:
#
# Cluster Information:
#
#                  Name: east
#         Cluster Group: S-R3F-xK2p9aLm
#                Leader: n1-east
#               Replica: n2-east, current, seen 0.00s ago
#               Replica: n3-east, current, seen 0.00s ago
