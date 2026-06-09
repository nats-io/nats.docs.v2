#!/bin/bash
# Bound the warehouse subscription's pending buffer.
#
# Pending limits cap how many messages and bytes the client holds in one
# subscription's in-memory pending buffer before it starts dropping the
# overflow. They are a client-library call (SetPendingLimits and friends),
# so there is no CLI flag for them — the closest the CLI does is a plain
# async subscribe, shown here. The other tabs carry the actual limit.
#
# To see the buffer fill, flood orders.> faster than a handler can drain
# it; against this subscriber the pending count climbs until it overflows.

nats sub "orders.>" \
  --server "nats://n1:4222,nats://n2:4222,nats://n3:4222" \
  --connection-name warehouse
