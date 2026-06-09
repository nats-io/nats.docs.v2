#!/bin/bash

# Rebuild the ORDERS stream from a snapshot directory. Restore streams
# the tarball back into JetStream and recreates the stream byte for
# byte: same messages, same sequence numbers, same config, and — since
# this snapshot was taken with --consumers — the same shipping and
# analytics consumers at their saved delivery position.
#
# The stream must not already exist. Restore recreates it; it does not
# merge into a live stream.

nats stream restore ./backups/orders/2026-06-04

# Expected tail of the output:
#
#   Starting restore of Stream "ORDERS" from ./backups/orders/2026-06-04
#   ...
#   Restored stream "ORDERS" in 0.38s
#
#   Information for Stream ORDERS
#   ...
#            Messages: 1,000
#       First Sequence: 1
#        Last Sequence: 1,000
#
# Note: the stream name comes from backup.json. You cannot rename the
# stream on restore — if you need a copy under a new name, restore to
# the original name and then mirror or source it.
