#!/bin/bash

# Move a replica of the ORDERS R=3 group onto a new server (n4-east).
#
# Assumes the east cluster (n1-east 4222, n2-east 4223, n3-east 4224)
# is running with ORDERS at R=3, and n4-east (client 4232, route 6232)
# has just been started and joined the cluster via gossip:
#
#   nats-server -c n4-east.conf &

# Catchup is only visible when there is history to copy, so first fill
# the stream with a backlog of about 5,000 orders:
nats --server nats://127.0.0.1:4222 pub --jetstream orders.created --count 5000 \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'

# There is no stream-level peer-add command. You free a slot instead:
# remove one current peer, and the meta leader assigns the spare server
# (n4-east, the only server not already in the group) into its place.
nats --server nats://127.0.0.1:4222 stream cluster peer-remove ORDERS n2-east
# 13:41:57 Removing peer "n2-east"
# 13:41:57 Requested removal of peer "n2-east"

# Read the group back right away to catch the catchup in flight. The
# new peer replaces the removed one (still three entries, not four) and
# reports "outdated" with an operations-behind count while the leader
# streams it the missing entries:
nats --server nats://127.0.0.1:4222 stream info ORDERS
# Cluster Information:
#
#                          Name: east
#                 Cluster Group: S-R3F-jF1m3dMO
#                        Leader: n3-east (25.20s)
#                       Replica: n1-east, current, seen 202ms ago
#                       Replica: n4-east, outdated, seen 195ms ago, 4,853 operations behind

# Catchup for 5,000 messages finishes in a couple of seconds locally,
# so a second read usually shows the new peer current with no lag.
# Only then does it count toward quorum like any other peer.
nats --server nats://127.0.0.1:4222 stream info ORDERS
# Cluster Information:
#
#                          Name: east
#                 Cluster Group: S-R3F-jF1m3dMO
#                        Leader: n3-east (29.11s)
#                       Replica: n1-east, current, seen 115ms ago
#                       Replica: n4-east, current, seen 115ms ago
