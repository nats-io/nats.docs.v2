#!/bin/bash
# Try to make the ORDERS stream survive a server loss on a single server.
# Asking for 3 replicas needs 3 servers to hold them, so n1 rejects it.
# The server answers with: replicas > 1 not supported in non-clustered mode
nats --server nats://localhost:4222 stream add ORDERS \
  --subjects 'orders.*' \
  --storage file \
  --replicas 3 \
  --defaults

# Fix: ask for what one server can give — a single replica (R1).
# R1 survives a process restart (durable on disk), never the loss of n1.
# For real redundancy, grow to a cluster — see /learn/topologies/your-first-cluster.
nats --server nats://localhost:4222 stream add ORDERS \
  --subjects 'orders.*' \
  --storage file \
  --replicas 1 \
  --defaults
