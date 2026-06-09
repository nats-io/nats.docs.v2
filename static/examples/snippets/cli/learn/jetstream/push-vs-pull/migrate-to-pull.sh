#!/bin/bash
# Migrating an inherited push consumer to pull.
# The server refuses to flip a consumer between models in place:
#   nats consumer edit ... fails with "can not update push consumer to pull based".
# Migration means delete the push consumer, then create a pull consumer in its place.

# 1. Remove the inherited push consumer.
nats consumer rm ORDERS legacy-notify --force

# 2. Recreate it as a pull consumer — the same form you use for shipping.
nats consumer add ORDERS legacy-notify \
  --pull \
  --ack explicit \
  --filter orders.shipped
