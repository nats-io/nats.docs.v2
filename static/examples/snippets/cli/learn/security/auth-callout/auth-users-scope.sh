#!/bin/sh
# Pitfall: auth_users is not a convenience allow-list. Every user listed
# there skips the callout entirely and connects with no external check.
# It exists for one job: letting auth-svc itself in so it can receive
# requests. Adding an application user here silently exempts it from
# authentication.

# WRONG. order-svc now bypasses the callout and connects unchecked.
#
#    authorization {
#        users: [
#            { user: auth-svc,  password: c4llout }
#            { user: "order-svc", password: "open" }
#        ]
#        auth_callout {
#            issuer: "ABJHLOVMPA4CI6R5KLNGOB4GSLNIY7IOUPAJC4YFNDLQVIOBYQGUWVLA"
#            auth_users: [ auth-svc, order-svc ]   # <-- order-svc escapes the callout
#        }
#    }

# RIGHT. Only auth-svc bypasses. order-svc goes through the callout like
# every other connection. auth-callout.conf:
#
#    authorization {
#        users: [ { user: auth-svc, password: c4llout } ]
#        auth_callout {
#            issuer: "ABJHLOVMPA4CI6R5KLNGOB4GSLNIY7IOUPAJC4YFNDLQVIOBYQGUWVLA"
#            auth_users: [ auth-svc ]
#        }
#    }

# Start the server with the RIGHT config. No auth service is running in
# this demo, which is what makes the exemption visible.
nats-server -c auth-callout.conf &

# auth-svc is in auth_users, so it connects and publishes even though no
# auth service is running. The callout is skipped for it — exactly what
# an application user would inherit if you listed one here.
nats --server nats://localhost:4222 \
  --user auth-svc --password c4llout \
  pub orders.created 'x'
# Expected:
# 14:22:34 Published 1 bytes to "orders.created"

# order-svc is not in auth_users, so its token goes through the callout.
# With no auth service answering, the connection fails after the callout
# timeout (default 2s). With default client timeouts the client reports
# an i/o timeout; the reason appears only in the server log.
nats --server nats://localhost:4222 \
  --token "ord-token-123" \
  pub orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
# Expected:
# nats: error: read tcp ...: i/o timeout
