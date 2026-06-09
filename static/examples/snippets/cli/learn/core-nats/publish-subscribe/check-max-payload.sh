#!/bin/bash
# Ask the server for its limits before sizing a message. The "Maximum
# Payload" row is the max_payload ceiling (1 MB by default). Publish
# anything larger and the server rejects it and closes the connection,
# so size your payloads under this number rather than discovering it the
# hard way.
nats server info

# A safe order publish stays far under the ceiling.
nats pub orders.created '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
