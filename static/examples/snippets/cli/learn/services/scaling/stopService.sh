#!/bin/bash
# Stop one instance gracefully. A graceful stop drains the requests
# already in flight, then unsubscribes the endpoint and the $SRV
# discovery verbs, so the instance disappears cleanly instead of dropping
# work on the floor.
#
# From the CLI, the graceful stop is Ctrl-C in the terminal running
# `nats service serve`: it triggers the same drain-and-unsubscribe the
# library's Stop() performs. The instance finishes any check it is
# already handling, leaves the queue group "q", and exits.

# After stopping one instance, discovery reflects the new count. PING
# returns one reply per running instance, so a name that had two
# instances now answers with one.
nats service ping OrderInventory

# The remaining instance keeps answering. Send another order to confirm
# the queue group now routes every request to the one that is left.
nats request orders.inventory.check \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --timeout 2s
