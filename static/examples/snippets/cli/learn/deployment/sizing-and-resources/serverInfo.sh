#!/bin/bash
# Read the LIVE server limits for one node of the east cluster.
# These are per-server ceilings: payload size, connection cap, and the
# JetStream memory/store limits the node was started with.
#
# Point at one node (here n1-east) and ask it about itself.
nats server info n1-east \
  --server tls://nats.acme.internal:4222 \
  --creds /etc/nats/creds/order-svc.creds

# Look for these in the output:
#   Max Payload:     max_payload (default 1.0 MiB) — the largest single message
#   Max Connections: max_connections (default unlimited)
#   JetStream:       Max Memory and Max Storage configured on this node
#
# Sizing rule: max_payload must be <= max_pending. Keep max_pending at
# >= 10x your peak message size so a burst of large orders does not stall
# the connection. The ORDERS payload is well under 1 KiB, so the 1 MiB
# default has ample headroom here.
