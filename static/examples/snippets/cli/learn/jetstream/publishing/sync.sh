#!/bin/bash
# The same three publishes, one per order event. A client library would get a
# PubAck back from each; from the CLI, `nats pub` against a JetStream-captured
# subject prints the assigned stream sequence as confirmation.
nats pub orders.created '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
nats pub orders.created '{"order_id":"ord_2zr9","customer":"globex","total_cents":7800,"ts":"2026-05-22T10:14:25Z"}'
nats pub orders.shipped '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:31Z"}'
