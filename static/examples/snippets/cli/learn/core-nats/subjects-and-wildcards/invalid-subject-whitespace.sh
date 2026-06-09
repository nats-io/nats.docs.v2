#!/bin/bash

# A subject token may not contain whitespace. Publishing to a subject with a
# space is rejected before the message ever leaves the client: the region
# token here is "us created" with a stray space, so the client raises an
# invalid-subject error instead of silently sending it somewhere wrong.
nats pub "orders.us created" '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'

# The fix is one token per dot, no spaces: orders.us.created
nats pub "orders.us.created" '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
