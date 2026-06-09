#!/bin/bash
# Auth callout: the server delegates the authentication decision to an
# external service. This demo wires up the config, starts the server,
# runs a stand-in auth-svc, and connects a client with a token that the
# auth service maps to a user in ORDERS.

# 1. The server config lives in auth-callout.conf:
#
#    authorization {
#        # auth-svc connects with these credentials and bypasses the callout.
#        users: [ { user: "auth-svc", password: "s3cr3t" } ]
#        auth_callout {
#            # Public account nkey allowed to sign the user-JWT response.
#            issuer: "ABJHLOVMPA4CI6R5KLNGOB4GSLNIY7IOUPAJC4YFNDLQVIOBYQGUWVLA"
#            # Users that skip the callout (the auth service itself).
#            auth_users: [ auth-svc ]
#        }
#    }

# 2. Start the server with that config.
nats-server -c auth-callout.conf &

# 3. Run the auth service. It subscribes to $SYS.REQ.USER.AUTH, decodes the
#    server-signed request, maps the token to a user in ORDERS, and replies
#    with a signed user JWT. Synadia's callout.go library handles the
#    signing protocol for you; here we just show the subject it listens on.
nats --user auth-svc --password s3cr3t \
  reply '$SYS.REQ.USER.AUTH' --command "./auth-svc-handler" &

# 4. A client connects with a token. The server has no user list entry for
#    it, so it signs a request and calls out to auth-svc, which decides.
nats --server nats://localhost:4222 \
  --creds "" \
  --token "ord-token-123" \
  pub orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
