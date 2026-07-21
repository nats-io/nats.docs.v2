#!/bin/bash
# Watch the pool grow beyond what you configured.
#
# Connect to n1 only. The first INFO from n1 already lists the other
# cluster members in connect_urls, so the client's pool holds all three
# servers even though --server names one. That first merge is silent.
#
# --trace makes the CLI log later pool growth: when a server the client
# has not seen before joins the cluster mid-connection, it prints
#
#   >>> Discovered new servers, known servers are now ...
#
# followed by the full pool. The client libraries expose the same
# signal as a callback or event.

nats sub "orders.>" \
  --server nats://n1:4222 \
  --connection-name order-svc \
  --trace
