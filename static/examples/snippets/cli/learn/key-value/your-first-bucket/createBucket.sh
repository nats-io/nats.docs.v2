#!/bin/bash
# Create the INVENTORY bucket. A bucket is created as a JetStream stream,
# so this one command sets up the backing stream KV_INVENTORY on the
# subjects $KV.INVENTORY.>.
#
# --history 1 keeps only the current value of each key. We raise this
# later on the history-and-revisions page; 1 is the default and is all
# the inventory service needs to start.

nats kv add INVENTORY --history 1

# Expected output ends with a line confirming the bucket was created:
#
#   INVENTORY Key-Value Store
#
#   Configuration:
#     Bucket Name: INVENTORY
#         History: 1
#     ...
