#!/bin/bash

# A subject token can't contain whitespace. On the wire, a space separates the
# subject from the reply subject and byte count, so a modern client rejects the
# subject before anything is sent. This publish therefore FAILS with
#   nats: error: nats: invalid subject
# and exits non-zero -- the message never reaches the server.
nats pub "orders.us created" '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'

# (An older client -- nats.go before v1.48.0 -- or a raw-protocol writer skips
# this check and would instead misroute silently: the server would read
# "orders.us" as the subject and "created" as a reply subject.)

# The fix is one token per dot, no spaces: orders.us.created
nats pub "orders.us.created" '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
