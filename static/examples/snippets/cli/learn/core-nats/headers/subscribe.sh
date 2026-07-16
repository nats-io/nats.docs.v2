#!/bin/bash
# Subscribe to orders.created and watch the headers arrive. nats sub prints
# each header as a Key: Value line, then a blank line, then the body. Run the
# publish snippet in another terminal to produce output like this (the two
# header lines can print in either order):
#
#   [#1] Received on "orders.created"
#   Content-Type: application/json
#   Acme-Request-Id: req_7f3c9a
#
#   {"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}
#
# Add --headers-only to print just the headers and skip the body, handy for
# inspecting metadata on a busy subject.
nats sub orders.created
