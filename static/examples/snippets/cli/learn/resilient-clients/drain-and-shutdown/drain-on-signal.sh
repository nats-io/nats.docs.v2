#!/bin/bash
# Shut a responder down cleanly: drain in-flight work on Ctrl-C, then close.
#
# `nats reply` installs an interrupt handler that calls Drain() when you
# press Ctrl-C. It unsubscribes, lets its in-flight requests finish, and
# then closes the connection -- the CLI's real equivalent of a client
# calling Drain(). (`nats sub` has no such handler: Ctrl-C just terminates
# the process and abandons any in-flight messages, the way an abrupt kill
# would.)
#
# Run this, send a few requests from another terminal
# (`nats req orders.lookup ...`), then press Ctrl-C. The reply handler
# finishes its in-flight work before the process exits.
#
# The client tabs (JS/Go/etc.) show the real Drain() call wired to a
# SIGTERM handler, which the CLI expresses through this Ctrl-C path.

nats reply "orders.lookup" \
  'order ord_8w2k: shipped' \
  --server nats://n1:4222 \
  --connection-name warehouse
