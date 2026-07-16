#!/bin/bash
# Watch the client reconnect on its own. Keep the local nats-server from
# earlier in the chapter running in its own terminal.
#
# In this terminal, subscribe as the warehouse service on orders.created:
nats sub orders.created

# Now stop the nats-server (Ctrl-C in its terminal) and start it again. The
# subscriber keeps running the whole time. It logs the drop -- the reason is
# EOF because the server closed the socket cleanly on the way down:
#
#   14:02:11 Subscribing on orders.created
#   14:02:19 >>> Disconnected due to: EOF, will attempt reconnect
#
# You never restart the subscriber. Once the server is back, publish an order
# and the subscriber prints it, because the client re-dialed and re-sent the
# subscription itself. Add --trace to log an explicit reconnect line too,
# along with the initial connect and each retry delay:
#
#   nats sub orders.created --trace
#   14:02:21 >>> Reconnected to nats://127.0.0.1:4222 (127.0.0.1:4222)
#
# Publishing WHILE the server is down fails instead: nats pub has no server
# to connect to, and nothing queues the message server-side. The at-most-once
# loss happens on a live server: a message that arrives before the
# subscription is restored finds no interest and is discarded.
