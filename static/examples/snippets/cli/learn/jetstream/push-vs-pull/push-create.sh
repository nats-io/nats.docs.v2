#!/bin/bash
# Create a push consumer for contrast only — push consumers are deprecated.
# --target sets the deliver subject, which is what makes a consumer push-based.
# The CLI prints a deprecation warning before creating it.
# New code should use a pull consumer instead: nats consumer add ORDERS shipping --pull
nats consumer add ORDERS legacy-notify \
  --target push.orders.notify \
  --ack explicit \
  --heartbeat 5s
