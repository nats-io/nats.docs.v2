#!/bin/bash

# A typo in the queue group name silently creates a SECOND group.
# The server matches members by the exact name string, so "packers" and
# "packer" are two different groups on the same subject. There is no
# warning -- both subscriptions succeed.
#
# To see it, run these two subscribers in separate terminals. Note the
# mismatched names: one says "packers", the other "packer".
nats sub orders.created --queue packers   # terminal 1: group "packers"
nats sub orders.created --queue packer    # terminal 2: group "packer" (typo)

# Now publish the same test order three times from a third terminal:
#   nats pub orders.created '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' --count 3
#
# Each order is delivered to ONE member of EACH group, so BOTH terminals
# print every order -- the work is double-handled, not load-balanced.
# Fix: give every member the byte-for-byte identical group name.
