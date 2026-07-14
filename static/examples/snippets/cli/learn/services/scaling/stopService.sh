#!/bin/bash
# Stop one instance gracefully. A graceful stop drains the endpoint
# subscriptions: it removes the instance's queue-group interest so the
# server stops routing new requests to it, lets requests already accepted
# finish processing, and unsubscribes the $SRV discovery verbs, so the
# instance disappears cleanly instead of dropping work on the floor.
#
# This is a client-library behavior: your service calls Stop() (svc.Stop()).
# There is no CLI equivalent. Ctrl-C on `nats service serve` closes the
# connection abruptly, with no drain, which is the failure mode to avoid.
# Stop the instance from your own service, then use the CLI to confirm the
# result.

# After stopping one instance, discovery reflects the new count. PING
# returns one reply per running instance, so a name that had two
# instances now answers with one.
nats service ping OrderInventory

# The remaining instance keeps answering. Send another order to confirm
# the queue group now routes every request to the one that is left.
nats service request OrderInventory check \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'
