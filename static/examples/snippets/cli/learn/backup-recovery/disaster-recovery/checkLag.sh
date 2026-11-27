#!/bin/bash

# Before you promote the ORDERS mirror on west, read how far it got.
# A mirror follows its upstream over the network, so at any moment it
# can be behind. Its Mirror Information shows by how much, and how
# recently it heard from the upstream.

# Point at west, where the ORDERS mirror lives.
nats --context west stream info ORDERS

# Look at the Mirror block in the output:
#
#   Mirror Information:
#
#            Stream Name: ORDERS
#           External API: $JS.east.API
#                    Lag: 0
#              Last Seen: 1.2s
#
# Read Last Seen first. A small Last Seen with Lag: 0 means the mirror
# holds everything the upstream had: it is safe to promote.
#
# If east is gone, Last Seen keeps growing and Lag keeps the value it
# had when the last message arrived, often 0. That 0 doesn't mean the
# mirror is complete: whatever east stored after Last Seen is lost, and
# the mirror can't tell how much that is. Note the last sequence and
# the Last Seen time as your recovery point, then promote.
