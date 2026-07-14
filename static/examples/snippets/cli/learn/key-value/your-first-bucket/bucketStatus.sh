#!/bin/bash
# Ask the server about the bucket as a whole. Status reports the bucket's
# configuration and how many values it currently holds.

nats kv status INVENTORY

# Expected output reports the bucket name, history depth, value count, and
# the backing stream (labels abbreviated here):
#
#   Information for Key-Value Store Bucket INVENTORY created <time>
#
#   Configuration:
#
#              Bucket Name: INVENTORY
#              History Kept: 1
#             Values Stored: 1
#        Backing Store Kind: JetStream
#          JetStream Stream: KV_INVENTORY
#
# The "JetStream Stream" line names the stream under the bucket:
# KV_INVENTORY. That is the proof the bucket is a stream; the
# under-the-hood page opens it up.
