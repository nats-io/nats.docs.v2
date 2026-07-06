#!/bin/bash
# Keep order-svc's credential out of the connection URL (and out of shell
# history and server logs) by storing it in a named context.
#
# A URL like nats://order-svc:s3cr3t@localhost:4222 leaks the password
# into every log line and your shell history. A context holds the
# credential separately and is selected by name.

# Save the credential once, in a named context. Passing it as
# "$NATS_PASSWORD" keeps the literal value out of shell history;
# only the variable name is recorded.
export NATS_PASSWORD=s3cr3t
nats context add orders \
  --server localhost:4222 \
  --user order-svc \
  --password "$NATS_PASSWORD" \
  --description "ORDERS platform, order-svc user"

# Unset the variable once the context is saved. While it's exported the
# CLI warns: WARNING: Shell environment overrides in place using NATS_PASSWORD
unset NATS_PASSWORD

# Make it the active context.
nats context select orders

# Now connect with no credential on the command line at all. The publish
# uses the stored credential from the `orders` context.
nats pub orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
# Expected output:
# 14:19:37 Published 91 bytes to "orders.created"
