#!/bin/bash
# Lame-duck mode: tell a running server to step down gracefully instead of
# dropping every client at once. Keep the local nats-server running, with a
# subscriber (nats sub orders.created) attached in another terminal.
#
# Signal the server to enter lame-duck mode. With a single nats-server on the
# box you don't pass a pid -- the CLI finds the one running process:
nats-server --signal ldm

# The running server logs that it is draining and stops taking new clients:
#
#   [INF] Entering lame duck mode, stop accepting new clients
#
# It then closes existing clients gradually rather than all at once. Across a
# cluster, a client that watches for the lame-duck notice can move to another
# server before its socket is cut; the rest are disconnected in a spread-out
# wave and reconnect elsewhere on their own. Against this single server
# there is nowhere else to go, so the subscriber is disconnected gracefully
# and reconnects once you start the server again -- the same stop and start as
# any restart.
#
# The grace period before clients are closed, and the window the disconnects
# are spread over, are server settings an operator tunes. See the server-side
# walkthrough in Deployment -> Rolling upgrades.
