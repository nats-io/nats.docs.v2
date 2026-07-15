#!/bin/bash
# Create a Key-Value bucket called profiles. A bucket is where your
# values live.

nats kv add profiles

# You should see a confirmation with the bucket name and config:
#
#   Information for Key-Value Store Bucket profiles created 2026-06-09 10:13:41
#
#   Configuration:
#
#              Bucket Name: profiles
#             History Kept: 1
#                      ...
#       Backing Store Kind: JetStream
