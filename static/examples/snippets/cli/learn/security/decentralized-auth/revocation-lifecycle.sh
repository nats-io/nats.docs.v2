#!/bin/sh
# Revoke order-svc and watch when the revocation actually bites. The
# creds keep working until the updated account JWT reaches the server.

# Baseline: the scoped creds connect fine.
nats pub orders.created '{"order_id":"ord_9x3m","customer":"acme-co","total_cents":1850}' --creds order-svc.creds
# 18:04:03 Published 63 bytes to "orders.created"

# Remove and revoke. This writes the revocation entry into your local
# copy of the ORDERS account JWT; the server hasn't seen it yet.
nats auth user rm order-svc ORDERS --revoke -f
# Removed user order-svc

# The window: the same creds still connect and publish.
nats pub orders.created '{"order_id":"ord_9x3m","customer":"acme-co","total_cents":1850}' --creds order-svc.creds
# 18:04:03 Published 63 bytes to "orders.created"

# Close the window: push the account. A client connected with the
# revoked creds is dropped as the push lands.
nats auth account push ORDERS -s nats://127.0.0.1:4222 --creds sys.creds
# ✓ Update completed on acme-1
# (in the revoked client's terminal:)
# 18:04:04 >>> Disconnected due to: EOF, will attempt reconnect

# A fresh connection with the revoked creds now fails.
nats pub orders.created 'x' --creds order-svc.creds
# nats: error: nats: Authorization Violation

# Revocation pins the old user key, not the name. Re-issuing order-svc
# creates a new key, so the new creds work after the next push.
nats auth user add order-svc ORDERS --key order-writer --defaults \
  --credential order-svc.creds -f
nats auth user credential order-svc.creds order-svc ORDERS --expire 720h -f
nats auth account push ORDERS -s nats://127.0.0.1:4222 --creds sys.creds
nats pub orders.created '{"order_id":"ord_9x3m","customer":"acme-co","total_cents":1850}' --creds order-svc.creds
# 18:04:19 Published 63 bytes to "orders.created"
