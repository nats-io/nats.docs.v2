#!/bin/bash
# Read the live state of the shipping consumer on the ORDERS stream.
# The state numbers tell you lag, in-flight, and redelivery at a glance.
nats consumer info ORDERS shipping

# For a machine-readable copy of the same fields, ask for JSON and pick
# out the ones that describe how far behind the consumer is.
nats consumer info ORDERS shipping --json | \
  jq '{num_pending, num_ack_pending, num_redelivered, delivered, ack_floor}'
