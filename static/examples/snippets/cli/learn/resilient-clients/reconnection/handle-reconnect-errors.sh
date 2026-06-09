#!/bin/bash

# Make a long outage loud instead of lethal: keep retrying forever and
# make every disconnect/reconnect visible.
#
# The library tabs set MaxReconnect to -1 (retry without limit) and
# register a reconnect-error callback that logs each failed attempt.
# The CLI has no callback to register, but it does keep reconnecting on
# its own and prints disconnect/reconnect lines while it runs — which is
# the observable half of the same behavior.
#
# To SEE it: run this against a single local nats-server, then stop and
# restart that server. The subscriber logs a disconnect, cycles its
# pool, and resumes — you never re-run the command. Pointed at the
# n1/n2/n3 pool, it rejoins on a surviving node instead.

# Start a local server in another terminal first:
#
#   nats-server
#
# Then subscribe across the pool. Leave it running, kill the server it
# is on, and watch it reconnect on its own.
nats sub "orders.>" \
  --server "nats://n1:4222,nats://n2:4222,nats://n3:4222" \
  --connection-name order-svc
