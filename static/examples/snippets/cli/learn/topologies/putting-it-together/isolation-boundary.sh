#!/bin/bash
# Prove that a leaf is an isolation boundary, not a leak.
#
# factory-1 binds to one account on the east hub. A service that lives
# only in east is NOT reachable from the factory floor unless that
# account explicitly imports its subject. The request comes back with
# "No responders are available" instead of silently crossing the leaf.

# 1. In east, start a responder for an east-only admin service.
#    (Run this against any east server; it stays inside east's account.)
nats reply 'admin.east.ping' 'pong from east' &

# 2. From a factory-1 edge client, try to reach that east-only service.
#    The factory account does not import admin.east.*, so the request
#    finds no responder across the leaf boundary.
nats --server nats://factory-1.local:4222 request 'admin.east.ping' '' --timeout 2s
# Output: No responders are available

# 3. Now reach the subject the boundary DOES share. The ORDERS workload
#    crosses the leaf because the factory account imports orders.*, so
#    publishing an order from the edge lands in the east ORDERS stream.
nats --server nats://factory-1.local:4222 publish 'orders.created' '{
  "order_id": "ord_8w2k",
  "customer": "acme-co",
  "total_cents": 4200,
  "ts": "2026-05-22T10:14:22Z"
}'

# The lesson: only the agreed-upon subjects (orders.*) cross the leaf.
# Everything else on the factory floor stays local by default.
