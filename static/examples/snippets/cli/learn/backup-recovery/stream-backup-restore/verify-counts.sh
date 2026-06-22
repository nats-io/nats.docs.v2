#!/bin/bash

# A restore you did not verify is a restore you do not have. After
# rebuilding ORDERS, read its state back and confirm the message count
# and last sequence match what the snapshot claimed.
#
# nats stream info prints both halves of the stream: the configuration
# you asked for and the state actually on disk. The numbers under State
# are the ones to check against the source.

nats stream info ORDERS

# Look at the State block:
#
#   State:
#
#            Messages: 1,000
#               Bytes: 4.0 MiB
#       First Sequence: 1
#        Last Sequence: 1,000
#     Active Consumers: 2
#
# Messages and Last Sequence must match the live stream you snapshotted.
# Active Consumers should show shipping and analytics back (because the
# snapshot used --consumers). If Messages is lower than expected, the
# snapshot was taken under live writes that did not finish — snapshot a
# quiesced stream, or accept the snapshot's point in time as your RPO.
