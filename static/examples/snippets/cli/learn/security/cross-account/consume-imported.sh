#!/bin/sh
# analytics-reader (in ANALYTICS) subscribes to the imported orders.shipped
# while order-svc (in ORDERS) publishes it. The export/import pair makes the
# message cross the account boundary.
#
# Assumes the server config from this page: ORDERS exports the stream
# "orders.shipped" and ANALYTICS imports it from ORDERS.

# Context for analytics-reader in the ANALYTICS account.
nats context save analytics \
  --server nats://localhost:4222 \
  --user analytics-reader \
  --password an4lytics

# Context for order-svc in the ORDERS account.
nats context save orders \
  --server nats://localhost:4222 \
  --user order-svc \
  --password s3cr3t

# Subscribe as analytics-reader to the imported subject (background).
nats --context analytics sub "orders.shipped" &
SUB_PID=$!
sleep 1

# Publish a shipment as order-svc in ORDERS.
nats --context orders pub orders.shipped \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'

sleep 1
kill "$SUB_PID"

# Expected (subscriber terminal): the message arrives even though it was
# published in a different account, because ORDERS exports orders.shipped
# and ANALYTICS imports it.
#   [#1] Received on "orders.shipped"
#   {"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}
