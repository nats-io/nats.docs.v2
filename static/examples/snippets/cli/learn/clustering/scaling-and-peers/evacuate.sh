#!/bin/bash

# Move a replica off one server, safely, then verify the new peer set
# before trusting the change.
#
# This assumes the east cluster (n1-east on 4222, n2-east on 4223,
# n3-east on 4224, plus a fourth server n4-east) is running and ORDERS
# holds a replica on n4-east. Evacuating does NOT shrink the stream: it
# moves the replica off n4-east onto another qualifying server, so the
# replica count stays the same. Make ONE change at a time and wait for a
# leader and a caught-up replacement before the next -- stacking changes
# can drop the peers holding the data below a majority and the stream
# stops committing.

# First, read the current peer set. The Cluster block lists the leader
# and every replica with its lag. Confirm there is a leader and that
# every replica's lag is 0 before you change anything — a peer mid
# catchup is not safe to lean on.
nats --server nats://127.0.0.1:4222 stream info ORDERS

# Move the replica off one server by name. The meta leader picks a
# replacement server and records the new peer set, but n4-east does not
# drop out yet: it keeps serving the stream while the replacement joins
# and catches up, and only then does the change removing it commit.
#
# If no other server qualifies -- placement is too narrow, or the cluster
# is too small -- the request fails with "peer remap failed" and NOTHING
# moves. That refusal protects the replica count; fix the placement or
# add a qualifying server, then run this again. Do not reach for --force.
#
# (To change the replica COUNT, use: nats stream edit ORDERS --replicas=N)
nats --server nats://127.0.0.1:4222 stream cluster evacuate ORDERS n4-east

# A single consumer can be moved on its own the same way:
#
#   nats --server nats://127.0.0.1:4222 consumer cluster evacuate ORDERS NEW n4-east

# Verify. Run this while the move is in flight and you see it in
# progress: both peers listed, the replacement behind on lag, and a
# "(pending)" marker on the peer joining or on its way out.
#
# The move is done when n4-east is gone from the Replicas list and the
# migration section is no longer printed. Do not wait on lag reaching 0
# instead: a stream taking constant writes always has followers slightly
# behind, since a write commits once a quorum holds it.
#
# If the move looks stuck, the migration section carries a status line
# saying what it is waiting on.
nats --server nats://127.0.0.1:4222 stream info ORDERS
