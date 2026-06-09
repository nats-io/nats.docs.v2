#!/bin/bash
# Prove that two accounts never see each other's traffic.
#
# This uses the minimal two-account nats.conf from the page:
#
#   accounts {
#     ORDERS    { users = [ { user: "order-svc",        password: "s3cret"   } ] }
#     ANALYTICS { users = [ { user: "analytics-reader", password: "an4lytics" } ] }
#   }
#
# Start the server with that config in another terminal:
#   nats-server -c nats.conf

# 1. The analytics reader (in ANALYTICS) subscribes to orders.shipped.
#    Leave this running in its own terminal. It will receive nothing.
nats sub --user analytics-reader --password an4lytics "orders.shipped"

# 2. The order service (in ORDERS) publishes a shipment to the same subject.
nats pub --user order-svc --password s3cret "orders.shipped" \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'

# The subscriber in ANALYTICS stays silent: identical subject name, different
# account, no crossing.

# 3. Now subscribe inside the publisher's own account and publish again.
#    This subscription DOES receive the message, because both sides are in ORDERS.
nats sub --user order-svc --password s3cret "orders.shipped"

nats pub --user order-svc --password s3cret "orders.shipped" \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
