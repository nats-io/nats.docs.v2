#!/bin/bash
# Sources aggregate many streams into one. First, the three regional streams
# ALL-ORDERS will pull from — each owns its own subjects:
nats stream add ORDERS-US   --subjects 'us.orders.>'
nats stream add ORDERS-EU   --subjects 'eu.orders.>'
nats stream add ORDERS-APAC --subjects 'apac.orders.>'

# Create ALL-ORDERS as an aggregate of all three. A sourced stream can list
# several upstreams (a mirror takes exactly one). It needs no --subjects of
# its own.
nats stream add ALL-ORDERS --source ORDERS-US --source ORDERS-EU --source ORDERS-APAC

# Confirm. The Source Information section lists each upstream, with its own Lag.
nats stream info ALL-ORDERS

# Source Information:
#
#           Stream Name: ORDERS-US
#                   Lag: 0
#             Last Seen: 1.20s
#
#           Stream Name: ORDERS-EU
#                   Lag: 0
#             Last Seen: 1.20s
#
#           Stream Name: ORDERS-APAC
#                   Lag: 0
#             Last Seen: 1.20s
