#!/bin/bash

# Before you promote ORDERS_DR, read how far it trails the upstream.
# A mirror is eventually consistent: it follows its upstream over the
# network, so at any instant it can be a few messages behind. The Lag
# field is that gap, in messages. Promote a mirror with non-zero lag
# and you publish on top of a stream that is still missing tail
# messages.

# Point at site2, where the ORDERS_DR mirror lives.
nats --server nats://127.0.0.1:5222 stream info ORDERS_DR

# Look at the Mirror block in the output:
#
#   Mirror Information:
#
#            Stream Name: ORDERS
#                    Lag: 0
#              Last Seen: 1.2s
#
# Lag: 0 means the mirror has caught up to every message the upstream
# had at last contact — it is safe to promote. A non-zero Lag means
# messages are still in flight; wait and re-run until it reaches 0.
#
# Last Seen is how long ago the mirror last heard from the upstream. If
# the upstream site is already gone, Last Seen climbs and Lag freezes at
# whatever it was when contact dropped — that frozen Lag is your data
# loss, your actual RPO for this failover.
