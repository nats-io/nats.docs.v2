#!/bin/bash
# Open order-svc's connection to a single server and give it a name.
#
# The --connection-name flag labels the connection so it is identifiable
# in `nats server report connections`. Without it, the CLI connects under
# its default name (`NATS CLI Version <version>`), so you cannot tell
# order-svc apart from any other CLI run.
#
# This publishes the canonical order event once the connection is up.

nats pub orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --server nats://n1:4222 \
  --connection-name order-svc
