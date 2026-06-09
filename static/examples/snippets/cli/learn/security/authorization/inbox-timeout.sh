#!/bin/bash
# A user that denies all subscribes (subscribe: { deny: [">"] }) cannot create
# the reply inbox a request needs. The reply has nowhere to land, so the request
# times out with no responders rather than returning an answer.

# Connect as a request/reply client in the ORDERS account.
export NATS_USER=order-svc
export NATS_PASSWORD=s3cr3t

# Send a request. The client subscribes to a reply subject under _INBOX. before
# publishing, but the broad subscribe deny blocks that subscription, so the
# server returns:
#   nats: error: Permissions Violation for Subscription to "_INBOX.xxxx.*"
# and the request gives up:
#   nats: error: nats: timeout
nats req orders.lookup '{"order_id":"ord_8w2k"}' --timeout 2s

# Fix: allow the inbox prefix so replies can be delivered. Add _INBOX.> to the
# subscribe allow-list (in config or via nsc), then the request completes.
#   subscribe: { allow: ["_INBOX.>"] }
# Or with nsc on a decentralized user:
#   nsc edit user --name order-svc --account ORDERS --allow-sub "_INBOX.>"
