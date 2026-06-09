#!/bin/bash
# Keep order-svc's credential out of the connection URL (and out of shell
# history and server logs) by storing it in a named context.
#
# A URL like nats://order-svc:s3cr3t-rotate-me@localhost:4222 leaks the
# password into every log line and your shell history. A context holds the
# credential separately and is selected by name.

# Save the credential once, in a named context.
nats context add orders \
  --server localhost:4222 \
  --user order-svc \
  --password "s3cr3t-rotate-me" \
  --description "ORDERS account, order-svc user"

# Make it the active context.
nats context select orders

# Now connect with no credential on the command line at all. The publish
# uses the stored credential from the `orders` context.
nats pub orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
