#!/bin/bash
# Prove a client keeps working THROUGH a rolling upgrade.
# Run these two commands in two terminals and leave them running while you
# roll the nodes. The subscriber reconnects when its node enters lame-duck
# mode, and the publisher's order still lands in the ORDERS stream.

# Terminal 1 — warehouse subscribes to new orders and stays connected.
nats sub "orders.created" \
  --server tls://nats.acme.internal:4222 \
  --creds /etc/nats/creds/order-svc.creds

# Terminal 2 — order-svc publishes one order. It is captured by ORDERS and
# delivered to the warehouse subscriber even if a node is mid-upgrade.
nats pub orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --server tls://nats.acme.internal:4222 \
  --creds /etc/nats/creds/order-svc.creds

# What you should see: when a node enters lame-duck mode the subscriber logs
# a reconnect to another node, then keeps printing messages. No order is lost,
# because the R3 ORDERS stream still has a quorum on the two nodes that are up.
