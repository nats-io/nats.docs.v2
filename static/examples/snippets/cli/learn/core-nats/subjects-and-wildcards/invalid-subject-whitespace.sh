#!/bin/bash

# A subject token can't contain whitespace -- and getting it wrong does NOT
# raise an error. On the wire, a space separates the subject from the reply
# subject and byte count, so publishing to "orders.us created" is read by the
# server as subject "orders.us" with reply subject "created". The message lands
# on the wrong subject and every regional subscriber misses it, silently.
nats pub "orders.us created" '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'

# The fix is one token per dot, no spaces: orders.us.created
nats pub "orders.us.created" '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
