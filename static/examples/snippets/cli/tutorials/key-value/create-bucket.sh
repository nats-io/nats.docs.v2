#!/bin/bash
# Create a Key-Value bucket called profiles. A bucket is where your
# values live.

nats kv add profiles

# You should see a confirmation ending with the bucket name and config:
#
#   profiles Key-Value Store
#
#   Configuration:
#       Bucket Name: profiles
#           History: 1
#               TTL: 0s
#         Max Value Size: unlimited
#        Maximum Values: unlimited
#     ...
