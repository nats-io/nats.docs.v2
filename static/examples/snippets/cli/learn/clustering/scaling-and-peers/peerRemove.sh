#!/bin/bash

# Remove one peer from the ORDERS R=3 group, safely, then verify the
# new peer set before trusting the change.
#
# This assumes the east cluster (n1-east on 4222, n2-east on 4223,
# n3-east on 4224) is running and ORDERS is an R=3 stream that has just
# been migrated onto a fourth peer (n4-east). We now shrink back to
# three by dropping ONE peer and waiting for a leader before touching
# the next one. Never remove two peers from an R=3 group at once —
# that loses quorum and the stream goes leaderless.

# First, read the current peer set. The Cluster block lists the leader
# and every replica with its lag. Confirm there is a leader and that
# every replica's lag is 0 before you remove anything — a peer mid
# catchup is not safe to lean on.
nats --server nats://127.0.0.1:4222 stream info ORDERS

# Remove exactly one peer by name. The leader proposes the removal,
# commits it to the remaining quorum, and the dropped peer lets go of
# its RAFT subscriptions. The stream migrates to the smaller peer set.
nats --server nats://127.0.0.1:4222 stream cluster peer-remove ORDERS n4-east

# Verify. Re-read the Cluster block and confirm three things:
#   - n4-east is gone from the Replicas list,
#   - there is still a named Leader,
#   - the remaining replicas report lag 0.
#
# Only when a leader is back and lag is 0 is it safe to remove the
# next peer. If the stream shows "no leader", stop — you have lost
# quorum and must restore a peer, not remove another.
nats --server nats://127.0.0.1:4222 stream info ORDERS
