#!/bin/bash

# Recovery for a hard site loss or an accidental delete: rebuild ORDERS
# from the last off-site snapshot. Restore recreates the stream byte
# for byte — same messages, same sequence numbers, same config, and
# (because this snapshot was taken with --consumers) the same shipping
# and analytics consumers at their saved delivery position.
#
# Do NOT recreate an empty ORDERS first. Restore creates the stream
# itself; an existing stream of the same name makes the restore fail.
# After an accidental delete, restore straight from the snapshot.

nats --server nats://127.0.0.1:4222 stream restore ./backups/orders/2026-06-04

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
#     Active Consumers: 2
#
# Then verify: the message count and last sequence must match what the
# snapshot held. Everything published after the snapshot was taken is
# gone — that gap is your recovery point. A snapshot you never test is
# a guess, so rehearse this restore on a schedule, not during the
# outage.
