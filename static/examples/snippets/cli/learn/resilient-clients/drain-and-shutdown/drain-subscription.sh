#!/bin/bash
# Rotating one queue-group member out without dropping its in-flight
# orders is a per-subscription drain: unsubscribe, finish the messages
# already buffered for that subscription, and leave the connection and
# every other subscription alive.
#
# The CLI cannot express it -- `nats sub` holds exactly one subscription
# and Ctrl-C closes rather than drains. This runs one warehouse member
# of the queue group; the drain call that rotates it out is a
# client-library call.

nats sub "orders.>" \
  --queue warehouse \
  --server nats://n1:4222 \
  --connection-name warehouse-2
