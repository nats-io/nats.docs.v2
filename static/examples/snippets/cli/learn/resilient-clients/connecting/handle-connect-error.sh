#!/bin/bash
# Connecting can fail before any message moves. This script handles the case
# the page's pitfalls build up to: no server in the pool is reachable, so the
# connect itself fails.
#
# With the CLI, a failed connect prints the error and exits non-zero, so
# you can branch on it. The client libraries surface the same failures as
# an error you catch at connect time.

# A pool whose first URL is unreachable: the client tries the next one.
# If every dial fails, the command exits non-zero and prints the reason.
if nats pub orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --server "nats://n1:4222,nats://n2:4222,nats://n3:4222" \
  --connection-name order-svc; then
  echo "connected and published"
else
  echo "could not connect to any server in the pool" >&2
  exit 1
fi
