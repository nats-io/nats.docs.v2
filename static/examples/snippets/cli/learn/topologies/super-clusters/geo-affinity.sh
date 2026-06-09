#!/bin/bash
# Geo-affinity: a queue subscriber in each region, order published in east stays local.
# Only when east has no worker does the order cross the gateway to west.
# Assumes the east+west super-cluster from gateway-config.sh is already running.

# Terminal 1: order worker in east (connect to an east server)
nats --server nats://127.0.0.1:4222 sub orders.created --queue order-workers

# Terminal 2: order worker in west (connect to a west server)
nats --server nats://127.0.0.1:4322 sub orders.created --queue order-workers

# Terminal 3: publish an order in east. With both workers up, the EAST worker
# answers every time — geo-affinity prefers the local queue subscriber, so the
# message never crosses the gateway.
nats --server nats://127.0.0.1:4222 pub orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'

# Now stop the east worker (Ctrl-C in Terminal 1) and publish again.
# With no local subscriber, geo-affinity falls through and the order crosses
# the gateway to the WEST worker — the nearest remote cluster by round-trip time.
nats --server nats://127.0.0.1:4222 pub orders.created \
  '{"order_id":"ord_9x3l","customer":"acme-co","total_cents":1800,"ts":"2026-05-22T10:16:05Z"}'
