#!/bin/bash
# A mirror is read-only. It captures no subjects of its own, so a publish
# aimed at the mirror name reaches nothing — the server reports no
# interest and the publish fails.
nats pub ORDERS-ARCHIVE '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
# nats: error: nats: no responders available for request

# Publish to the upstream ORDERS stream instead. The mirror copies the
# message on its own, with no client code involved.
nats pub orders.created '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
