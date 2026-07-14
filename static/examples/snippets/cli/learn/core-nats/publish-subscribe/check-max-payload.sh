#!/bin/bash
# Ask your connection for its limits before sizing a message. The
# "Maximum Payload" row comes from the INFO the server sends at connect
# (1 MB by default), so a plain no-auth connection can read it. An
# official client checks this ceiling and fails an oversized publish
# locally; the server rejects and closes the connection of any client
# that sends a larger PUB anyway. Either way, size your payloads under
# this number rather than discovering it the hard way.
nats account info

# A safe order publish stays far under the ceiling.
nats pub orders.created '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
