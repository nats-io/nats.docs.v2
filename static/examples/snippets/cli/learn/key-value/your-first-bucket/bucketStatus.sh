#!/bin/bash
# Ask the server about the bucket as a whole. Status reports the bucket's
# configuration and how many values it currently holds.

nats kv status INVENTORY

# Expected output reports the bucket name, history depth, value count, and
# the backing store:
#
#   INVENTORY Key-Value Store Status
#
#            Bucket Name: INVENTORY
#                History: 1
#                    TTL: 0s
#          Backing Store: JetStream
#     Backing Store Name: KV_INVENTORY
#                 Values: 1
#
# Backing Store Name names the stream under the bucket: KV_INVENTORY.
# That is the proof the bucket is a stream; the under-the-hood page opens
# it up.
