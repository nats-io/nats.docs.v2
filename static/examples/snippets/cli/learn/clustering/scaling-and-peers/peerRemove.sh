#!/bin/bash

# Remove one peer from the ORDERS R=3 group, then verify what the
# migration actually did before touching the group again.
#
# Assumes the east cluster is running (n1-east 4222, n2-east 4223,
# n3-east 4224, plus n4-east 4232 currently holding a replica).

# First, read the current peer set. Confirm there is a leader and that
# every replica is "current" — a peer mid-catchup is not safe to lean on.
nats --server nats://127.0.0.1:4222 stream info ORDERS

# Remove exactly one peer by name. The group commits the removal and
# the dropped peer lets go of its RAFT subscriptions.
nats --server nats://127.0.0.1:4222 stream cluster peer-remove ORDERS n4-east
# 13:42:19 Removing peer "n4-east"
# 13:42:19 Requested removal of peer "n4-east"

# Verify. The slot is refilled, not deleted: the meta leader assigns a
# spare server into the vacated place, and that replacement catches up.
nats --server nats://127.0.0.1:4222 stream info ORDERS
# Cluster Information:
#
#                          Name: east
#                 Cluster Group: S-R3F-jF1m3dMO
#                        Leader: n3-east (46.77s)
#                       Replica: n1-east, current, seen 1.01s ago
#                       Replica: n2-east, outdated, seen 1.01s ago, 4,854 operations behind
#
# Three things must be true before the next change:
#   - there is a named Leader (a blank "Leader:" means no quorum — stop,
#     bring a server back, don't remove another peer),
#   - no replica reads OFFLINE (an OFFLINE replacement means the meta
#     leader had only a stopped server to assign — that copy doesn't exist),
#   - every replica reads "current".
#
# If no server is available to take the slot at all, the removal still
# commits but the CLI reports:
#   nats: error: peer remap failed (10075)
# and the group runs on fewer peers than R asks for — down to a single
# peer that still accepts writes. Treat that error as "out of servers",
# not as a step that half-worked.
