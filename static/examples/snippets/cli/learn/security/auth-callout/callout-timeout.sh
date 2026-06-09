#!/bin/bash
# Pitfall: the callout sits on the connection path. If auth-svc is slow,
# down, or crashed, every new connection waits for the response and is
# then rejected when the wait runs out. The wait is the `timeout` field
# in the authorization block (default 2s). Set it deliberately.

# 1. The server config sets an explicit callout timeout. auth-callout.conf:
#
#    authorization {
#        # How long the server waits for auth-svc before rejecting. Default 2s.
#        timeout: "1s"
#        users: [ { user: "auth-svc", password: "s3cr3t" } ]
#        auth_callout {
#            issuer: "ABJHLOVMPA4CI6R5KLNGOB4GSLNIY7IOUPAJC4YFNDLQVIOBYQGUWVLA"
#            auth_users: [ auth-svc ]
#        }
#    }

# 2. Start the server with that config.
nats-server -c auth-callout.conf &

# 3. Do NOT start auth-svc, to simulate an outage. A client connects with a
#    token. The server signs a request, publishes it to $SYS.REQ.USER.AUTH,
#    and no one replies. After the timeout the server rejects the client.
#    Use --timeout above the callout timeout so the client error is the
#    server's rejection, not the client giving up first.
nats --server nats://localhost:4222 \
  --token "ord-token-123" \
  --timeout 5s \
  pub orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'

# Expected: the publish fails with an authorization error after ~1s.
# nats: error: nats: Authorization Violation
#
# The fix is operational, not config: run auth-svc with enough replicas
# that one slow instance does not stall connections, and keep its
# OIDC/LDAP lookups fast. The timeout is a backstop, not a substitute.
