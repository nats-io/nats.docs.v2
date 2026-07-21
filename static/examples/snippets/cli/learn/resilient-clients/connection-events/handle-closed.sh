#!/bin/bash
# React to CLOSED: exit so the supervisor restarts the process.
#
# The CLI already does what this page teaches. Its closed handler logs
# ">>> Connection is closed: <last error>" and terminates the process,
# while its disconnect handler only logs and leaves the recovery to the
# reconnect loop (the CLI sets its own MaxReconnects to -1, unlimited).
# You can't wire your own handler via flags; in a client library you wire the
# real pattern — a closed observer that exits or alerts.
#
# Run the subscriber, then close its connection from the server side to
# see the closed line and the exit.

nats sub "orders.>" \
  --server "nats://n1:4222,nats://n2:4222,nats://n3:4222" \
  --connection-name warehouse
