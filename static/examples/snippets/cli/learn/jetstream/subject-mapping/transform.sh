#!/bin/bash

# A subject transform rewrites the subject a message is STORED under, which
# is separate from the subjects the stream listens on. Leave ORDERS alone:
# this is a throwaway stream that ingests on ingest.* and shards each
# message into one of three buckets by hashing the customer token.
#   --transform-source        which incoming subjects to match (wildcards ok)
#   --transform-destination    the stored subject, pulling matched tokens in
#     {{partition(3,1)}}   hash the 1st token into bucket 0, 1, or 2
#     {{wildcard(1)}}      the 1st * token from the source
nats stream add ORDERS-SHARDED \
  --subjects "ingest.*" \
  --transform-source "ingest.*" \
  --transform-destination "orders.{{partition(3,1)}}.{{wildcard(1)}}" \
  --defaults
