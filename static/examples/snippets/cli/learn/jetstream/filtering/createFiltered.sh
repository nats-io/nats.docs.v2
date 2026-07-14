#!/bin/bash

# Add a second consumer to the ORDERS stream that reads only orders.shipped.
# The --filter flag pins the consumer to a single subject.
nats consumer add ORDERS analytics \
  --filter "orders.shipped" \
  --pull \
  --ack explicit \
  --defaults

# Inspect it — the config now shows a Filter Subject line.
nats consumer info ORDERS analytics

# Pull from analytics: only the orders.shipped message comes back.
# orders.created messages are skipped for this consumer.
nats consumer next ORDERS analytics --count 1
