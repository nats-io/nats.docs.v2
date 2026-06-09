#!/bin/bash
# Pitfall: auth_users is not a convenience allow-list. Every user listed
# there skips the callout entirely and connects with no external check.
# It exists for one job: letting auth-svc itself in so it can receive
# requests. Adding an application user here silently exempts it from
# authentication.

# WRONG. order-svc now bypasses the callout and connects unchecked.
#
#    authorization {
#        users: [
#            { user: "auth-svc",  password: "s3cr3t" }
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
#        users: [ { user: "auth-svc", password: "s3cr3t" } ]
#        auth_callout {
#            issuer: "ABJHLOVMPA4CI6R5KLNGOB4GSLNIY7IOUPAJC4YFNDLQVIOBYQGUWVLA"
#            auth_users: [ auth-svc ]
#        }
#    }

# Start the server with the RIGHT config.
nats-server -c auth-callout.conf &

# order-svc is not in auth_users, so it must present a token and pass the
# callout. This connection is authenticated by auth-svc, as intended.
nats --server nats://localhost:4222 \
  --token "ord-token-123" \
  pub orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
