#!/bin/bash
# Raise the ORDERS stream to three replicas (R3) on the `east` cluster, then
# read back the Cluster Information showing the stream leader and its peers.
#
# This assumes the three `east` servers are running and JetStream is enabled on
# each:
#   nats-server -c n1-east.conf
#   nats-server -c n2-east.conf
#   nats-server -c n3-east.conf
#
# Point the CLI at any server in the cluster; the cluster routes the request to
# wherever it needs to go.
export NATS_URL="nats://127.0.0.1:4222,nats://127.0.0.1:4223,nats://127.0.0.1:4224"

# Create ORDERS as an R3 stream (or, if it already exists from the JetStream
# chapter, raise its replica count with `nats stream edit ORDERS --replicas=3`).
nats stream add ORDERS \
  --subjects "orders.>" \
  --replicas=3 \
  --defaults

# Inspect the result. On a cluster the report gains a Cluster Information
# section naming the cluster, the stream's own Raft group, the stream LEADER
# (where every write lands), and the follower Replicas with their status.
nats stream info ORDERS

# Expected Cluster Information section:
#
# Cluster Information:
#
#                  Name: east
#         Cluster Group: S-R3F-xK2p9aLm
#                Leader: n1-east
#               Replica: n3-east, current, seen 0.00s ago
#               Replica: n2-east, current, seen 0.00s ago
