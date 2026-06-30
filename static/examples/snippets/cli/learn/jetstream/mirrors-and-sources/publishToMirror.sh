#!/bin/bash
# A mirror is read-only. It captures no subjects of its own, so a publish
# aimed at the mirror name reaches no stream. A JetStream publish waits for
# a PubAck that never comes and fails with "no responders available".
# (A plain `nats pub` would instead report "Published N bytes" and the
# message would silently go nowhere.)
nats pub --jetstream ORDERS-ARCHIVE '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
# Published 88 bytes to "ORDERS-ARCHIVE"
# nats: error: nats: no responders available for request

# Publish to the upstream ORDERS stream instead. The mirror copies the
# message on its own, with no client code involved.
nats pub --jetstream orders.created '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
# Published 88 bytes to "orders.created"
# Stored in Stream: ORDERS Sequence: 4
