#!/bin/bash

# Watch an order cross the leaf link from the east hub down to the
# factory floor. factory-1 dials the east cluster as a leaf node; an
# edge client subscribes on factory-1, a hub client publishes, and the
# message bridges across the single outbound leaf connection.
#
# This assumes the hub (n1-east, listening for leaves on 7422) and the
# leaf (factory-1, with a remote pointing at the hub) are both running.
# See leaf-config.sh for a runnable local stand-up of both.

# On the factory floor: subscribe to shipped orders, against the leaf.
# factory-1 serves local clients on its own port (here 4322 locally).
nats --server nats://127.0.0.1:4322 sub "orders.shipped" &
SUB_PID=$!

# Give the subscription a moment to register and bridge its interest
# up the leaf link to the hub.
sleep 1

# On the hub: publish a shipped order, against an east server (4222).
nats --server nats://127.0.0.1:4222 pub orders.shipped \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'

# The factory-floor subscriber receives it. The hub forwarded the
# message down the leaf link because the leaf carried the subscriber's
# interest up. Neither side opened a connection beyond the leaf link.
sleep 1
kill $SUB_PID 2>/dev/null
