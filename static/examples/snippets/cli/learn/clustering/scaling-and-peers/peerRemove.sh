#!/bin/bash

# Move a replica off one server, safely, then verify the new peer set
# before trusting the change.
#
# This assumes the east cluster (n1-east on 4222, n2-east on 4223,
# n3-east on 4224, plus a fourth server n4-east) is running and ORDERS
# holds a replica on n4-east. peer-remove does NOT shrink the stream: it
# evicts the replica from n4-east and the meta leader re-places it on
# another qualifying server, so the replica count stays the same. Make
# ONE change at a time and wait for a leader and a caught-up replacement
# before the next — stacking changes can drop the peers holding the data
# below a majority and the stream stops committing.

# First, read the current peer set. The Cluster block lists the leader
# and every replica with its lag. Confirm there is a leader and that
# every replica's lag is 0 before you change anything — a peer mid
# catchup is not safe to lean on.
nats --server nats://127.0.0.1:4222 stream info ORDERS

# Evict the replica from one server by name. The meta leader picks a
# replacement server, updates the stream assignment, and n4-east drops
# its RAFT subscriptions. If no other server qualifies, an R>1 stream is
# still left a peer short: the server evicts the peer and returns "peer
# remap failed" (only a single-replica stream is refused outright).
# (To change the replica COUNT, use: nats stream edit ORDERS --replicas=N)
nats --server nats://127.0.0.1:4222 stream cluster peer-remove ORDERS n4-east

# Verify. Re-read the Cluster block and confirm three things:
#   - n4-east is gone from the Replicas list,
#   - there is still a named Leader,
#   - the replacement replica is catching up (and reaches lag 0).
#
# Only when a leader is back and the replacement is current is it safe to
# make the next change. If the stream shows "no leader", stop — you have
# lost quorum and must restore a peer, not make another change.
nats --server nats://127.0.0.1:4222 stream info ORDERS
