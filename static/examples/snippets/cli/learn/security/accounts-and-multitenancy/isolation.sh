#!/bin/sh
# Prove that two accounts never see each other's traffic.
#
# This uses the two-account nats.conf from the web-page. order-svc carries the
# permissions built on the Authorization page:
#
#   accounts {
#     ORDERS: {
#       jetstream: enabled
#       users: [
#         {
#           user: order-svc
#           password: s3cr3t
#           permissions: {
#             publish: { allow: ["orders.>"] }
#             subscribe: { allow: ["_INBOX.>"] }
#           }
#         }
#       ]
#     }
#     ANALYTICS: {
#       users: [
#         { user: analytics-reader, password: an4lytics }
#       ]
#     }
#   }
#
# Start the server with that config in another terminal:
#   nats-server -c nats.conf

# 1. The analytics reader (in ANALYTICS) subscribes to orders.shipped.
#    Leave this running in its own terminal.
nats sub --user analytics-reader --password an4lytics "orders.shipped"

# 2. The order service (in ORDERS) publishes a shipment to the same subject.
nats pub --user order-svc --password s3cr3t "orders.shipped" \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
# Expected: Published 91 bytes to "orders.shipped"
# The subscriber from step 1 stays silent: identical subject name,
# different account, no crossing.

# 3. Positive control: publish the same payload from inside ANALYTICS.
#    The subscriber from step 1 receives this one, because publisher and
#    subscriber now share an account. (order-svc can't play the subscriber
#    here: its subscribe allow list only covers _INBOX.>.)
nats pub --user analytics-reader --password an4lytics "orders.shipped" \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
# Expected in the step-1 subscriber:
#   [#1] Received on "orders.shipped"
#   {"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}

# 4. Isolation on a request: with the subscriber from step 1 still running
#    in ANALYTICS, order-svc sends a request to the same subject.
nats request --user order-svc --password s3cr3t "orders.shipped" 'status?'
# Expected, immediately (and the command exits 0):
#   Sending request on "orders.shipped"
#   No responders are available
# Not a permissions error: order-svc may publish orders.>. The only
# subscriber on orders.shipped is in ANALYTICS, so inside ORDERS the
# request finds no responders.
