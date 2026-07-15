#!/bin/bash

# A filter that matches no subject in the stream is accepted without error.
# Here the typo "orders.shiped" matches nothing in ORDERS (orders.>).
nats consumer add ORDERS analytics-typo \
  --filter "orders.shiped" \
  --pull \
  --ack explicit \
  --defaults

# The consumer exists and its config looks fine.
nats consumer info ORDERS analytics-typo

# But pulling delivers nothing — the request just times out.
# No error tells you the filter was wrong; the consumer is simply silent.
nats consumer next ORDERS analytics-typo --count 5 --timeout 2s

# Confirm the filter never matched: Delivered shows 0 of the stored orders.
nats consumer info ORDERS analytics-typo | grep -A1 "Delivery counts"
