#!/bin/bash
# Audit a cluster for streams with no high availability and assert that ORDERS
# carries the replica count you expect.
#
# A stream created on a cluster still defaults to R1 (a single copy) unless you
# ask for more. An R1 stream has no quorum and no failover: lose the one server
# holding it and its data is gone. This script surfaces that before it bites.
#
# Assumes the three `east` servers are running with JetStream enabled:
#   nats-server -c n1-east.conf
#   nats-server -c n2-east.conf
#   nats-server -c n3-east.conf
export NATS_URL="nats://127.0.0.1:4222,nats://127.0.0.1:4223,nats://127.0.0.1:4224"

# List every stream with one replica or fewer. On a cluster, anything that shows
# up here has no HA — it is a single copy on a single server.
nats stream find --replicas=1

# Assert ORDERS is replicated across three servers. Exits non-zero (CRITICAL) if
# it is under-replicated, so you can wire it into a health check.
nats server check stream --stream=ORDERS --peer-expect=3

# If ORDERS turns up as R1, raise it to three copies and confirm.
nats stream edit ORDERS --replicas=3 --force
nats stream info ORDERS

# Expected: the find command prints nothing once every stream is replicated, and
# `server check` reports:
#
#   OK Stream | replicas=3
