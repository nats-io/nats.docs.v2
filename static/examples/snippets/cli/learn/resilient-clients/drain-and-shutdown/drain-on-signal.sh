#!/bin/bash
# Where the Drain() call belongs on shutdown, shown with `nats reply`.
#
# `nats reply` installs an interrupt handler that calls Drain() when you
# press Ctrl-C -- the right place for the call. It exits as soon as Drain()
# returns, though, without waiting for the drain to complete (nats.go drains
# in the background), so use it to see where the drain call belongs rather
# than to observe a finished drain. (`nats sub` has no such handler: Ctrl-C
# just terminates the process and abandons any in-flight messages.)
#
# The client tabs (JS/Go/etc.) show the full pattern: Drain() wired to a
# SIGTERM handler that waits for CLOSED before the process exits.

nats reply "orders.lookup" \
  'order ord_8w2k: shipped' \
  --server nats://n1:4222 \
  --connection-name warehouse
