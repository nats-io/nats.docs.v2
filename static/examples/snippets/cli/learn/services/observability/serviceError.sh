#!/bin/bash
# Make the check handler return a service error, and watch num_errors move.
#
# The check handler rejects an order whose total is not a positive amount by
# calling req.Error("400", ...). The framework attaches the Nats-Service-Error
# and Nats-Service-Error-Code headers, sends the reply, and bumps num_errors
# and last_error for the endpoint.
#
# Send one bad request (total_cents is 0). The default output prints the
# reply headers, so you can see the error response the handler returned.
nats service request OrderInventory check \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":0,"ts":"2026-05-22T10:14:22Z"}'

# Expected: the reply carries headers like
#   Nats-Service-Error-Code: 400
#   Nats-Service-Error: order total must be positive

# Now read the stats. The errored request is recorded: num_errors is 1 and
# last_error holds the description string the handler passed to req.Error.
nats service stats OrderInventory
