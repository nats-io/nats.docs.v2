#!/bin/bash
# Ask your connection for its limits before sizing a message. The
# "Maximum Payload" row comes from the INFO the server sends at connect
# (1 MB by default), so a plain no-auth connection can read it. An
# official client checks this ceiling and fails an oversized publish
# locally; the server rejects and closes the connection of any client
# that sends a larger PUB anyway.
nats account info

# A safe order publish stays far under the ceiling.
nats pub orders.created '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'

# Publishing over the ceiling fails immediately, client-side, before the
# message reaches the server. Try a 2 MB payload:
#
#   head -c 2000000 /dev/zero | tr '\0' x | nats pub orders.created --force-stdin
#   nats: error: nats: maximum payload exceeded
#
# So keep payloads small and pass a reference (an object-store key or a URL)
# for anything large, rather than discovering the limit the hard way.
