#!/bin/bash

# Create a throwaway CACHE bucket to show the three bucket-level limits.
# We use CACHE, not the pinned INVENTORY bucket, on purpose: INVENTORY's
# TTLs are per-key, not bucket-wide, and we do not want to imply the whole
# INVENTORY bucket expires.
#
#   --ttl 1h            bucket-wide max age: every value older than 1h is
#                       removed, regardless of key. This is the bucket's
#                       MaxAge, not a per-key TTL.
#   --max-bucket-size   the bucket's total size cap, in bytes.
#   --max-value-size    the largest a single value may be, in bytes.
nats kv add CACHE \
  --history 1 \
  --ttl 1h \
  --max-bucket-size 16MB \
  --max-value-size 64KB

# Expected output ends with the configured limits, e.g.
#
#   CACHE Key-Value Store
#
#   Configuration:
#         Bucket Name: CACHE
#             History: 1
#                 TTL: 1h0m0s
#       Max Bucket Size: 16 MiB
#        Max Value Size: 64 KiB
#     ...
#
# A bucket at its size cap discards the OLDEST value to make room for a new
# one (discard 'new' is not used here) — size the bucket for the working
# set, not the average, or live values fall off the back.
