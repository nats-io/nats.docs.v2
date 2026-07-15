#!/bin/bash
# The same three publishes, one per order event, with --jetstream so each one
# reports its PubAck. The server stores the message and prints the assigned
# stream + sequence — the CLI equivalent of the PubAck a client library returns.
nats pub --jetstream orders.created '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
nats pub --jetstream orders.created '{"order_id":"ord_2zr9","customer":"globex","total_cents":7800,"ts":"2026-05-22T10:14:25Z"}'
nats pub --jetstream orders.shipped '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:31Z"}'

# Each prints e.g. `Stored in Stream: ORDERS Sequence: 1` (then 2, then 3).
