#!/bin/bash

# Diagnose a leaf that connected but bound to the wrong account.
# The link is up, yet a request from the factory floor to a hub
# service comes back with "no responders" — because the leaf's
# interest joined a different account than the responders live in.
#
# This assumes the hub (n1-east, listening for leaves on 7422) and
# the leaf (factory-1) are both running, with a hub service that
# replies on orders.lookup in the ORDERS account. See leaf-config.sh
# for a runnable local stand-up.

# First, confirm which account the leaf actually bound to on the hub.
# The Account column is the binding from the remote — read it, do not
# assume it. If it does not say ORDERS, the remote's account field is
# wrong (or missing, in which case the leaf falls back to its own local
# default account, $G, instead of ORDERS).
nats --server nats://127.0.0.1:4222 server report leafnodes

# Now send a request from the factory floor, against the leaf (4322).
# --timeout bounds the wait so a wrong binding fails fast instead of
# hanging. With no-responders, the request returns immediately.
nats --server nats://127.0.0.1:4322 request orders.lookup \
  '{"order_id":"ord_8w2k"}' --timeout 2s

# If the binding is correct, the hub service replies and you see the
# response. If the leaf bound to the wrong account, you get:
#
#   nats: error: no responders are available for request
#
# The link is healthy but interest never matched: fix the remote's
# account field to "ORDERS", restart the leaf, and re-run.
