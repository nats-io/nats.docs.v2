#!/bin/bash
# Three shipping-quote providers, each answering on shipping.quote.
#
# IMPORTANT: `nats reply` subscribes inside a queue group by default
# (NATS-RPLY-22). Three providers left on that default would share ONE
# queue group, so only one would ever answer. To scatter the request to
# all three, give each provider its OWN queue group name with --queue.
# A queue group of one member behaves like a plain subscriber.
#
# Run each line in its own terminal.

# Terminal 1 — carrier A quotes 1500 cents.
nats reply shipping.quote --queue carrier-a '{"carrier":"carrier-a","quote_cents":1500}'

# Terminal 2 — carrier B quotes 1200 cents.
nats reply shipping.quote --queue carrier-b '{"carrier":"carrier-b","quote_cents":1200}'

# Terminal 3 — carrier C quotes 1800 cents.
nats reply shipping.quote --queue carrier-c '{"carrier":"carrier-c","quote_cents":1800}'
