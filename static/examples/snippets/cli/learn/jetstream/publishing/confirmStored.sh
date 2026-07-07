#!/bin/bash
# Plain `nats pub` is a core NATS publish: it reports "Published" whether
# or not a stream stored the message. Publish to a subject nothing
# captures and it still looks fine:
nats pub invoices.created "test"
# 17:31:21 Published 4 bytes to "invoices.created"

# The same publish with --jetstream reads the PubAck -- and now the miss
# is visible, because no stream captured the subject:
nats pub --jetstream invoices.created "test"
# 17:31:21 Published 4 bytes to "invoices.created"
# nats: error: nats: no responders available for request

# On a captured subject, the PubAck confirms the write with the stream
# name and the assigned sequence:
nats pub --jetstream orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
# 17:31:21 Published 91 bytes to "orders.created"
# 17:31:21 Stored in Stream: ORDERS Sequence: 4
