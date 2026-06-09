#!/bin/bash
# Read the R3 ORDERS stream's replicas and current leader.
# Run this BEFORE you start the upgrade, and again AFTER each node rejoins,
# to confirm the stream stayed at 3 replicas and the leader moved as expected.
nats stream info ORDERS \
  --server tls://nats.acme.internal:4222 \
  --creds /etc/nats/creds/order-svc.creds

# Look for the Cluster section in the output:
#   Replicas: 3                        the R3 ORDERS stream has 3 copies
#   Leader:   nats-1                    the node currently coordinating writes
#   Replica:  nats-0, current, ...      a healthy follower, caught up
#   Replica:  nats-2, current, ...      a healthy follower, caught up
#
# Upgrade rule: every replica must read "current" before you take the next
# node down. A replica that lags ("outdated") is still catching up, so
# pausing on it keeps the stream at full R3 the whole way through.
