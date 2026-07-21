#!/bin/bash
# Drain has a deadline. If in-flight handlers do not finish within the
# drain timeout (default 30s in nats.go), the remaining queued messages
# are discarded and the connection closes anyway, surfacing a
# drain-timeout error.
#
# The CLI does not expose a separate drain-timeout flag -- its global
# --timeout bounds how long a single operation waits. The point this
# snippet stands in for lives in client code: size the drain timeout to your
# slowest handler so a clean shutdown does not silently drop work.
#
# This publishes the canonical order event with a generous operation
# timeout so a slow handshake is not cut off mid-flush.

nats pub orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --server nats://n1:4222 \
  --connection-name order-svc \
  --timeout 30s
