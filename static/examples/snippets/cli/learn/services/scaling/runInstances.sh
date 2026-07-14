#!/bin/bash
# Scale OrderInventory by running more instances. There is no scaling
# command and no coordinator to register with: you start another copy of
# the same service, with the same Name, Version, and endpoint, and the
# framework does the rest. Each copy gets its own service ID but shares the
# name OrderInventory and the default queue group "q".
#
# The CLI has no flag to host this shape (`nats service serve` only runs a
# demo echo service), so start the second instance by running your service
# program again, in another terminal, while the first is still up.

# With two instances up, send a burst of requests. --count sends the
# request six times; because both instances joined the queue group "q",
# the server delivers each one to a single instance, so the six spread
# across the two without any extra config.
nats service request OrderInventory check \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --count 6

# Confirm both instances are answering. `nats service stats` aggregates
# the per-instance counters by name, so num_requests across the two
# instances should add up to the six requests you just sent.
nats service stats OrderInventory
