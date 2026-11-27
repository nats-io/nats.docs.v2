#!/bin/bash

# On west: create the shipping consumer on the ORDERS mirror, paused.
# shipping.json is the same consumer config you use on east, plus a
# pause_until far in the future, for example:
#
#   {
#     "durable_name": "shipping",
#     "deliver_policy": "all",
#     "ack_policy": "explicit",
#     "filter_subject": "orders.shipped",
#     "pause_until": "2099-01-01T00:00:00Z"
#   }
nats --context west consumer add ORDERS shipping --config shipping.json

# The consumer exists but delivers nothing while it's paused.
nats --context west consumer info ORDERS shipping
