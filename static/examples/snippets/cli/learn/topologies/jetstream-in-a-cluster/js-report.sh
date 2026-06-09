#!/bin/bash
# Show the JetStream meta layer across the `east` cluster: the meta leader that
# coordinates stream/consumer placement, and where the ORDERS stream's copies
# landed.
#
# This assumes the three `east` servers are running with JetStream enabled.
# Point the CLI at any server in the cluster.
export NATS_URL="nats://127.0.0.1:4222,nats://127.0.0.1:4223,nats://127.0.0.1:4224"

# The cluster-wide JetStream report. The RAFT Meta Cluster Information block
# names the meta leader (the single server coordinating placement) and lists
# every JetStream server in the meta group.
nats server report jetstream

# Expected meta section:
#
# RAFT Meta Cluster Information
#
#    Cluster: east
#     Leader: n2-east
#    Replica: n2-east, current, leader
#    Replica: n1-east, current
#    Replica: n3-east, current

# Per-stream placement, from the stream's own point of view: the stream LEADER
# (often a different server than the meta leader) and its follower replicas.
nats stream info ORDERS
