#!/bin/bash
# Watch the full connection event surface from the CLI.
#
# The CLI wires every connection event handler itself, so there are no
# flags for wiring your own — that wiring is a client-library call. What the CLI
# does offer is the output of those handlers: with --trace it prints a
# ">>>" line per event. Restart a server in the pool and you see:
#
#   >>> Connected to <url>            on the first successful connect
#   >>> Disconnected due to: <err>, will attempt reconnect
#   >>> Reconnected to <url>          after the client rejoins
#   >>> Discovered new servers, known servers are now <urls>
#   >>> Reconnect error: <err>        per failed reconnect attempt
#   >>> Connection is closed: <err>   the closed event; the CLI exits
#
# The disconnect and closed lines print even without --trace; the rest
# are trace-only.

nats sub "orders.>" \
  --server "nats://n1:4222,nats://n2:4222,nats://n3:4222" \
  --connection-name order-svc \
  --trace
