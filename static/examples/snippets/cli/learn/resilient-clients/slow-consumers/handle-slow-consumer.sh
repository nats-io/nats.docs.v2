#!/bin/bash
# Bound the buffer AND surface the overflow.
#
# Pending limits alone are half a fix: the buffer is bounded, but the
# dropped message is reported only through the connection's async error
# callback. The CLI does not expose either knob — both are client-library
# calls (SetPendingLimits plus the async-error handler) — so this stands
# in for them with a named async subscribe. In a client library you set the limit
# and wire a callback that logs the slow-consumer error loudly.
#
# Flood orders.> faster than the handler drains it to trigger the signal;
# the published events use the canonical order shape.

nats sub "orders.>" \
  --server "nats://n1:4222,nats://n2:4222,nats://n3:4222" \
  --connection-name warehouse
