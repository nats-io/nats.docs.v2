#!/bin/bash
# Scale OrderInventory by running more instances. There is no scaling
# command and no coordinator to register with: you start another copy of
# the same service, with the same name and version, and the framework does
# the rest.
#
# `nats service serve` runs an OrderInventory instance from the CLI. Run
# this in a second terminal while the first instance is still up. Each
# call generates its own service ID, but both share the name
# OrderInventory and the default queue group "q".
nats service serve OrderInventory \
  --version 1.0.0 \
  --endpoint check:orders.inventory.check

# With two instances up, send a burst of requests. Because both endpoints
# joined the queue group "q", the server delivers each request to exactly
# one instance. Requests spread across the two without any extra config.
for i in 1 2 3 4 5 6; do
  nats request orders.inventory.check \
    '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
    --timeout 2s
done

# Confirm both instances are answering. `nats service stats` aggregates
# the per-instance counters by name, so num_requests across the two
# instances should add up to the six requests you just sent.
nats service stats OrderInventory
