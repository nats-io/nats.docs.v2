#!/bin/bash
# Shut a subscriber down cleanly: drain in-flight work, then close.
#
# The nats CLI honors SIGINT (Ctrl-C) cleanly. When you press Ctrl-C,
# `nats sub` unsubscribes, lets the messages already in its buffer finish
# printing, and then closes the connection — the CLI's equivalent of a
# client calling Drain(). It does not abandon in-flight messages the way
# an abrupt kill would.
#
# Run this, publish a few orders.created events from another terminal,
# then press Ctrl-C. The last delivered messages are handled before exit.
#
# The client tabs (JS/Go/etc.) show the real Drain() call wired to a
# SIGTERM handler, which the CLI cannot express directly.

nats sub "orders.>" \
  --server nats://n1:4222 \
  --connection-name warehouse
