#!/bin/bash

# Connect order-svc to the n1/n2/n3 server pool with reconnect tuned
# for a long-lived service, then publish one order.
#
# The CLI reconnects automatically and cannot script every client
# option (ReconnectWait, ReconnectJitter, a negative MaxReconnect for
# unlimited retries) the way the client libraries do. What it can show is
# the pool itself: pass the whole cluster as the server list so the
# client has somewhere to fail over to when one node goes away.
#
# --server takes a comma-separated pool. The client randomizes it by
# default and, on a disconnect, cycles the list with backoff + jitter
# until one node answers. --connection-name makes order-svc show up by
# name in `nats server report connections`.

# Publish a single order to orders.created against the pool. If the node
# the client first lands on goes away, the client reconnects to another
# member of the pool on its own and the publish rides through.
nats pub orders.created \
  '{"order_id":"ord_8w2k","customer":"acme-co","total_cents":4200,"ts":"2026-05-22T10:14:22Z"}' \
  --server "nats://n1:4222,nats://n2:4222,nats://n3:4222" \
  --connection-name order-svc
