#!/bin/bash
# Open a named connection to the server and measure the round trip. `nats rtt`
# dials the default URL (nats://127.0.0.1:4222), sends a PING, times the PONG
# that comes back, and by default averages five such round trips.
# --connection-name labels this connection "warehouse" so it is identifiable
# in server monitoring instead of the generic default name the CLI uses when
# you leave it unset.
nats rtt --connection-name warehouse

# You will see the average round trip per server address, something like:
#
#   nats://127.0.0.1:4222:
#
#      nats://127.0.0.1:4222: 187µs
#
# A printed time means the connect handshake succeeded and the server answered
# the PING. The same --connection-name flag works on every nats command (sub,
# pub, request), so name each long-lived client after the service that owns it.
