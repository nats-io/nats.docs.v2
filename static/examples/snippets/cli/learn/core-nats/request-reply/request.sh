#!/bin/bash
# Ask the inventory service whether an order's item is in stock.
# `nats request` creates a private inbox, subscribes to it, publishes the
# order payload to orders.inventory.check with the inbox attached, and
# prints the first reply it receives.
#
# --timeout is required: it is the longest the client waits for an answer
# before giving up. If no service is subscribed, the server returns a
# "no responders" error immediately instead of waiting out the timeout.
nats request orders.inventory.check \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --timeout 2s
