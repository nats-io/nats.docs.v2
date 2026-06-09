#!/bin/bash
# Override the queue group on one endpoint.
#
# The queue group is a library setting on the endpoint: the option
# WithEndpointQueueGroup("q-inventory") makes "check" load-balance in
# its own group instead of the service default "q". The CLI does not set
# queue groups; it sends requests that the server delivers to one member
# of whatever group the endpoint joined. This snippet shows the observable
# result, the way the other language tabs configure the override.

# Send a request to the check endpoint. Whether check uses the default
# "q" or a custom queue group, the caller behavior is identical: the
# server delivers the request to exactly one instance in that group and
# one reply comes back.
nats service request OrderInventory check \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}'

# Inspect the endpoint to confirm its queue group. The info output lists
# each endpoint with its subject and queue group, so you can verify the
# override took effect.
nats service info OrderInventory
