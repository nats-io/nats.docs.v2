#!/bin/bash
# A mirror is eventually consistent, not real-time. Read the Lag field
# before you trust the mirror to hold what the upstream just received.
# Lag 0 means fully caught up; a non-zero Lag means messages are still
# in flight from the upstream.
nats stream info ORDERS-ARCHIVE

# Mirror Information:
#
#           Stream Name: ORDERS
#                   Lag: 0
#             Last Seen: 1.20s
