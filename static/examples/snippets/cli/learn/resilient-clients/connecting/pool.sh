#!/bin/bash
# Open order-svc against a server pool instead of a single server.
#
# Pass every server URL the client may connect to, comma-separated. The
# client picks one at random by default; if the first dial fails it tries
# the next. That is failover at connect time, before a single message is
# sent.
#
# --connection-name labels the connection. The CLI does not expose the
# connect-timeout knob; in a client library, set the timeout that bounds
# how long each dial may block.

nats pub orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --server "nats://n1:4222,nats://n2:4222,nats://n3:4222" \
  --connection-name order-svc
