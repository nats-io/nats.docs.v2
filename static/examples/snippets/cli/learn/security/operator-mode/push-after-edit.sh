#!/bin/sh
# An edit only changes the local JWT in the nats auth store. The server
# keeps validating against its stored copy, so until you push, the edit
# silently has no effect: existing creds still connect, old limits hold.

# Edit the ORDERS account locally (here: a connection-count limit).
nats auth account edit ORDERS --connections 50

# No push yet: the server still enforces the previous, unlimited value.
# Nothing errors -- the change just hasn't happened on the server.

# Deliver the updated JWT to the running server.
nats auth account push ORDERS -s nats://127.0.0.1:4222 --creds sys.creds
# Success 1 Failed 0 Expected 1

# Confirm the server's copy matches: it now shows Connections: 50.
nats auth account query ORDERS -s nats://127.0.0.1:4222 --creds sys.creds
