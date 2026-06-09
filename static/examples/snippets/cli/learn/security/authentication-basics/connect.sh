#!/bin/bash
# Connect as the centralized user `order-svc` in the ORDERS account and
# publish the canonical order message to orders.created.
#
# --user / --password send the credentials at connect time. The server
# matches them against its config user list, places the connection in
# the ORDERS account, and accepts the publish. Wrong credentials are
# rejected at connect time before any publish.
nats pub orders.created \
  --user order-svc \
  --password "s3cr3t-rotate-me" \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
