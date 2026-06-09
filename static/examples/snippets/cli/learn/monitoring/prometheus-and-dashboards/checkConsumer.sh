#!/bin/bash
# Check the shipping consumer against an explicit lag threshold.
# This is the alerting side of monitoring: turn the num_pending number
# into a CRITICAL when more than 100 orders are waiting for delivery.
nats server check consumer --stream ORDERS --consumer shipping --unprocessed-critical 100

# Add a redelivery threshold so a poison order also trips the check.
# With the pinned snapshot (20 pending, 3 redelivered) both stay OK;
# raise the load until pending crosses 100 and the check returns CRITICAL.
nats server check consumer --stream ORDERS --consumer shipping \
  --unprocessed-critical 100 --redelivery-critical 10
