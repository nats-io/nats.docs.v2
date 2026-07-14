#!/bin/bash
# Read the LIVE server limits for one node of the east cluster.
# These are per-server ceilings: payload size, connection cap, and the
# JetStream memory/store limits the node was started with.
#
# `nats server info` is a system-account request, so authenticate with the
# system account's creds, not the ORDERS-account user creds.
nats server info n1-east \
  --server tls://nats.acme.internal:4222 \
  --creds /etc/nats/creds/sys.creds

# Look for these in the output:
#   Maximum Payload:     max_payload (default 1.0 MiB) — the largest single message
#   Maximum Connections: max_connections (default 64K, i.e. 65,536)
#   JetStream:           Max Memory and Max Storage configured on this node
#
# Sizing rule: max_payload must be <= max_pending. Keep max_pending at
# >= 10x your peak message size so a burst of large orders does not stall
# the connection. The ORDERS payload is well under 1 KiB, so the 1 MiB
# default has ample headroom here.
