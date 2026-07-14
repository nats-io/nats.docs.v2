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

# Expected output is the bucket's status. The CLI parses MB and KB as binary
# units (1 MB = 1 MiB, 1 KB = 1 KiB), so 16MB shows as 16 MiB and 64KB as
# 64 KiB (labels abbreviated here):
#
#   Information for Key-Value Store Bucket CACHE created <time>
#
#   Configuration:
#
#              Bucket Name: CACHE
#              History Kept: 1
#               Maximum Age: 1h0m0s
#       Maximum Bucket Size: 16 MiB
#        Maximum Value Size: 64 KiB
#     ...
#
# A KV bucket uses discard-new: a put that would push it past
# --max-bucket-size, or a value larger than --max-value-size, is rejected
# with an error and the existing values are kept. Size the bucket for the
# working set you need to hold, not the average, so a burst doesn't bounce
# writes.
