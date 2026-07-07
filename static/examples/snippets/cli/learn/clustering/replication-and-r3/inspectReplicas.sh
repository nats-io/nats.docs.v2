#!/bin/bash
# Read the Cluster block of `nats stream info` to check that every copy of
# ORDERS is current before trusting the stream. This is the handling step for
# the "a replica may lag" pitfall: do not assume all three copies hold the same
# data — read each replica's status and confirm it.
#
# Assumes the `east` cluster is running and ORDERS is an R=3 stream (see
# createR3.sh). Point the CLI at any server in the cluster.
export NATS_URL="nats://127.0.0.1:4222,nats://127.0.0.1:4223,nats://127.0.0.1:4224"

# Ask the cluster who leads ORDERS and how its followers are doing. The Cluster
# Information block names the Leader (every write lands there) and lists each
# Replica with its status.
nats stream info ORDERS

# Read the Cluster Information section carefully (your group suffix, leader,
# and ages differ):
#
# Cluster Information:
#
#                          Name: east
#                 Cluster Group: S-R3F-jF1m3dMO
#                        Leader: n3-east (1m22s)
#                       Replica: n1-east, current, seen 429ms ago
#                       Replica: n2-east, current, seen 429ms ago
#
# "current" means the follower has applied every committed entry — it is up to
# date with the leader. A healthy R=3 stream shows every Replica "current" with
# a small "seen" age.
#
# A follower that is down or catching up shows "outdated" and its lag in
# operations. Both lines below are real captures from a leader crash and the
# restart that followed:
#
#                       Replica: n1-east, outdated, not seen, 15 operations behind
#                       Replica: n1-east, outdated, seen 761ms ago, 16 operations behind
#
# If a replica is outdated, do not treat it as a current copy. Read from the
# leader for read-after-write, and wait for "current" before trusting that copy
# to survive a server loss. A persistent lag points at a slow disk or a saturated
# route between peers.
